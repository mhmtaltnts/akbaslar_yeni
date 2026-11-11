use axum::{
    extract::{Path, State},
    http::HeaderMap,
    Json,
};
use serde::Serialize;
use uuid::Uuid;

use crate::{error::AppError, models::PublicNote, site, state::SharedState};

#[derive(Serialize, sqlx::FromRow)]
pub struct PublicPark {
    pub name: String,
    pub slug: String,
    pub address: Option<String>,
}

// @route GET /public/parks
// Herkese açık "Misafir Araçlar" sayfasındaki otopark seçimi için.
pub async fn get_public_parks(
    State(state): State<SharedState>,
) -> Result<Json<Vec<PublicPark>>, AppError> {
    let parks: Vec<PublicPark> = sqlx::query_as(
        "SELECT name, slug, address FROM tenants WHERE active ORDER BY name",
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(parks))
}

// @route GET /public/site
// Sitenin açıldığı alan adının otoparkı (yoksa null): misafir ana sayfası
// şifresiz olarak bu otoparkı gösterir.
pub async fn get_public_site(
    State(state): State<SharedState>,
    headers: HeaderMap,
) -> Result<Json<Option<PublicPark>>, AppError> {
    let Some(host) = site::request_host(&headers) else {
        return Ok(Json(None));
    };
    let park: Option<PublicPark> = sqlx::query_as(
        "SELECT name, slug, address FROM tenants WHERE domain = ?1 AND active",
    )
    .bind(host)
    .fetch_optional(&state.db)
    .await?;

    Ok(Json(park))
}

// @route GET /public/parks/{slug}/notes
// Eski herkese açık `GET /notes`'un otoparka özel hali.
pub async fn get_public_notes(
    State(state): State<SharedState>,
    Path(slug): Path<String>,
) -> Result<Json<Vec<PublicNote>>, AppError> {
    let tenant_id: Option<Uuid> =
        sqlx::query_scalar("SELECT id FROM tenants WHERE lower(slug) = lower(?1) AND active")
            .bind(&slug)
            .fetch_optional(&state.db)
            .await?;

    let tenant_id =
        tenant_id.ok_or_else(|| AppError::NotFound("Otopark bulunamadı".to_string()))?;

    let notes: Vec<PublicNote> = sqlx::query_as(
        "SELECT id, getiren, dorse, firma, giris_tarihi FROM notes
         WHERE tenant_id = ?1 AND cikis_tarihi IS NULL
         ORDER BY created_at DESC",
    )
    .bind(tenant_id)
    .fetch_all(&state.db)
    .await?;

    if notes.is_empty() {
        return Err(AppError::NotFound("Parkta Araç Yoktur".to_string()));
    }

    Ok(Json(notes))
}
