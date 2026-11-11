use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

use axum::{
    extract::Request,
    http::{HeaderName, HeaderValue},
    middleware::Next,
    response::Response,
};

// İstemcinin elindeki access token'daki bilgiler (rol, otopark, otopark adı)
// DB'deki güncel halinden farklıysa yanıta eklenen başlık. İstemci bunu
// görünce token'ı hemen yeniler; böylece SüperAdmin'in yaptığı rol
// değişikliği menülere 15 dakikalık token süresini beklemeden yansır.
pub const AUTH_STALE_HEADER: HeaderName = HeaderName::from_static("x-auth-stale");

// `AuthUser` extractor'ı farkı görünce bunu işaretler; yanıt dönerken bu
// middleware başlığı ekler (extractor yanıta doğrudan dokunamıyor).
#[derive(Clone, Default)]
pub struct AuthStale(Arc<AtomicBool>);

impl AuthStale {
    pub fn mark(&self) {
        self.0.store(true, Ordering::Relaxed);
    }
}

pub async fn auth_stale(mut request: Request, next: Next) -> Response {
    let flag = AuthStale::default();
    request.extensions_mut().insert(flag.clone());
    let mut response = next.run(request).await;
    if flag.0.load(Ordering::Relaxed) {
        response
            .headers_mut()
            .insert(AUTH_STALE_HEADER, HeaderValue::from_static("1"));
    }
    response
}
