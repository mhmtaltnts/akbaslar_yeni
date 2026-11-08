use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    error::AppError,
    extractors::AuthUser,
    models::Note,
    response::{MessageBody, ReplyBody},
    state::SharedState,
};

// @route GET /notes
// Çoklu otoparkla birlikte bu endpoint KORUMALI: hangi otoparkın araçlarının
// listeleneceği token'daki `tenant_id`'den geliyor. Herkese açık liste
// artık `GET /public/parks/{slug}/notes` (bkz. handlers/public.rs).
pub async fn get_all_notes(
    user: AuthUser,
    State(state): State<SharedState>,
) -> Result<Json<Vec<Note>>, AppError> {
    // `sort([['_id', -1]])` Mongo'da "en yeni üstte" demekti çünkü ObjectId
    // zaman sıralı. UUID rastgele olduğu için Ders 10'da eklediğimiz
    // `created_at` sütununa göre sıralıyoruz (bkz. migration 0002).
    //
    // Gümrük memuru birden çok otoparka erişebildiği için listede her aracın
    // hangi parkta olduğu da (`park_name`) gönderiliyor.
    let park_ids = user.park_ids(&state.db).await?;
    let notes: Vec<Note> = sqlx::query_as(
        "SELECT n.*, t.name AS park_name FROM notes n
         JOIN tenants t ON t.id = n.tenant_id
         WHERE n.tenant_id = ANY($1) AND n.cikis_tarihi IS NULL
         ORDER BY n.created_at DESC",
    )
    .bind(&park_ids)
    .fetch_all(&state.db)
    .await?;

    if notes.is_empty() {
        return Err(AppError::NotFound(
            "Parkta Araç Yoktur. Araç Girişi Yapabilirsiniz".to_string(),
        ));
    }

    Ok(Json(notes))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNotePayload {
    pub getiren: String,
    pub dorse: String,
    pub firma: Option<String>,
    pub mal: Option<String>,
    pub giris_tarihi: Option<i64>,
}

// @route POST /notes
pub async fn create_note(
    user: AuthUser,
    State(state): State<SharedState>,
    Json(payload): Json<CreateNotePayload>,
) -> Result<impl IntoResponse, AppError> {
    user.require_not_officer()?;

    // Node tarafındaki alan doğrulama bloğu YORUM SATIRIYDI (devre dışı) --
    // orijinalde de boş/eksik alanlarla devam ediliyordu, biz de aynı
    // şekilde burada ek bir kontrol eklemiyoruz.
    let duplicate: Option<(Uuid,)> =
        // Aynı dorse iki FARKLI otoparkta aynı anda bulunabilir; tekrar
        // kontrolü sadece bu otopark içinde.
        sqlx::query_as(
            "SELECT id FROM notes WHERE tenant_id = $1 AND dorse = $2 AND cikis_tarihi IS NULL",
        )
            .bind(user.tenant_id)
            .bind(&payload.dorse)
            .fetch_optional(&state.db)
            .await?;

    if duplicate.is_some() {
        return Err(AppError::Conflict(
            "Bu dorse plakasıyla daha önce giriş yapıldı, yinelemeye izin verilmiyor."
                .to_string(),
        ));
    }

    sqlx::query(
        "INSERT INTO notes (giris_yapan, getiren, dorse, firma, mal, giris_tarihi, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)",
    )
    .bind(&user.username)
    .bind(&payload.getiren)
    .bind(&payload.dorse)
    .bind(&payload.firma)
    .bind(&payload.mal)
    .bind(payload.giris_tarihi)
    .bind(user.tenant_id)
    .execute(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(MessageBody::new("Yeni kayıt oluşturuldu"))))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateNotePayload {
    pub id: Uuid,
    pub getiren: String,
    pub dorse: String,
    pub firma: Option<String>,
    pub mal: Option<String>,
    pub giris_tarihi: Option<i64>,
    pub guncelleme_tarihi: Option<i64>,
}

// @route PATCH /notes
// Node tarafı `res.json(\`'${updatedNote.dorse}' güncellendi\`)` ile ÇIPLAK
// bir JSON string'i dönüyordu (obje değil). Frontend bu yanıtın içeriğini
// hiç okumuyor (sadece mutation'ın başarılı olup olmadığına bakıyor), o
// yüzden projenin her yerinde kullandığımız tutarlı `{message}` şekline
// normalize ediyoruz.
pub async fn update_note(
    user: AuthUser,
    State(state): State<SharedState>,
    Json(payload): Json<UpdateNotePayload>,
) -> Result<Json<MessageBody>, AppError> {
    user.require_not_officer()?;

    let giris_yapan: Option<Option<String>> =
        sqlx::query_scalar("SELECT giris_yapan FROM notes WHERE id = $1 AND tenant_id = $2")
        .bind(payload.id)
        .bind(user.tenant_id)
        .fetch_optional(&state.db)
        .await?;

    let giris_yapan =
        giris_yapan.ok_or_else(|| AppError::BadRequest("Araç kaydı bulunamadı".to_string()))?;

    // Çalışan sadece kendi girdiği kaydı düzenleyebilir; Kurucu/Yönetici hepsini.
    if !user.is_manager() && giris_yapan.as_deref() != Some(user.username.as_str()) {
        return Err(AppError::Unauthorized(
            "Bu kaydı sadece giriş yapan kullanıcı veya yöneticiler düzenleyebilir".to_string(),
        ));
    }

    sqlx::query(
        "UPDATE notes
         SET guncelleme_yapan = $1, giris_tarihi = $2, guncelleme_tarihi = $3,
             getiren = $4, dorse = $5, firma = $6, mal = $7
         WHERE id = $8 AND tenant_id = $9",
    )
    .bind(&user.username)
    .bind(payload.giris_tarihi)
    .bind(payload.guncelleme_tarihi)
    .bind(&payload.getiren)
    .bind(&payload.dorse)
    .bind(&payload.firma)
    .bind(&payload.mal)
    .bind(payload.id)
    .bind(user.tenant_id)
    .execute(&state.db)
    .await?;

    Ok(Json(MessageBody::new(format!("'{}' güncellendi", payload.dorse))))
}

#[derive(Deserialize)]
pub struct DeleteNotePayload {
    pub id: Uuid,
}

// @route DELETE /notes
pub async fn delete_note(
    user: AuthUser,
    State(state): State<SharedState>,
    Json(payload): Json<DeleteNotePayload>,
) -> Result<Json<ReplyBody>, AppError> {
    user.require_manager()?;

    let note: Option<Note> =
        sqlx::query_as("SELECT * FROM notes WHERE id = $1 AND tenant_id = $2")
        .bind(payload.id)
        .bind(user.tenant_id)
        .fetch_optional(&state.db)
        .await?;

    let note = note.ok_or_else(|| AppError::BadRequest("Araç kaydı bulunamadı".to_string()))?;

    sqlx::query("DELETE FROM notes WHERE id = $1 AND tenant_id = $2")
        .bind(payload.id)
        .bind(user.tenant_id)
        .execute(&state.db)
        .await?;

    // Aynı kozmetik bug (Ders 9'daki deleteUser'la aynı desen): Node
    // `result.dorse`'a bakıyordu ama `deleteOne()` sonucunda `dorse` yok --
    // elimizdeki doğru `note.dorse`'u kullanıyoruz.
    Ok(Json(ReplyBody::new(format!(
        " '{}' dorse numaralı ayıt silindi",
        note.dorse
    ))))
}
