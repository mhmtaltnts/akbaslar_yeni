use axum::{routing::get, Router};

use crate::{handlers, state::SharedState};

// Otopark (tenant) yönetimi: sadece SüperAdmin (kontrol handler'larda).
pub fn tenant_routes() -> Router<SharedState> {
    Router::new().route(
        "/",
        get(handlers::get_all_tenants)
            .post(handlers::create_tenant)
            .patch(handlers::update_tenant),
    )
    .route(
        "/officers",
        get(handlers::get_officers).put(handlers::set_officer_parks),
    )
}
