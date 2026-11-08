use axum::{routing::get, Router};

use crate::{handlers, state::SharedState};

// routes/noteRoutes.js'in karşılığı. Çoklu otoparkla birlikte dört metot da
// korumalı (AuthUser'dan gelen tenant_id gerekli); herkese açık liste
// `/public/parks/{slug}/notes` altına taşındı.
pub fn note_routes() -> Router<SharedState> {
    Router::new().route(
        "/",
        get(handlers::get_all_notes)
            .post(handlers::create_note)
            .patch(handlers::update_note)
            .delete(handlers::delete_note),
    )
}
