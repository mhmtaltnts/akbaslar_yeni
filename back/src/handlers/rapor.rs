use axum::{
    extract::{Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{error::AppError, extractors::AuthUser, models::Note, response::MessageBody, state::SharedState};

const NOTES_PER_PAGE: i64 = 1000;

#[derive(Deserialize)]
pub struct RaporQuery {
    pub page: Option<i64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Pagination {
    count: i64,
    page_count: i64,
}

#[derive(Serialize)]
pub struct RaporResponse {
    pagination: Pagination,
    notes: Vec<Note>,
}

// @route GET /rapor
// `req.query.page` Node'da STRING geliyordu ama JS'in gevşek tip
// dönüşümü sayesinde aritmetikte sorunsuz çalışıyordu
// (`("2" - 1) * 1000 === 1000`). Rust'ta `Query<RaporQuery>` extractor'ı
// bunu doğrudan `Option<i64>`'e çeviriyor -- tip dönüşümü sihirli değil,
// extractor'ın bir parçası.
pub async fn rapor(
    user: AuthUser,
    State(state): State<SharedState>,
    Query(params): Query<RaporQuery>,
) -> Result<Json<RaporResponse>, AppError> {
    user.require_manager()?;

    let page = params.page.unwrap_or(1).max(1);
    let skip = (page - 1) * NOTES_PER_PAGE;

    let count: i64 =
        sqlx::query_scalar(
            "SELECT COUNT(*) FROM notes WHERE tenant_id = $1 AND cikis_tarihi IS NOT NULL",
        )
            .bind(user.tenant_id)
            .fetch_one(&state.db)
            .await?;

    // Burada `created_at`'e değil, Node'daki gibi gerçek veri alanı
    // `cikis_tarihi`'ye göre sıralıyoruz -- notesController'daki `_id`
    // sıralaması gibi bir "örtük zaman" tuzağı burada YOK, çünkü
    // `cikis_tarihi` zaten anlamlı bir zaman damgası.
    let notes: Vec<Note> = sqlx::query_as(
        "SELECT * FROM notes WHERE tenant_id = $1 AND cikis_tarihi IS NOT NULL
         ORDER BY cikis_tarihi DESC
         LIMIT $2 OFFSET $3",
    )
    .bind(user.tenant_id)
    .bind(NOTES_PER_PAGE)
    .bind(skip)
    .fetch_all(&state.db)
    .await?;

    let page_count = if count <= NOTES_PER_PAGE {
        1
    } else {
        (count as f64 / NOTES_PER_PAGE as f64).ceil() as i64
    };

    Ok(Json(RaporResponse {
        pagination: Pagination { count, page_count },
        notes,
    }))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRaporPayload {
    pub id: Uuid,
    pub dorse: String,
    pub getiren: String,
    pub goturen: Option<String>,
    pub firma: Option<String>,
    pub mal: Option<String>,
    pub giris_tarihi: Option<i64>,
    pub cikis_tarihi: Option<i64>,
    pub gumruk_bilgi: Option<String>,
    pub gumruk_bilgi_tarihi: Option<i64>,
    pub guncelleme_tarihi: Option<i64>,
}

// @route PATCH /rapor
pub async fn update_rapor(
    user: AuthUser,
    State(state): State<SharedState>,
    Json(payload): Json<UpdateRaporPayload>,
) -> Result<Json<MessageBody>, AppError> {
    user.require_manager()?;

    let exists: Option<(Uuid,)> =
        sqlx::query_as("SELECT id FROM notes WHERE id = $1 AND tenant_id = $2")
        .bind(payload.id)
        .bind(user.tenant_id)
        .fetch_optional(&state.db)
        .await?;

    if exists.is_none() {
        return Err(AppError::BadRequest("Kayıt bulunamadı".to_string()));
    }

    sqlx::query(
        "UPDATE notes
         SET guncelleme_yapan = $1, dorse = $2, getiren = $3, goturen = $4, firma = $5,
             mal = $6, giris_tarihi = $7, cikis_tarihi = $8, gumruk_bilgi = $9,
             gumruk_bilgi_tarihi = $10, guncelleme_tarihi = $11
         WHERE id = $12 AND tenant_id = $13",
    )
    .bind(&user.username)
    .bind(&payload.dorse)
    .bind(&payload.getiren)
    .bind(&payload.goturen)
    .bind(&payload.firma)
    .bind(&payload.mal)
    .bind(payload.giris_tarihi)
    .bind(payload.cikis_tarihi)
    .bind(&payload.gumruk_bilgi)
    .bind(payload.gumruk_bilgi_tarihi)
    .bind(payload.guncelleme_tarihi)
    .bind(payload.id)
    .bind(user.tenant_id)
    .execute(&state.db)
    .await?;

    Ok(Json(MessageBody::new(format!(
        "'{}' güncellendi",
        payload.dorse
    ))))
}
