use axum::{routing::patch, Router};

use crate::{handlers, state::SharedState};

// routes/gumrukRoute.js'in karşılığı: tek route, tamamen korumalı.
pub fn gumruk_routes() -> Router<SharedState> {
    Router::new().route("/", patch(handlers::gumruk_note))
}
