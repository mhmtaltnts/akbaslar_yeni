use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::Deserialize;
use sqlx::types::Json as SqlJson;
use uuid::Uuid;

use crate::{
    error::AppError,
    extractors::AuthUser,
    models::{username_key, User},
    response::{MessageBody, ReplyBody},
    roles,
    state::SharedState,
};

// Bir otoparkın kurucusu kendi kullanıcılarına `SüperAdmin` rolü VEREMEZ
// (yoksa tüm otoparkları yönetebilirdi), ama zaten SüperAdmin olan bir
// kullanıcıyı düzenlerken bu rolü de SİLMEMELİ. Sadece SüperAdmin olan biri
// bu rolü serbestçe verip alabilir.
fn sanitize_roles(requested: Vec<String>, caller: &AuthUser, target_had_super: bool) -> Vec<String> {
    let mut roles: Vec<String> = if caller.is_super_admin() {
        requested
    } else {
        requested.into_iter().filter(|r| r != roles::SUPER_ADMIN).collect()
    };
    if !caller.is_super_admin() && target_had_super {
        roles.push(roles::SUPER_ADMIN.to_string());
    }
    roles
}

// @route GET /users
// Sadece isteği yapanın otoparkındaki kullanıcılar.
pub async fn get_all_users(
    user: AuthUser,
    State(state): State<SharedState>,
) -> Result<Json<Vec<User>>, AppError> {
    user.require_admin()?;

    // Ders 14'te burada `query_as!` (derleme zamanında gerçek veritabanına
    // bağlanıp sütun tiplerini doğrulayan makro) vardı. SQLite'a geçince
    // `roles` sütunu JSON metni oldu; makro bunu `Vec<String>`'e kendisi
    // eşleyemiyor ve derleme için her makinede şeması kurulmuş bir veritabanı
    // dosyası gerektiriyordu. Diğer sorgular gibi runtime `query_as`'e döndük;
    // `User` üzerindeki `#[sqlx(json)]` dönüşümü burada da çalışıyor.
    let users: Vec<User> = sqlx::query_as(
        "SELECT * FROM users WHERE tenant_id = ?1 ORDER BY username",
    )
    .bind(user.tenant_id)
    .fetch_all(&state.db)
    .await?;

    if users.is_empty() {
        return Err(AppError::BadRequest("Kullanıcı bulunamadı".to_string()));
    }

    Ok(Json(users))
}

#[derive(Deserialize)]
pub struct CreateUserPayload {
    // Frontend `fullName` gönderiyor, tablo sütunu `fullname`. Eskiden bu
    // alan hiç kullanılmıyordu ve INSERT `fullname NOT NULL` yüzünden hep
    // 500 dönüyordu; çoklu otoparkta kurucuların kendi personelini
    // ekleyebilmesi gerektiği için artık gerçekten yazıyoruz.
    #[serde(rename = "fullName")]
    pub full_name: Option<String>,
    pub username: String,
    pub password: String,
    pub roles: Option<Vec<String>>,
}

// @route POST /users
// Yeni kullanıcı HER ZAMAN isteği yapanın otoparkına eklenir.
pub async fn create_user(
    user: AuthUser,
    State(state): State<SharedState>,
    Json(payload): Json<CreateUserPayload>,
) -> Result<impl IntoResponse, AppError> {
    user.require_admin()?;

    if payload.username.is_empty() || payload.password.is_empty() {
        return Err(AppError::BadRequest("Tüm alanlar doldurulmalı".to_string()));
    }

    let duplicate: Option<(Uuid,)> =
        sqlx::query_as("SELECT id FROM users WHERE username_key = ?1")
            .bind(username_key(&payload.username))
            .fetch_optional(&state.db)
            .await?;

    if duplicate.is_some() {
        return Err(AppError::Conflict(
            "Kullanıcı mevcut, farklı isimde kullanıcı ekleyiniz.".to_string(),
        ));
    }

    let hashed = bcrypt::hash(&payload.password, bcrypt::DEFAULT_COST)
        .map_err(|err| AppError::Internal(format!("şifre hashlenemedi: {err}")))?;

    // `!Array.isArray(roles) || !roles.length` karşılığı: boş/sağlanmamışsa
    // varsayılan rol "Çalışan".
    let roles = payload
        .roles
        .map(|r| sanitize_roles(r, &user, false))
        .filter(|r| !r.is_empty())
        .unwrap_or_else(|| vec![roles::EMPLOYEE.to_string()]);

    let fullname = payload
        .full_name
        .filter(|f| !f.trim().is_empty())
        .unwrap_or_else(|| payload.username.clone());

    sqlx::query(
        "INSERT INTO users (id, fullname, username, username_key, password, roles, tenant_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    )
    .bind(Uuid::new_v4())
    .bind(&fullname)
    .bind(&payload.username)
    .bind(username_key(&payload.username))
    .bind(&hashed)
    .bind(SqlJson(&roles))
    .bind(user.tenant_id)
    .execute(&state.db)
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(MessageBody::new(format!(
            "Yeni kullanıcı {} oluşturuldu",
            payload.username
        ))),
    ))
}

#[derive(Deserialize)]
pub struct UpdateUserPayload {
    pub id: Uuid,
    // Kabul ediliyor ama güncellenmiyor (Node'daki no-op davranışı korunuyor).
    #[serde(rename = "fullName")]
    #[allow(dead_code)]
    pub full_name: Option<String>,
    pub username: String,
    pub roles: Vec<String>,
    pub active: bool,
    pub password: Option<String>,
}

// @route PATCH /users
pub async fn update_user(
    user: AuthUser,
    State(state): State<SharedState>,
    Json(payload): Json<UpdateUserPayload>,
) -> Result<Json<MessageBody>, AppError> {
    user.require_admin()?;

    if payload.username.is_empty() || payload.roles.is_empty() {
        return Err(AppError::BadRequest(
            "Şifre hariç diğer bütün alanlar doldurulmalı".to_string(),
        ));
    }

    // `tenant_id` filtresi: başka otoparkın kullanıcısının id'sini bilen
    // biri onu düzenleyemesin -- "bulunamadı" ile aynı yanıtı alır.
    let target_roles: Option<SqlJson<Vec<String>>> =
        sqlx::query_scalar("SELECT roles FROM users WHERE id = ?1 AND tenant_id = ?2")
            .bind(payload.id)
            .bind(user.tenant_id)
            .fetch_optional(&state.db)
            .await?;

    let target_roles = target_roles
        .ok_or_else(|| AppError::BadRequest("Kullanıcı bulunamadı".to_string()))?
        .0;
    let target_had_super = target_roles.iter().any(|r| r == roles::SUPER_ADMIN);

    let duplicate: Option<(Uuid,)> =
        sqlx::query_as("SELECT id FROM users WHERE username_key = ?1")
            .bind(username_key(&payload.username))
            .fetch_optional(&state.db)
            .await?;

    if let Some((duplicate_id,)) = duplicate {
        if duplicate_id != payload.id {
            return Err(AppError::Conflict(
                "Bu isim kullanılıyor, başka isim deneyin.".to_string(),
            ));
        }
    }

    let new_roles = sanitize_roles(payload.roles, &user, target_had_super);

    // SüperAdmin rolünü sadece başka bir SüperAdmin kaldırabilir: kendi
    // yetkisini kaldıran (ya da kendini pasif eden) son SüperAdmin, kimsenin
    // otoparkları ve SüperAdmin atamasını yönetemediği bir sistem bırakırdı.
    if payload.id == user.id
        && target_had_super
        && (!new_roles.iter().any(|r| r == roles::SUPER_ADMIN) || !payload.active)
    {
        return Err(AppError::BadRequest(
            "Kendi SüperAdmin yetkinizi kaldıramaz ve hesabınızı pasif edemezsiniz".to_string(),
        ));
    }

    // DİKKAT: `fullname` burada da KASITLI OLARAK güncellenmiyor -- Node'daki
    // `user.fullName = fullName` satırının no-op olmasıyla aynı.
    match payload.password.filter(|p| !p.is_empty()) {
        Some(password) => {
            let hashed = bcrypt::hash(&password, bcrypt::DEFAULT_COST)
                .map_err(|err| AppError::Internal(format!("şifre hashlenemedi: {err}")))?;

            sqlx::query(
                "UPDATE users SET username = ?1, roles = ?2, active = ?3, password = ?4,
                     username_key = ?7
                 WHERE id = ?5 AND tenant_id = ?6",
            )
            .bind(&payload.username)
            .bind(SqlJson(&new_roles))
            .bind(payload.active)
            .bind(&hashed)
            .bind(payload.id)
            .bind(user.tenant_id)
            .bind(username_key(&payload.username))
            .execute(&state.db)
            .await?;
        }
        None => {
            sqlx::query(
                "UPDATE users SET username = ?1, roles = ?2, active = ?3, username_key = ?6
                 WHERE id = ?4 AND tenant_id = ?5",
            )
            .bind(&payload.username)
            .bind(SqlJson(&new_roles))
            .bind(payload.active)
            .bind(payload.id)
            .bind(user.tenant_id)
            .bind(username_key(&payload.username))
            .execute(&state.db)
            .await?;
        }
    }

    Ok(Json(MessageBody::new(format!(
        "{} güncellendi",
        payload.username
    ))))
}

#[derive(Deserialize)]
pub struct DeleteUserPayload {
    pub id: Uuid,
}

// @route DELETE /users
pub async fn delete_user(
    user: AuthUser,
    State(state): State<SharedState>,
    Json(payload): Json<DeleteUserPayload>,
) -> Result<Json<ReplyBody>, AppError> {
    user.require_admin()?;

    let target: Option<User> =
        sqlx::query_as("SELECT * FROM users WHERE id = ?1 AND tenant_id = ?2")
            .bind(payload.id)
            .bind(user.tenant_id)
            .fetch_optional(&state.db)
            .await?;

    let target = target.ok_or_else(|| AppError::BadRequest("Kullanıcı bulunamadı".to_string()))?;

    if target.roles.iter().any(|r| r == roles::SUPER_ADMIN) && !user.is_super_admin() {
        return Err(AppError::Unauthorized(
            "SüperAdmin kullanıcısını silme yetkiniz yok".to_string(),
        ));
    }

    sqlx::query("DELETE FROM users WHERE id = ?1 AND tenant_id = ?2")
        .bind(payload.id)
        .bind(user.tenant_id)
        .execute(&state.db)
        .await?;

    Ok(Json(ReplyBody::new(format!(
        "{} adında kullanıcı silindi",
        target.username
    ))))
}

// Ders 14: `#[sqlx::test]` -- buraya kadarki testlerin (`error.rs`, `jwt.rs`)
// aksine bu GERÇEK bir veritabanına ihtiyaç duyuyor: case-insensitive
// eşleşme mantığı veritabanı davranışının (eşsiz index) kendisi, mock'la
// taklit edilemez. SQLite'ta makro her test için geçici, tek kullanımlık bir
// veritabanı dosyası oluşturur, `migrations/`i çalıştırır, test bitince
// siler -- dev veritabanımıza hiç dokunmaz.
#[cfg(test)]
mod tests {
    use super::*;

    fn caller(roles: &[&str]) -> AuthUser {
        AuthUser {
            id: Uuid::new_v4(),
            username: "x".to_string(),
            fullname: "x".to_string(),
            roles: roles.iter().map(|r| r.to_string()).collect(),
            tenant_id: Uuid::new_v4(),
            home_tenant_id: Uuid::new_v4(),
        }
    }

    #[test]
    fn kurucu_superadmin_rolu_veremez() {
        let roles = sanitize_roles(
            vec!["Kurucu".into(), "SüperAdmin".into()],
            &caller(&["Kurucu"]),
            false,
        );
        assert_eq!(roles, vec!["Kurucu".to_string()]);
    }

    #[test]
    fn kurucu_mevcut_superadmin_rolunu_silemez() {
        let roles = sanitize_roles(vec!["Kurucu".into()], &caller(&["Kurucu"]), true);
        assert!(roles.contains(&"SüperAdmin".to_string()));
    }

    #[test]
    fn superadmin_rolu_serbestce_yonetir() {
        let sa = caller(&["Kurucu", "SüperAdmin"]);
        assert_eq!(sanitize_roles(vec!["Çalışan".into()], &sa, true), vec!["Çalışan".to_string()]);
        assert!(sanitize_roles(vec!["SüperAdmin".into()], &sa, false).contains(&"SüperAdmin".to_string()));
    }

    async fn insert_user(pool: &sqlx::SqlitePool, username: &str) -> sqlx::Result<()> {
        sqlx::query(
            "INSERT INTO users (id, fullname, username, username_key, password, tenant_id)
             VALUES (?1, ?2, ?3, ?4, ?5, (SELECT id FROM tenants LIMIT 1))",
        )
        .bind(Uuid::new_v4())
        .bind("Test")
        .bind(username)
        .bind(username_key(username))
        .bind("hash")
        .execute(pool)
        .await?;
        Ok(())
    }

    // signup/create_user'daki AYNI sorgu.
    async fn find_duplicate(pool: &sqlx::SqlitePool, username: &str) -> sqlx::Result<Option<(Uuid,)>> {
        sqlx::query_as("SELECT id FROM users WHERE username_key = ?1")
            .bind(username_key(username))
            .fetch_optional(pool)
            .await
    }

    #[sqlx::test]
    async fn case_insensitive_duplicate_kontrolu_calisir(pool: sqlx::SqlitePool) -> sqlx::Result<()> {
        insert_user(&pool, "TestKullanici").await?;
        assert!(find_duplicate(&pool, "testkullanici").await?.is_some());
        Ok(())
    }

    // SQLite'ın `lower()`'ı bunu yakalayamazdı (sadece ASCII); `username_key`
    // sütunu yakalıyor.
    #[sqlx::test]
    async fn turkce_karakterli_duplicate_yakalanir(pool: sqlx::SqlitePool) -> sqlx::Result<()> {
        insert_user(&pool, "ÇALIŞAN_ÖĞÜ").await?;
        assert!(find_duplicate(&pool, "çalışan_öğü").await?.is_some());
        // Eşsiz index de aynı kuralı veritabanı seviyesinde uyguluyor.
        assert!(insert_user(&pool, "çalışan_öğü").await.is_err());
        Ok(())
    }

    #[sqlx::test]
    async fn farkli_kullanici_adi_duplicate_sayilmaz(pool: sqlx::SqlitePool) -> sqlx::Result<()> {
        insert_user(&pool, "TestKullanici").await?;
        assert!(find_duplicate(&pool, "baska_kullanici").await?.is_none());
        Ok(())
    }

    // Rollerin JSON olarak yazılıp `User.roles`'a geri okunması.
    #[sqlx::test]
    async fn roller_json_olarak_okunur(pool: sqlx::SqlitePool) -> sqlx::Result<()> {
        insert_user(&pool, "rolcu").await?;
        let user: User = sqlx::query_as("SELECT * FROM users WHERE username = 'rolcu'")
            .fetch_one(&pool)
            .await?;
        assert_eq!(user.roles, vec!["Çalışan".to_string()]);
        Ok(())
    }
}
