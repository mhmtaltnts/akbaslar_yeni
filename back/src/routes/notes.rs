use axum::{routing::get, Router};

use crate::{handlers, state::SharedState};

// routes/noteRoutes.js'in karşılığı. Orijinalde `router.use(verifyJWT)`
// SADECE GET route'undan SONRA tanımlıydı -- yani GET herkese açık, POST/
// PATCH/DELETE korumalıydı. Burada bunu router yapısıyla değil, handler
// imzalarıyla ifade ediyoruz: `get_all_notes` AuthUser istemiyor, diğer
// üçü istiyor.
pub fn note_routes() -> Router<SharedState> {
    Router::new().route(
        "/",
        get(handlers::get_all_notes)
            .post(handlers::create_note)
            .patch(handlers::update_note)
            .delete(handlers::delete_note),
    )
}
