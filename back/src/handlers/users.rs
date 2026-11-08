use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    error::AppError,
    extractors::AuthUser,
    models::User,
    response::{MessageBody, ReplyBody},
    state::SharedState,
};

// @route GET /users
// `_user: AuthUser` -- parametreyi KULLANMASAK bile eklemesi bu route'u
// korur. İsmi `_` ile başlıyor çünkü gövdede değerine ihtiyacımız yok,
// sadece "bu route girişte doğrulansın" demek istiyoruz.
pub async fn get_all_users(
    _user: AuthUser,
    State(state): State<SharedState>,
) -> Result<Json<Vec<User>>, AppError> {
    // Ders 14: `query_as` (runtime) yerine `query_as!` (derleme zamanı
    // kontrollü). Fark: bu makro, DERLEME ANINDA `DATABASE_URL`'deki
    // gerçek Postgres'e bağlanıp "users" tablosunun sütunlarını/tiplerini
    // sorar ve `User` struct'ının alanlarıyla TİPTE eşleştiğini doğrular.
    // Bir sütun adını yanlış yazsan, tipini uyuşmayan bir şeyle değiştirsen,
    // ya da migration'ı unutsan -- `cargo build` SQL hatasını derleme
    // zamanında yakalar, runtime'da 500 olarak değil.
    let users: Vec<User> = sqlx::query_as!(User, "SELECT * FROM users")
        .fetch_all(&state.db)
        .await?;

    if users.is_empty() {
        return Err(AppError::BadRequest("Kullanıcı bulunamadı".to_string()));
    }

    Ok(Json(users))
}

#[derive(Deserialize)]
pub struct CreateUserPayload {
    // DİKKAT -- Node'daki GERÇEK BİR HATAYI birebir koruyoruz: controller
    // body'den `fullName` okuyor ama modelin/tablonun gerçek sütunu
    // `fullname`. Bu alanı kabul ediyoruz (JSON'da bulunmasına izin
    // veriyoruz) ama hiçbir yerde KULLANMIYORUZ -- aşağıdaki INSERT'te
    // `fullname` sütunu hiç bind edilmiyor. Sonuç: bu endpoint her
    // çağrıldığında `fullname NOT NULL` kısıtını ihlal edip 500 döner --
    // Node'da Mongoose'un aynı sebeple fırlattığı validation hatasının
    // Express 5 tarafından otomatik 500'e çevrilmesiyle AYNI sonuç.
    #[serde(rename = "fullName")]
    #[allow(dead_code)]
    pub full_name: Option<String>,
    pub username: String,
    pub password: String,
    pub roles: Option<Vec<String>>,
}

// @route POST /users
pub async fn create_user(
    _user: AuthUser,
    State(state): State<SharedState>,
    Json(payload): Json<CreateUserPayload>,
) -> Result<impl IntoResponse, AppError> {
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
    let roles = payload.roles.filter(|r| !r.is_empty());

    sqlx::query(
        "INSERT INTO users (username, password, roles)
         VALUES ($1, $2, COALESCE($3, ARRAY['Çalışan']))",
    )
    .bind(&payload.username)
    .bind(&hashed)
    .bind(roles)
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
    // Aynı bug burada da var -- kabul ediliyor, hiç kullanılmıyor.
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
    _user: AuthUser,
    State(state): State<SharedState>,
    Json(payload): Json<UpdateUserPayload>,
) -> Result<Json<MessageBody>, AppError> {
    if payload.username.is_empty() || payload.roles.is_empty() {
        return Err(AppError::BadRequest(
            "Şifre hariç diğer bütün alanlar doldurulmalı".to_string(),
        ));
    }

    let exists: Option<(Uuid,)> = sqlx::query_as("SELECT id FROM users WHERE id = $1")
        .bind(payload.id)
        .fetch_optional(&state.db)
        .await?;

    if exists.is_none() {
        return Err(AppError::BadRequest("Kullanıcı bulunamadı".to_string()));
    }

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

    // DİKKAT: `fullname` burada da KASITLI OLARAK güncellenmiyor -- Node'daki
    // `user.fullName = fullName` satırının no-op olmasıyla aynı (schema'da
    // olmayan bir alana yazıp save() çağırmanın hiçbir etkisi yoktu).
    match payload.password.filter(|p| !p.is_empty()) {
        Some(password) => {
            let hashed = bcrypt::hash(&password, bcrypt::DEFAULT_COST)
                .map_err(|err| AppError::Internal(format!("şifre hashlenemedi: {err}")))?;

            sqlx::query(
                "UPDATE users SET username = $1, roles = $2, active = $3, password = $4 WHERE id = $5",
            )
            .bind(&payload.username)
            .bind(&payload.roles)
            .bind(payload.active)
            .bind(&hashed)
            .bind(payload.id)
            .execute(&state.db)
            .await?;
        }
        None => {
            sqlx::query("UPDATE users SET username = $1, roles = $2, active = $3 WHERE id = $4")
                .bind(&payload.username)
                .bind(&payload.roles)
                .bind(payload.active)
                .bind(payload.id)
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
    _user: AuthUser,
    State(state): State<SharedState>,
    Json(payload): Json<DeleteUserPayload>,
) -> Result<Json<ReplyBody>, AppError> {
    let user: Option<User> = sqlx::query_as("SELECT * FROM users WHERE id = $1")
        .bind(payload.id)
        .fetch_optional(&state.db)
        .await?;

    let user = user.ok_or_else(|| AppError::BadRequest("Kullanıcı bulunamadı".to_string()))?;

    sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(payload.id)
        .execute(&state.db)
        .await?;

    // Node tarafında `result.username` diye bir şeye erişiyordu ama
    // `deleteOne()`'ın sonucunda `username` alanı YOK (`{acknowledged,
    // deletedCount}` döner) -- mesaj pratikte "undefined adında kullanıcı
    // silindi" olurdu. Bu saf kozmetik bir hataydı (veri kaybı/işlev
    // bozukluğu yok), elimizde zaten doğru `user.username` varken onu
    // tekrar üretmenin hiçbir öğretici ya da pratik faydası yok.
    Ok(Json(ReplyBody::new(format!(
        "{} adında kullanıcı silindi",
        user.username
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

    #[sqlx::test]
    async fn case_insensitive_duplicate_kontrolu_calisir(pool: sqlx::PgPool) -> sqlx::Result<()> {
        sqlx::query("INSERT INTO users (fullname, username, password) VALUES ($1, $2, $3)")
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
        sqlx::query("INSERT INTO users (fullname, username, password) VALUES ($1, $2, $3)")
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
