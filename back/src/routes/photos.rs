use axum::{
    extract::DefaultBodyLimit,
    routing::{delete, get},
    Router,
};

use crate::{handlers, state::SharedState};

// Otopark fotoğrafları (ana sayfa slaytı). Okuma herkese açık uçlar
// /public altında (bkz. routes/public.rs).
pub fn photo_routes() -> Router<SharedState> {
    Router::new()
        .route(
            "/",
            get(handlers::get_photos)
                .post(handlers::upload_photo)
                // Bir miktar pay: sınırı handler kendi mesajıyla bildirir.
                .layer(DefaultBodyLimit::max(handlers::MAX_PHOTO_BYTES + 64 * 1024)),
        )
        .route("/{id}", delete(handlers::delete_photo))
}
