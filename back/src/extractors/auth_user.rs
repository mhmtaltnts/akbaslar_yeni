use axum::{extract::FromRequestParts, http::request::Parts};
use serde::Serialize;
use sqlx::{types::Json as SqlJson, SqlitePool};
use uuid::Uuid;

use crate::{error::AppError, jwt, middleware::AuthStale, roles, site, state::SharedState};

// middleware/verifyJWT.js'nin karşılığı -- ama bir "middleware" DEĞİL, bir
// "extractor". Node'da verifyJWT, router'a `router.use(verifyJWT)` ile
// kaydedilen, ondan SONRAKİ her route'u koruyan ayrı bir fonksiyondu;
// korumalı/korumasız route'ları ayırmak router dosyasındaki satır SIRASINA
// bağlıydı (kolayca gözden kaçabilir).
//
// Axum'da bunun yerine: bir handler, imzasına `user: AuthUser` parametresi
// EKLEDİĞİ anda korumalı olur. Router'da hiçbir şey değişmez, hiçbir sıralama
// kuralı yok -- korumalı olup olmadığı handler'ın İMZASINDA görünür ve
// derleyici bunu garanti eder. Bu, `FromRequestParts` trait'ini implemente
// ederek elde ediliyor: Axum, bir handler'ın parametre tiplerine bakıp bu
// trait'i uygulayan her tip için otomatik olarak bu kodu çalıştırıyor.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthUser {
    pub id: Uuid,
    // İşlemi yapan kullanıcı -- kayıtlara "giriş/çıkış/gümrük/güncelleme
    // yapan" olarak İMZALI token'dan yazılıyor, istemcinin gönderdiği bir
    // alandan değil (kimse başkası adına işlem kaydedemesin).
    pub username: String,
    pub fullname: String,
    pub roles: Vec<String>,
    // İsteğin üzerinde çalıştığı otopark. Otoparka ait veriye dokunan HER
    // sorgu `WHERE tenant_id = ?n` ile bunu kullanmak zorunda. Normalde
    // kullanıcının kendi otoparkı; site başka bir otoparkın alan adından
    // açıldıysa ve kullanıcı orada çalışmaya yetkiliyse o otopark (bkz.
    // site.rs). SüperAdmin ayrıca `X-Park-Id` başlığıyla seçebilir.
    pub tenant_id: Uuid,
    // Kullanıcının kayıtlı olduğu otopark (DB.den). SüperAdmin başka bir
    // park seçmiş olsa bile değişmez.
    pub home_tenant_id: Uuid,
}

// SüperAdmin'in çalışmak istediği otoparkı bildirdiği istek başlığı.
const PARK_HEADER: &str = "x-park-id";

impl AuthUser {
    pub fn is_super_admin(&self) -> bool {
        self.roles.iter().any(|r| r == roles::SUPER_ADMIN)
    }

    // Sadece platform yöneticisinin erişebileceği endpoint'ler (/tenants) için.
    pub fn require_super_admin(&self) -> Result<(), AppError> {
        if self.is_super_admin() {
            Ok(())
        } else {
            Err(AppError::Unauthorized("Bu işlem için yetkiniz yok".to_string()))
        }
    }

    // Otoparkın kurucusu (veya platform yöneticisi). Kullanıcı yönetimi
    // sadece onlara açık: aksi halde herhangi bir çalışan API'yi doğrudan
    // çağırıp kendine Kurucu rolü verebilir, kullanıcı silebilirdi.
    pub fn require_admin(&self) -> Result<(), AppError> {
        if self.is_super_admin() || self.roles.iter().any(|r| r == roles::ADMIN) {
            Ok(())
        } else {
            Err(AppError::Unauthorized("Bu işlem için yetkiniz yok".to_string()))
        }
    }

    // Kurucu, Yönetici veya SüperAdmin: rapor, kayıt silme ve başkasının
    // girdiği kaydı düzenleme sadece onlara açık (arayüzdeki
    // `isAdmin || isManager` kontrolünün backend karşılığı).
    pub fn is_manager(&self) -> bool {
        self.is_super_admin()
            || self.roles.iter().any(|r| r == roles::ADMIN || r == roles::MANAGER)
    }

    pub fn require_manager(&self) -> Result<(), AppError> {
        if self.is_manager() {
            Ok(())
        } else {
            Err(AppError::Unauthorized("Bu işlem için yetkiniz yok".to_string()))
        }
    }

    pub fn is_officer(&self) -> bool {
        roles::is_officer(&self.roles)
    }

    // Kendi otoparkı dışındaki bir otoparkta çalışabilir mi? SüperAdmin her
    // yerde; diğer personel sadece SüperAdmin'in `officer_parks` ile izin
    // verdiği otoparklarda. İzin token'a değil DB'ye bakılarak okunur:
    // SüperAdmin'in değişikliği anında geçerli olur.
    async fn can_work_in(&self, db: &SqlitePool, park: Uuid) -> Result<bool, AppError> {
        if park == self.home_tenant_id || self.is_super_admin() {
            return Ok(true);
        }
        let granted: Option<i64> =
            sqlx::query_scalar("SELECT 1 FROM officer_parks WHERE user_id = ?1 AND tenant_id = ?2")
                .bind(self.id)
                .bind(park)
                .fetch_optional(db)
                .await?;
        Ok(granted.is_some())
    }

    // Gümrük memuru sadece araç listesini görür ve gümrük bilgisi girer:
    // araç giriş/çıkış/düzenleme, rapor ve kullanıcı yönetimi kapalı.
    // (401 dönüyoruz, 403 değil: istemci 403'ü "token süresi doldu" sayıp
    // boşuna refresh deniyor.)
    pub fn require_not_officer(&self) -> Result<(), AppError> {
        if self.is_officer() {
            Err(AppError::Unauthorized("Bu işlem için yetkiniz yok".to_string()))
        } else {
            Ok(())
        }
    }

    // Kullanıcının araç kayıtlarını görebildiği otoparklar. Personel için
    // sadece kendi otoparkı; memur için ayrıca SüperAdmin'in izin verdiği
    // (ve askıda olmayan) otoparklar. İzinler token'a değil DB'ye bakılarak
    // okunuyor, böylece SüperAdmin'in değişikliği anında geçerli oluyor.
    pub async fn park_ids(&self, db: &SqlitePool) -> Result<Vec<Uuid>, AppError> {
        let mut ids = vec![self.tenant_id];
        if self.is_officer() {
            let extra: Vec<Uuid> = sqlx::query_scalar(
                "SELECT op.tenant_id FROM officer_parks op
                 JOIN tenants t ON t.id = op.tenant_id
                 WHERE op.user_id = ?1 AND t.active AND op.tenant_id <> ?2",
            )
            .bind(self.id)
            .bind(self.tenant_id)
            .fetch_all(db)
            .await?;
            ids.extend(extra);
        }
        Ok(ids)
    }
}

// Not: Node'daki orijinal kod `req.user = decoded.UserInfo.username` yazıyordu
// ama access token payload'ında `username` diye bir alan hiç YOK (sadece id/
// fullname/roles var) -- yani `req.user` orijinalde hep `undefined`'dı. Hem
// `req.user` hem `req.roles` zaten hiçbir controller'da okunmuyordu (kontrol
// ettik). Burada o kullanılmayan/bozuk alanı aynen taşımak yerine, token'da
// GERÇEKTEN var olan bilgiyi (id, fullname, roles) düzgün bir struct'ta
// sunuyoruz -- ileride rol bazlı yetkilendirme eklemek istersek hazır olsun.
impl FromRequestParts<SharedState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &SharedState,
    ) -> Result<Self, Self::Rejection> {
        // `req.headers.authorization || req.headers.Authorization` + `startsWith('Bearer ')`
        let header = parts
            .headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
            .ok_or_else(|| AppError::Unauthorized("Yetkiniz Yok".to_string()))?;

        let token = header
            .strip_prefix("Bearer ")
            .ok_or_else(|| AppError::Unauthorized("Yetkiniz Yok".to_string()))?;

        // `jwt.verify(token, ACCESS_TOKEN_SECRET, cb)` -- hata varsa 403
        // (Node'daki "Erişim Engeli Var" ile aynı statü ve mesaj).
        let claims = jwt::decode_access_token(token, &state.access_token_secret)
            .map_err(|_| AppError::Forbidden("Erişim Engeli Var".to_string()))?;

        // Token sadece KİMLİĞİ kanıtlıyor; rol, otopark ve aktiflik her
        // istekte DB'den okunur. Böylece rol değişikliği (örn. SüperAdmin
        // yetkisinin geri alınması), pasif etme ve silme 15 dakikalık access
        // token süresini beklemeden ANINDA geçerli olur. 403: istemci refresh
        // dener; pasif/silinmiş kullanıcının refresh'i de reddedilir ve oturum
        // kapanır.
        let current: Option<(String, String, SqlJson<Vec<String>>, Uuid, String)> = sqlx::query_as(
            "SELECT u.username, u.fullname, u.roles, u.tenant_id, t.name FROM users u
             JOIN tenants t ON t.id = u.tenant_id
             WHERE u.id = ?1 AND u.active AND t.active",
        )
        .bind(claims.user_info.id)
        .fetch_optional(&state.db)
        .await?;
        let (username, fullname, SqlJson(roles), home_tenant_id, tenant_name) =
            current.ok_or_else(|| AppError::Forbidden("Erişim Engeli Var".to_string()))?;

        // Token'daki bilgi eskidiyse istemciye haber ver: yanıtta
        // `X-Auth-Stale` görünce token'ı yenileyip menüleri yeni rollere göre
        // çizer. (Kullanıcı adı karşılaştırılmıyor: refresh token kullanıcı
        // adına bağlı, değişmişse oturum zaten refresh'te kapanır.)
        let same_roles = {
            let mut a = roles.clone();
            let mut b = claims.user_info.roles.clone();
            a.sort();
            b.sort();
            a == b
        };
        if !same_roles
            || claims.user_info.tenant_id != home_tenant_id
            || claims.user_info.tenant_name != tenant_name
        {
            if let Some(flag) = parts.extensions.get::<AuthStale>() {
                flag.mark();
            }
        }

        let mut user = AuthUser {
            id: claims.user_info.id,
            username,
            fullname,
            roles,
            tenant_id: home_tenant_id,
            home_tenant_id,
        };

        // SüperAdmin tüm otoparkların verisine erişebilir: `X-Park-Id`
        // başlığıyla seçtiği otoparkta, o parkın kurucusu gibi çalışır.
        // Diğer roller için başlık YOK SAYILIR -- Kurucu/Yönetici/Çalışan
        // her zaman token'daki kendi otoparkıyla sınırlı.
        let requested = parts.headers.get(PARK_HEADER).and_then(|v| v.to_str().ok());
        let park_selected = requested.is_some() && user.is_super_admin();
        if let (Some(raw), true) = (requested, user.is_super_admin()) {
            let park_id = Uuid::parse_str(raw.trim())
                .map_err(|_| AppError::BadRequest("Seçilen otopark geçersiz".to_string()))?;
            let exists: Option<Uuid> = sqlx::query_scalar("SELECT id FROM tenants WHERE id = ?1")
                .bind(park_id)
                .fetch_optional(&state.db)
                .await?;
            user.tenant_id = exists
                .ok_or_else(|| AppError::BadRequest("Seçilen otopark bulunamadı".to_string()))?;
        }

        // Alan adına göre otopark (bkz. site.rs): kullanıcı orada çalışmaya
        // yetkiliyse o otopark, değilse kendi otoparkı. SüperAdmin'in açık
        // seçimi (`X-Park-Id`) önceliklidir. Memurlar izinli otoparkların
        // HEPSİNİ birlikte gördüğü için (`park_ids`) alan adından etkilenmez.
        if !park_selected && !user.is_officer() {
            if let Some(site) = site::tenant_for_request(&state.db, &parts.headers).await? {
                if site != user.home_tenant_id && user.can_work_in(&state.db, site).await? {
                    user.tenant_id = site;
                }
            }
        }

        Ok(user)
    }
}
