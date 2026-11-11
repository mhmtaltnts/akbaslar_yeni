use axum::{
    routing::{get, post},
    Router,
};

use crate::{handlers, middleware::login_rate_limiter, state::SharedState};

// routes/authRoutes.js'in karşılığı. `main.rs`'te `.nest("/auth", ...)` ile
// bağlanacak -- Express'teki `app.use('/auth', require('./routes/authRoutes'))`
// ile birebir aynı fikir: bir alt-router'ı bir path önekinin altına tak.
pub fn auth_routes(state: SharedState) -> Router<SharedState> {
    Router::new()
        .route("/signup", post(handlers::signup))
        // `router.route('/login').post(loginLimiter, authController.login)`
        // karşılığı: `MethodRouter::layer(...)` sadece BU route+method'u
        // sarıyor, Ders 6'daki ayrı-router+merge numarasına hiç gerek yok --
        // tek bir route'a scoped middleware eklemenin daha kısa yolu buydu.
        .route(
            "/login",
            post(handlers::login).layer(axum::middleware::from_fn_with_state(
                state,
                login_rate_limiter,
            )),
        )
        .route("/me", get(handlers::me))
        .route("/refresh", get(handlers::refresh))
        .route("/logout", post(handlers::logout))
}
