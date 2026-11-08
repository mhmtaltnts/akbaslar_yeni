use axum::{routing::patch, Router};

use crate::{handlers, state::SharedState};

// routes/cikisRoute.js'in karşılığı: tek route, tamamen korumalı.
pub fn cikis_routes() -> Router<SharedState> {
    Router::new().route("/", patch(handlers::cikis_note))
}
