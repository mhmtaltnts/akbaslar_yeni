use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use axum_extra::extract::{
    cookie::{Cookie, SameSite},
    CookieJar,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    error::AppError,
    jwt::{self, RefreshClaims},
    models::User,
    response::MessageBody,
    state::SharedState,
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenResponse {
    access_token: String,
}

#[derive(Deserialize)]
pub struct SignupPayload {
    pub fullname: String,
    pub username: String,
    pub password: String,
    // Katılınacak otoparkın kodu (`tenants.slug`).
    pub park: String,
}

// @route POST /auth/signup
// Çoklu otoparkta herkese açık kayıt, kullanıcıyı otopark koduyla verilen
// otoparka PASİF olarak ekler: aksi halde kodu bilen herkes o otoparkın
// tüm kayıtlarına erişebilirdi. Otoparkın kurucusu kullanıcıyı
// "Kullanıcılar" sayfasından aktif ettiğinde giriş yapılabilir.
pub async fn signup(
    State(state): State<SharedState>,
    Json(payload): Json<SignupPayload>,
) -> Result<impl IntoResponse, AppError> {
    if payload.fullname.is_empty()
        || payload.username.is_empty()
        || payload.password.is_empty()
        || payload.park.trim().is_empty()
    {
        return Err(AppError::BadRequest("Tüm alanları doldurun".to_string()));
    }

    let tenant_id: Option<Uuid> = sqlx::query_scalar(
        "SELECT id FROM tenants WHERE lower(slug) = lower($1) AND active",
    )
    .bind(payload.park.trim())
    .fetch_optional(&state.db)
    .await?;

    let tenant_id =
        tenant_id.ok_or_else(|| AppError::BadRequest("Otopark kodu geçersiz".to_string()))?;

    // `.collation({ locale: 'en', strength: 2 })` karşılığı: case-insensitive
    // kontrol için Ders 3'te oluşturduğumuz `lower(username)` index'ini kullanıyoruz.
    // Kullanıcı adları tüm otoparklar arasında eşsiz (bkz. migration 0003).
    let duplicate: Option<(Uuid,)> =
        sqlx::query_as("SELECT id FROM users WHERE lower(username) = lower($1)")
            .bind(&payload.username)
            .fetch_optional(&state.db)
            .await?;

    if duplicate.is_some() {
        return Err(AppError::Conflict("Kullanıcı mevcut".to_string()));
    }

    let hashed = bcrypt::hash(&payload.password, bcrypt::DEFAULT_COST)
        .map_err(|err| AppError::Internal(format!("şifre hashlenemedi: {err}")))?;

    sqlx::query(
        "INSERT INTO users (fullname, username, password, tenant_id, active)
         VALUES ($1, $2, $3, $4, FALSE)",
    )
    .bind(&payload.fullname)
    .bind(&payload.username)
    .bind(&hashed)
    .bind(tenant_id)
    .execute(&state.db)
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(MessageBody::new(
            "Kayıt alındı. Otopark yöneticisi hesabınızı onayladıktan sonra giriş yapabilirsiniz",
        )),
    ))
}

// Kullanıcının otoparkını getirir; otopark pasifse (askıya alınmışsa) None.
async fn active_tenant_name(state: &SharedState, tenant_id: Uuid) -> Result<Option<String>, AppError> {
    let name: Option<String> =
        sqlx::query_scalar("SELECT name FROM tenants WHERE id = $1 AND active")
            .bind(tenant_id)
            .fetch_optional(&state.db)
            .await?;
    Ok(name)
}

#[derive(Deserialize)]
pub struct LoginPayload {
    pub username: String,
    pub password: String,
}

// @route POST /auth/login
pub async fn login(
    State(state): State<SharedState>,
    jar: CookieJar,
    Json(payload): Json<LoginPayload>,
) -> Result<Response, AppError> {
    if payload.username.is_empty() || payload.password.is_empty() {
        return Err(AppError::BadRequest("Tüm alanları doldurun".to_string()));
    }

    // DİKKAT: Node'daki login sorgusu `User.findOne({ username })` --
    // signup'taki duplicate kontrolünün aksine CASE-SENSITIVE. Bu muhtemelen
    // orijinal projede bilinçsiz bir tutarsızlık, ama şimdilik davranışı
    // birebir koruyoruz (frontend buna göre çalışıyor olabilir).
    let user: Option<User> = sqlx::query_as("SELECT * FROM users WHERE username = $1")
        .bind(&payload.username)
        .fetch_optional(&state.db)
        .await?;

    let user = match user {
        Some(user) if user.active => user,
        _ => return Err(AppError::Unauthorized("Yetkisiz".to_string())),
    };

    let matches = bcrypt::verify(&payload.password, &user.password)
        .map_err(|err| AppError::Internal(format!("şifre doğrulanamadı: {err}")))?;

    if !matches {
        return Err(AppError::Unauthorized("Şifre Geçersiz".to_string()));
    }

    let tenant_name = active_tenant_name(&state, user.tenant_id)
        .await?
        .ok_or_else(|| AppError::Unauthorized("Otopark hesabı askıya alınmış".to_string()))?;

    let access_token = jwt::sign_access_token(&state.access_token_secret, &user, &tenant_name)?;
    let refresh_token = jwt::sign_refresh_token(&state.refresh_token_secret, &user)?;

    // `res.cookie('jwt', refreshToken, { httpOnly, secure, sameSite: 'None',
    // maxAge: 7*24*60*60*1000 })` karşılığı.
    let cookie = Cookie::build(("jwt", refresh_token))
        .http_only(true)
        .secure(true)
        .same_site(SameSite::None)
        .max_age(time::Duration::days(7))
        .path("/")
        .build();

    let jar = jar.add(cookie);

    Ok((jar, Json(TokenResponse { access_token })).into_response())
}

// @route GET /auth/refresh
pub async fn refresh(
    State(state): State<SharedState>,
    jar: CookieJar,
) -> Result<Json<TokenResponse>, AppError> {
    let refresh_token = jar
        .get("jwt")
        .map(|cookie| cookie.value().to_string())
        .ok_or_else(|| AppError::Unauthorized("Yetkisiz, Cookie sorunu".to_string()))?;

    let claims: RefreshClaims =
        jwt::decode_refresh_token(&refresh_token, &state.refresh_token_secret)
            .map_err(|_| AppError::Forbidden("İmza snasında bir hata oluştu".to_string()))?;

    let user: Option<User> = sqlx::query_as("SELECT * FROM users WHERE username = $1")
        .bind(&claims.username)
        .fetch_optional(&state.db)
        .await?;

    // Refresh, pasif edilen kullanıcıların ve askıya alınan otoparkların
    // 7 günlük refresh cookie'siyle oturuma devam etmesini engellemeli.
    let user = match user {
        Some(user) if user.active => user,
        _ => return Err(AppError::Unauthorized("Yetkisiz".to_string())),
    };

    let tenant_name = active_tenant_name(&state, user.tenant_id)
        .await?
        .ok_or_else(|| AppError::Unauthorized("Otopark hesabı askıya alınmış".to_string()))?;

    let access_token = jwt::sign_access_token(&state.access_token_secret, &user, &tenant_name)?;

    Ok(Json(TokenResponse { access_token }))
}

// @route POST /auth/logout
// Node'daki gibi bu handler'ın bir hata yolu yok -- dönüş tipi düz `Response`.
pub async fn logout(jar: CookieJar) -> Response {
    if jar.get("jwt").is_none() {
        return (StatusCode::NO_CONTENT, jar).into_response();
    }

    let jar = jar.remove(Cookie::from("jwt"));

    (jar, Json(MessageBody::new("Cookie cleared"))).into_response()
}
