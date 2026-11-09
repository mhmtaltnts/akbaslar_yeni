use axum::{routing::get, Router};

use crate::{handlers, state::SharedState};

// Giriş gerektirmeyen, otopark bazlı herkese açık endpoint'ler.
pub fn public_routes() -> Router<SharedState> {
    Router::new()
        .route("/site", get(handlers::get_public_site))
        .route("/parks", get(handlers::get_public_parks))
        .route("/parks/{slug}/notes", get(handlers::get_public_notes))
}
