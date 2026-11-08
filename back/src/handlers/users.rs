use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    error::AppError,
    extractors::AuthUser,
    models::User,
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

    // Ders 14: `query_as` (runtime) yerine `query_as!` (derleme zamanı
    // kontrollü). Fark: bu makro, DERLEME ANINDA `DATABASE_URL`'deki
    // gerçek Postgres'e bağlanıp "users" tablosunun sütunlarını/tiplerini
    // sorar ve `User` struct'ının alanlarıyla TİPTE eşleştiğini doğrular.
    let users: Vec<User> = sqlx::query_as!(
        User,
        "SELECT id, fullname, username, password, roles, active, tenant_id
         FROM users WHERE tenant_id = $1 ORDER BY username",
        user.tenant_id
    )
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
        sqlx::query_as("SELECT id FROM users WHERE lower(username) = lower($1)")
            .bind(&payload.username)
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
    // NULL bind edip tablonun DEFAULT'una (`ARRAY['Çalışan']`) bırakıyoruz.
    let roles = payload
        .roles
        .map(|r| sanitize_roles(r, &user, false))
        .filter(|r| !r.is_empty());

    let fullname = payload
        .full_name
        .filter(|f| !f.trim().is_empty())
        .unwrap_or_else(|| payload.username.clone());

    sqlx::query(
        "INSERT INTO users (fullname, username, password, roles, tenant_id)
         VALUES ($1, $2, $3, COALESCE($4, ARRAY['Çalışan']), $5)",
    )
    .bind(&fullname)
    .bind(&payload.username)
    .bind(&hashed)
    .bind(roles)
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
    let target_roles: Option<Vec<String>> =
        sqlx::query_scalar("SELECT roles FROM users WHERE id = $1 AND tenant_id = $2")
            .bind(payload.id)
            .bind(user.tenant_id)
            .fetch_optional(&state.db)
            .await?;

    let target_roles =
        target_roles.ok_or_else(|| AppError::BadRequest("Kullanıcı bulunamadı".to_string()))?;
    let target_had_super = target_roles.iter().any(|r| r == roles::SUPER_ADMIN);

    let duplicate: Option<(Uuid,)> =
        sqlx::query_as("SELECT id FROM users WHERE lower(username) = lower($1)")
            .bind(&payload.username)
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

    // DİKKAT: `fullname` burada da KASITLI OLARAK güncellenmiyor -- Node'daki
    // `user.fullName = fullName` satırının no-op olmasıyla aynı.
    match payload.password.filter(|p| !p.is_empty()) {
        Some(password) => {
            let hashed = bcrypt::hash(&password, bcrypt::DEFAULT_COST)
                .map_err(|err| AppError::Internal(format!("şifre hashlenemedi: {err}")))?;

            sqlx::query(
                "UPDATE users SET username = $1, roles = $2, active = $3, password = $4
                 WHERE id = $5 AND tenant_id = $6",
            )
            .bind(&payload.username)
            .bind(&new_roles)
            .bind(payload.active)
            .bind(&hashed)
            .bind(payload.id)
            .bind(user.tenant_id)
            .execute(&state.db)
            .await?;
        }
        None => {
            sqlx::query(
                "UPDATE users SET username = $1, roles = $2, active = $3
                 WHERE id = $4 AND tenant_id = $5",
            )
            .bind(&payload.username)
            .bind(&new_roles)
            .bind(payload.active)
            .bind(payload.id)
            .bind(user.tenant_id)
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
        sqlx::query_as("SELECT * FROM users WHERE id = $1 AND tenant_id = $2")
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

    sqlx::query("DELETE FROM users WHERE id = $1 AND tenant_id = $2")
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
// aksine bu GERÇEK bir Postgres'e ihtiyaç duyuyor: `lower(username)` ile
// case-insensitive eşleşme mantığı veritabanı davranışının kendisi, mock'la
// taklit edilemez. Makro, `.env`'deki DATABASE_URL'in sunucusunda testin
// kendi TEK KULLANIMLIK veritabanını oluşturur, `migrations/`i çalıştırır,
// test bitince siler -- dev veritabanımıza (akbaslar_postgres) hiç
// dokunmaz, testler arasında paylaşılan state yüzünden testler birbirini
// etkilemez.
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

    #[sqlx::test]
    async fn case_insensitive_duplicate_kontrolu_calisir(pool: sqlx::PgPool) -> sqlx::Result<()> {
        sqlx::query(
            "INSERT INTO users (fullname, username, password, tenant_id)
             VALUES ($1, $2, $3, (SELECT id FROM tenants LIMIT 1))",
        )
            .bind("Test")
            .bind("TestKullanici")
            .bind("hash")
            .execute(&pool)
            .await?;

        // signup/create_user'daki AYNI sorgu -- farklı harf büyüklüğüyle
        // bile eşleşmeli.
        let duplicate: Option<(Uuid,)> =
            sqlx::query_as("SELECT id FROM users WHERE lower(username) = lower($1)")
                .bind("testkullanici")
                .fetch_optional(&pool)
                .await?;

        assert!(duplicate.is_some());
        Ok(())
    }

    #[sqlx::test]
    async fn farkli_kullanici_adi_duplicate_sayilmaz(pool: sqlx::PgPool) -> sqlx::Result<()> {
        sqlx::query(
            "INSERT INTO users (fullname, username, password, tenant_id)
             VALUES ($1, $2, $3, (SELECT id FROM tenants LIMIT 1))",
        )
            .bind("Test")
            .bind("TestKullanici")
            .bind("hash")
            .execute(&pool)
            .await?;

        let duplicate: Option<(Uuid,)> =
            sqlx::query_as("SELECT id FROM users WHERE lower(username) = lower($1)")
                .bind("baska_kullanici")
                .fetch_optional(&pool)
                .await?;

        assert!(duplicate.is_none());
        Ok(())
    }
}
