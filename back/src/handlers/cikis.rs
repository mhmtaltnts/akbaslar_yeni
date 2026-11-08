use axum::{extract::State, Json};
use serde::Deserialize;
use uuid::Uuid;

use crate::{error::AppError, extractors::AuthUser, models::Note, response::MessageBody, state::SharedState};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CikisPayload {
    pub id: Uuid,
    pub goturen: String,
    pub cikis_tarihi: Option<i64>,
}

// @route PATCH /cikis
// Node tarafı burada `Note.findById(id)` sonucu null gelirse hiç kontrol
// etmeden `note.cikisYapan = user` yazıyordu -- bu bir TypeError fırlatır,
// catch bloğu yakalar ve ham hata nesnesini client'a sızdırırdı (400 ile).
// Diğer tüm handler'larımızda olduğu gibi burada da "bulunamadı" durumunu
// AÇIKÇA kontrol ediyoruz ve ham hata sızdırmıyoruz.
pub async fn cikis_note(
    user: AuthUser,
    State(state): State<SharedState>,
    Json(payload): Json<CikisPayload>,
) -> Result<Json<MessageBody>, AppError> {
    if payload.goturen.is_empty() {
        return Err(AppError::BadRequest("Tüm alanları doldurun".to_string()));
    }

    let note: Option<Note> =
        sqlx::query_as("SELECT * FROM notes WHERE id = $1 AND tenant_id = $2")
        .bind(payload.id)
        .bind(user.tenant_id)
        .fetch_optional(&state.db)
        .await?;

    let note = note.ok_or_else(|| AppError::BadRequest("Araç kaydı bulunamadı".to_string()))?;

    sqlx::query("UPDATE notes SET cikis_yapan = $1, goturen = $2, cikis_tarihi = $3 WHERE id = $4 AND tenant_id = $5")
        .bind(&user.username)
        .bind(&payload.goturen)
        .bind(payload.cikis_tarihi)
        .bind(payload.id)
        .bind(user.tenant_id)
        .execute(&state.db)
        .await?;

    // Node tarafı `updatedNote.title` diye KULLANILMAYAN bir alana bakıyordu
    // (Note modelinde `title` hiç yok) -- bare string yanıtı zaten frontend
    // tarafından okunmuyordu, projenin her yerinde kullandığımız `{message}`
    // şekline ve gerçek `dorse` değerine normalize ediyoruz.
    Ok(Json(MessageBody::new(format!(
        "'{}' güncellendi",
        note.dorse
    ))))
}
