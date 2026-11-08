use axum::http::{HeaderValue, Method};
use tower_http::cors::{AllowHeaders, AllowOrigin, CorsLayer};

use super::allowed_origins::allowed_origins;

// corsOptions.js'teki `origin: (origin, callback) => { ... indexOf ... }`
// mantığının karşılığı. tower-http'de bunu bir "predicate" (true/false
// döndüren fonksiyon) olarak veriyoruz.
pub fn build_cors_layer() -> CorsLayer {
    let origins = allowed_origins();

    CorsLayer::new()
        // Node tarafındaki `credentials: true` (cookie'lerin cross-site
        // gönderilebilmesi için gerekli).
        .allow_credentials(true)
        .allow_methods([Method::GET, Method::POST, Method::PATCH, Method::DELETE])
        // Preflight isteğinde tarayıcının istediği header'ları aynen yansıt.
        .allow_headers(AllowHeaders::mirror_request())
        // `move` burada önemli: closure, `origins` vektörünün SAHİPLİĞİNİ
        // alıyor (JS'teki closure'lar referansla yakalar ve GC bunu yönetir;
        // Rust'ta GC yok, bu yüzden closure'ın neyi ne kadar süre
        // tutacağını -ownership ile- açıkça biz belirtiyoruz).
        .allow_origin(AllowOrigin::predicate(move |origin: &HeaderValue, _| {
            origin
                .to_str()
                .map(|o| origins.contains(&o))
                .unwrap_or(false)
        }))
}
