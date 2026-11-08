use axum::{extract::State, Json};
use serde::Deserialize;
use uuid::Uuid;

use crate::{error::AppError, extractors::AuthUser, models::Note, response::MessageBody, state::SharedState};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GumrukPayload {
    pub id: Uuid,
    pub user: String,
    pub gumruk_bilgi: String,
    pub gumruk_bilgi_tarihi: Option<i64>,
}

// @route PATCH /gumruk
pub async fn gumruk_note(
    _user: AuthUser,
    State(state): State<SharedState>,
    Json(payload): Json<GumrukPayload>,
) -> Result<Json<MessageBody>, AppError> {
    if payload.user.is_empty() || payload.gumruk_bilgi.is_empty() {
        return Err(AppError::BadRequest("Tüm alanları doldurun".to_string()));
    }

    let note: Option<Note> = sqlx::query_as("SELECT * FROM notes WHERE id = $1")
        .bind(payload.id)
        .fetch_optional(&state.db)
        .await?;

    let note = note.ok_or_else(|| AppError::BadRequest("Araç Bulunamadı".to_string()))?;

    sqlx::query(
        "UPDATE notes SET gumruk_yapan = $1, gumruk_bilgi = $2, gumruk_bilgi_tarihi = $3 WHERE id = $4",
    )
    .bind(&payload.user)
    .bind(&payload.gumruk_bilgi)
    .bind(payload.gumruk_bilgi_tarihi)
    .bind(payload.id)
    .execute(&state.db)
    .await?;

    // Aynı `.title` bug'ı burada da vardı -- Ders 10/11'de kurduğumuz
    // kuralla tutarlı şekilde `{message}` + gerçek `dorse` kullanıyoruz.
    Ok(Json(MessageBody::new(format!(
        "'{}' güncellendi",
        note.dorse
    ))))
}
