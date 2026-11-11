use axum::{routing::get, Router};

use crate::{handlers, state::SharedState};

// routes/raporRoute.js'in karşılığı: GET ve PATCH, ikisi de korumalı.
pub fn rapor_routes() -> Router<SharedState> {
    Router::new()
        .route("/", get(handlers::rapor).patch(handlers::update_rapor))
        // Rapor filtresindeki tüm kayıtları Excel (.xlsx) olarak indirir.
        .route("/export", get(handlers::export_rapor))
}
