use axum::{routing::get, Router};

use crate::{handlers, state::SharedState};

// routes/userRoutes.js'in karşılığı. Node'da `router.use(verifyJWT)`
// YORUM SATIRIYDI (devre dışı) -- Rust tarafında bunu bilerek AKTİF
// ediyoruz: her handler imzasına eklediğimiz `_user: AuthUser` parametresi
// sayesinde `/users` artık gerçekten korumalı.
pub fn user_routes() -> Router<SharedState> {
    Router::new().route(
        "/",
        get(handlers::get_all_users)
            .post(handlers::create_user)
            .patch(handlers::update_user)
            .delete(handlers::delete_user),
    )
}
