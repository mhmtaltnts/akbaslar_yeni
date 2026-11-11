use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use std::collections::HashMap;

use sqlx::types::Json as SqlJson;

use crate::{
    error::AppError,
    extractors::AuthUser,
    models::Tenant,
    response::MessageBody,
    roles, site,
    state::SharedState,
};

// Otopark kodu URL'de kullanıldığı için sadece küçük harf, rakam ve tire.
fn normalize_slug(slug: &str) -> Result<String, AppError> {
    let slug = slug.trim().to_lowercase();
    let valid = !slug.is_empty()
        && slug.len() <= 50
        && slug.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-');
    if valid {
        Ok(slug)
    } else {
        Err(AppError::BadRequest(
            "Otopark kodu sadece küçük harf (a-z), rakam ve tire içerebilir".to_string(),
        ))
    }
}

// Otoparkın alan adı: "https://www.Ornek.com/" -> "ornek.com". Boş -> None.
fn normalize_domain(raw: &str) -> Result<Option<String>, AppError> {
    let raw = raw.trim();
    let raw = raw.strip_prefix("https://").or_else(|| raw.strip_prefix("http://")).unwrap_or(raw);
    let raw = raw.trim_end_matches('/');
    if raw.is_empty() {
        return Ok(None);
    }
    let domain = site::normalize_host(raw).unwrap_or_default();
    let valid = domain.len() <= 253
        && domain.contains('.')
        && domain.split('.').all(|label| {
            !label.is_empty()
                && !label.starts_with('-')
                && !label.ends_with('-')
                && label.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
        });
    if valid {
        Ok(Some(domain))
    } else {
        Err(AppError::BadRequest("Alan adı geçersiz (örnek: otoparkim.com)".to_string()))
    }
}

// Alan adı başka bir otoparka ait mi?
async fn domain_owner(db: &sqlx::SqlitePool, domain: &str) -> Result<Option<Uuid>, AppError> {
    Ok(sqlx::query_scalar("SELECT id FROM tenants WHERE domain = ?1")
        .bind(domain)
        .fetch_optional(db)
        .await?)
}

// @route GET /tenants  (SüperAdmin)
pub async fn get_all_tenants(
    user: AuthUser,
    State(state): State<SharedState>,
) -> Result<Json<Vec<Tenant>>, AppError> {
    user.require_super_admin()?;

    let tenants: Vec<Tenant> = sqlx::query_as(
        "SELECT id, name, slug, address, domain, active FROM tenants ORDER BY created_at",
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(tenants))
}

#[derive(Deserialize)]
pub struct UpdateTenantPayload {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub address: Option<String>,
    // Gönderilmezse (null) DEĞİŞMEZ, boş metin gönderilirse kaldırılır: eski
    // bir istemci alanı göndermediği için alan adını yanlışlıkla silmesin.
    #[serde(default)]
    pub domain: Option<String>,
}

// @route PATCH /tenants  (SüperAdmin)
// Uygulama iki sabit otoparklı: otopark oluşturma ve askıya alma yok, burada
// sadece ad, kod, adres ve alan adı değişir. (Eski istemcinin gönderdiği
// `active` alanı yok sayılır.)
pub async fn update_tenant(
    user: AuthUser,
    State(state): State<SharedState>,
    Json(payload): Json<UpdateTenantPayload>,
) -> Result<Json<MessageBody>, AppError> {
    user.require_super_admin()?;

    let slug = normalize_slug(&payload.slug)?;
    if payload.name.trim().is_empty() {
        return Err(AppError::BadRequest("Otopark adı boş olamaz".to_string()));
    }

    let slug_owner: Option<Uuid> =
        sqlx::query_scalar("SELECT id FROM tenants WHERE lower(slug) = ?1")
            .bind(&slug)
            .fetch_optional(&state.db)
            .await?;
    if slug_owner.is_some_and(|id| id != payload.id) {
        return Err(AppError::Conflict("Bu otopark kodu kullanılıyor".to_string()));
    }

    // Tüm kontroller yazmadan ÖNCE: herhangi biri başarısız olursa otopark
    // yarım güncellenmiş kalmasın.
    let domain_change = match payload.domain.as_deref() {
        None => None,
        Some(raw) => {
            let domain = normalize_domain(raw)?;
            if let Some(d) = &domain {
                if domain_owner(&state.db, d).await?.is_some_and(|id| id != payload.id) {
                    return Err(AppError::Conflict(
                        "Bu alan adı başka bir otoparkta kullanılıyor".to_string(),
                    ));
                }
            }
            Some(domain)
        }
    };

    let result = sqlx::query(
        "UPDATE tenants SET name = ?1, slug = ?2, address = ?3,
                domain = CASE WHEN ?5 THEN ?6 ELSE domain END
         WHERE id = ?4",
    )
    .bind(payload.name.trim())
    .bind(&slug)
    .bind(payload.address.as_deref().map(str::trim).filter(|a| !a.is_empty()))
    .bind(payload.id)
    .bind(domain_change.is_some())
    .bind(domain_change.flatten())
    .execute(&state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::BadRequest("Otopark bulunamadı".to_string()));
    }

    Ok(Json(MessageBody::new(format!("{} güncellendi", payload.name.trim()))))
}

#[derive(sqlx::FromRow)]
struct OfficerRow {
    id: Uuid,
    fullname: String,
    username: String,
    #[sqlx(json)]
    roles: Vec<String>,
    tenant_id: Uuid,
    tenant_name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Officer {
    #[serde(rename = "_id")]
    id: Uuid,
    fullname: String,
    username: String,
    // Memurun kayıtlı olduğu otopark: buna her zaman erişir.
    home_park_id: Uuid,
    home_park_name: String,
    // SüperAdmin'in ayrıca izin verdiği otoparklar.
    park_ids: Vec<Uuid>,
}

// Kullanıcılar ve SüperAdmin'in onlara verdiği ek otopark izinleri
// (`officer_parks`). `filter` hangi kullanıcıların listeleneceğini seçer.
async fn park_members(
    state: &SharedState,
    filter: impl Fn(&[String]) -> bool,
) -> Result<Vec<Officer>, AppError> {
    let rows: Vec<OfficerRow> = sqlx::query_as(
        "SELECT u.id, u.fullname, u.username, u.roles, u.tenant_id, t.name AS tenant_name
         FROM users u
         JOIN tenants t ON t.id = u.tenant_id
         ORDER BY t.name, u.username",
    )
    .fetch_all(&state.db)
    .await?;

    // Postgres'teki `array_agg` yerine izinleri ayrı çekip Rust'ta grupluyoruz.
    let grants: Vec<(Uuid, Uuid)> =
        sqlx::query_as("SELECT user_id, tenant_id FROM officer_parks")
            .fetch_all(&state.db)
            .await?;
    let mut park_ids: HashMap<Uuid, Vec<Uuid>> = HashMap::new();
    for (user_id, tenant_id) in grants {
        park_ids.entry(user_id).or_default().push(tenant_id);
    }

    Ok(rows
        .into_iter()
        .filter(|r| filter(&r.roles))
        .map(|r| Officer {
            id: r.id,
            fullname: r.fullname,
            username: r.username,
            home_park_id: r.tenant_id,
            home_park_name: r.tenant_name,
            park_ids: park_ids.remove(&r.id).unwrap_or_default(),
        })
        .collect())
}

// @route GET /tenants/officers  (SüperAdmin)
// Gümrük memurları: izinli oldukları otoparkların araçlarını BİRLİKTE görür.
// Memur rolüyle birlikte Kurucu/Yönetici olanlar zaten kısıtsız; onları
// listelemiyoruz (bkz. `roles::is_officer`).
pub async fn get_officers(
    user: AuthUser,
    State(state): State<SharedState>,
) -> Result<Json<Vec<Officer>>, AppError> {
    user.require_super_admin()?;
    Ok(Json(park_members(&state, roles::is_officer).await?))
}

// @route GET /tenants/staff  (SüperAdmin)
// Memur ve SüperAdmin dışındaki personel. İzin verilen otoparkın alan
// adından girdiğinde o otoparkta çalışır (bkz. extractors::auth_user).
pub async fn get_staff(
    user: AuthUser,
    State(state): State<SharedState>,
) -> Result<Json<Vec<Officer>>, AppError> {
    user.require_super_admin()?;
    Ok(Json(
        park_members(&state, |r| {
            !roles::is_officer(r) && !r.iter().any(|x| x == roles::SUPER_ADMIN)
        })
        .await?,
    ))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OfficerParksPayload {
    pub user_id: Uuid,
    pub park_ids: Vec<Uuid>,
}

// @route PUT /tenants/officers  (SüperAdmin)
// Kullanıcının (memur veya personel) ek otopark izinlerini verilen listeyle
// DEĞİŞTİRİR.
pub async fn set_officer_parks(
    user: AuthUser,
    State(state): State<SharedState>,
    Json(payload): Json<OfficerParksPayload>,
) -> Result<Json<MessageBody>, AppError> {
    user.require_super_admin()?;

    let target: Option<(String, SqlJson<Vec<String>>, Uuid)> =
        sqlx::query_as("SELECT username, roles, tenant_id FROM users WHERE id = ?1")
            .bind(payload.user_id)
            .fetch_optional(&state.db)
            .await?;
    let (username, SqlJson(target_roles), home_park) =
        target.ok_or_else(|| AppError::BadRequest("Kullanıcı bulunamadı".to_string()))?;
    if target_roles.iter().any(|r| r == roles::SUPER_ADMIN) {
        return Err(AppError::BadRequest(
            "SüperAdmin zaten tüm otoparklara erişebilir".to_string(),
        ));
    }

    let mut tx = state.db.begin().await?;
    sqlx::query("DELETE FROM officer_parks WHERE user_id = ?1")
        .bind(payload.user_id)
        .execute(&mut *tx)
        .await?;
    // `FROM tenants` üzerinden ekleyerek var olmayan otopark id'lerini
    // sessizce eliyoruz; memurun kendi otoparkı zaten her zaman açık.
    // (SQLite'ta dizi parametresi yok: her otopark için ayrı INSERT; hepsi
    // aynı transaction içinde.)
    for park_id in &payload.park_ids {
        sqlx::query(
            "INSERT OR IGNORE INTO officer_parks (user_id, tenant_id)
             SELECT ?1, id FROM tenants WHERE id = ?2 AND id <> ?3",
        )
        .bind(payload.user_id)
        .bind(park_id)
        .bind(home_park)
        .execute(&mut *tx)
        .await?;
    }
    tx.commit().await?;

    Ok(Json(MessageBody::new(format!("{username} için otopark izinleri güncellendi"))))
}

#[cfg(test)]
mod tests {
    use super::{normalize_domain, normalize_slug};

    #[test]
    fn alan_adi_temizlenir() {
        assert_eq!(normalize_domain(" https://www.Akbaslartirparki.com/ ").unwrap().as_deref(), Some("akbaslartirparki.com"));
        assert_eq!(normalize_domain("muallimkoykonak.com").unwrap().as_deref(), Some("muallimkoykonak.com"));
        assert_eq!(normalize_domain("  ").unwrap(), None);
    }

    #[test]
    fn gecersiz_alan_adi_reddedilir() {
        assert!(normalize_domain("otopark").is_err());
        assert!(normalize_domain("ötopark.com").is_err());
        assert!(normalize_domain("-a.com").is_err());
        assert!(normalize_domain("a..com").is_err());
        assert!(normalize_domain("a.com/yol").is_err());
    }

    #[test]
    fn slug_kucuk_harfe_cevrilir() {
        assert_eq!(normalize_slug("  Gebze-2 ").unwrap(), "gebze-2");
    }

    #[test]
    fn gecersiz_slug_reddedilir() {
        assert!(normalize_slug("").is_err());
        assert!(normalize_slug("gebze park").is_err());
        assert!(normalize_slug("muallimköy").is_err());
    }
}
