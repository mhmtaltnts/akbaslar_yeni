use axum::{
    body::Bytes,
    extract::{Path, State},
    http::{header, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use uuid::Uuid;

use crate::{error::AppError, extractors::AuthUser, response::MessageBody, state::SharedState};

// Otopark başına en fazla bu kadar fotoğraf (ana sayfa slaytı).
const MAX_PHOTOS: i64 = 20;
// nginx `/api/` için client_max_body_size 1m; istemci 1 MB altına küçültür.
pub const MAX_PHOTO_BYTES: usize = 1024 * 1024;

#[derive(Serialize, sqlx::FromRow)]
pub struct PhotoInfo {
    #[serde(rename = "_id")]
    pub id: Uuid,
}

// İçeriğin gerçek türü (istemcinin gönderdiği başlığa güvenilmez).
fn sniff(data: &[u8]) -> Option<&'static str> {
    if data.starts_with(&[0xFF, 0xD8, 0xFF]) {
        Some("image/jpeg")
    } else if data.starts_with(&[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]) {
        Some("image/png")
    } else if data.len() > 12 && &data[0..4] == b"RIFF" && &data[8..12] == b"WEBP" {
        Some("image/webp")
    } else {
        None
    }
}

async fn list_for(state: &SharedState, tenant_id: Uuid) -> Result<Vec<PhotoInfo>, AppError> {
    Ok(sqlx::query_as("SELECT id FROM park_photos WHERE tenant_id = ?1 ORDER BY created_at")
        .bind(tenant_id)
        .fetch_all(&state.db)
        .await?)
}

// @route GET /photos  (Kurucu / SüperAdmin) -- çalışılan otoparkın fotoğrafları
pub async fn get_photos(
    user: AuthUser,
    State(state): State<SharedState>,
) -> Result<Json<Vec<PhotoInfo>>, AppError> {
    user.require_admin()?;
    Ok(Json(list_for(&state, user.tenant_id).await?))
}

// @route POST /photos  (Kurucu / SüperAdmin) -- gövde: ham görüntü baytları
pub async fn upload_photo(
    user: AuthUser,
    State(state): State<SharedState>,
    body: Bytes,
) -> Result<impl IntoResponse, AppError> {
    user.require_admin()?;
    if body.len() > MAX_PHOTO_BYTES {
        return Err(AppError::BadRequest("Fotoğraf 1 MB'tan büyük olamaz".to_string()));
    }
    let content_type = sniff(&body)
        .ok_or_else(|| AppError::BadRequest("Sadece JPEG, PNG veya WebP fotoğraf yüklenebilir".to_string()))?;

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM park_photos WHERE tenant_id = ?1")
        .bind(user.tenant_id)
        .fetch_one(&state.db)
        .await?;
    if count >= MAX_PHOTOS {
        return Err(AppError::BadRequest(format!(
            "En fazla {MAX_PHOTOS} fotoğraf eklenebilir; önce birini silin"
        )));
    }

    let id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO park_photos (id, tenant_id, content_type, data, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
    )
    .bind(id)
    .bind(user.tenant_id)
    .bind(content_type)
    .bind(body.as_ref())
    .bind(chrono::Utc::now().timestamp_millis())
    .execute(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(PhotoInfo { id })))
}

// @route DELETE /photos/{id}  (Kurucu / SüperAdmin) -- sadece çalışılan otoparkın
pub async fn delete_photo(
    user: AuthUser,
    State(state): State<SharedState>,
    Path(id): Path<Uuid>,
) -> Result<Json<MessageBody>, AppError> {
    user.require_admin()?;
    let result = sqlx::query("DELETE FROM park_photos WHERE id = ?1 AND tenant_id = ?2")
        .bind(id)
        .bind(user.tenant_id)
        .execute(&state.db)
        .await?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Fotoğraf bulunamadı".to_string()));
    }
    Ok(Json(MessageBody::new("Fotoğraf silindi".to_string())))
}

// @route GET /public/parks/{slug}/photos -- ana sayfa slaytı
pub async fn get_public_photos(
    State(state): State<SharedState>,
    Path(slug): Path<String>,
) -> Result<Json<Vec<PhotoInfo>>, AppError> {
    let tenant_id: Option<Uuid> =
        sqlx::query_scalar("SELECT id FROM tenants WHERE lower(slug) = lower(?1) AND active")
            .bind(&slug)
            .fetch_optional(&state.db)
            .await?;
    let tenant_id = tenant_id.ok_or_else(|| AppError::NotFound("Otopark bulunamadı".to_string()))?;
    Ok(Json(list_for(&state, tenant_id).await?))
}

// @route GET /public/photos/{id} -- görüntünün kendisi. Kimlik her yüklemede
// yeni olduğu için içerik değişmez: tarayıcı bir yıl önbellekte tutar.
pub async fn get_photo(
    State(state): State<SharedState>,
    Path(id): Path<Uuid>,
) -> Result<Response, AppError> {
    let row: Option<(String, Vec<u8>)> =
        sqlx::query_as("SELECT content_type, data FROM park_photos WHERE id = ?1")
            .bind(id)
            .fetch_optional(&state.db)
            .await?;
    let (content_type, data) = row.ok_or_else(|| AppError::NotFound("Fotoğraf bulunamadı".to_string()))?;
    Ok((
        [
            (header::CONTENT_TYPE, HeaderValue::from_str(&content_type).unwrap_or(HeaderValue::from_static("image/jpeg"))),
            (header::CACHE_CONTROL, HeaderValue::from_static("public, max-age=31536000, immutable")),
            (header::X_CONTENT_TYPE_OPTIONS, HeaderValue::from_static("nosniff")),
        ],
        data,
    )
        .into_response())
}

#[cfg(test)]
mod tests {
    use super::sniff;

    #[test]
    fn gorsel_turu_icerikten_anlasilir() {
        assert_eq!(sniff(&[0xFF, 0xD8, 0xFF, 0xE0, 0, 0]), Some("image/jpeg"));
        assert_eq!(sniff(b"\x89PNG\r\n\x1a\n...."), Some("image/png"));
        assert_eq!(sniff(b"RIFF\0\0\0\0WEBPVP8 "), Some("image/webp"));
        assert_eq!(sniff(b"<svg xmlns=..."), None);
        assert_eq!(sniff(b"GIF89a"), None);
    }
}
