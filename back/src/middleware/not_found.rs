use axum::{
    extract::Request,
    http::{header::ACCEPT, StatusCode},
    response::{Html, IntoResponse, Response},
    Json,
};
use serde::Serialize;

#[derive(Serialize)]
struct NotFoundBody {
    message: String,
}

// server.js'teki son `app.use((req, res) => {...})` 404 handler'ının
// karşılığı: `req.accepts('html'/'json')` ile istemcinin ne istediğine
// göre üç farklı gövde dönüyordu, biz de `Accept` header'ına bakarak aynı
// üç yolu izliyoruz. Axum'da bu bir route değil, `Router::fallback(...)`
// ile kayıt edilen, HİÇBİR route eşleşmediğinde çalışan özel bir handler.
pub async fn not_found(request: Request) -> Response {
    let accept = request
        .headers()
        .get(ACCEPT)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");

    if accept.contains("application/json") {
        (
            StatusCode::NOT_FOUND,
            Json(NotFoundBody {
                message: "404 Not Found".to_string(),
            }),
        )
            .into_response()
    } else if accept.contains("text/html") {
        // `res.sendFile(path.join(__dirname, "views", "404.html"))`
        // karşılığı: dosyayı HER İSTEKTE diskten okuyoruz (derlenmiş
        // binary'nin içine gömmüyoruz) -- böylece sayfayı değiştirmek
        // yeniden derleme gerektirmiyor, Node'daki `sendFile` ile aynı
        // operasyonel davranış.
        match tokio::fs::read_to_string("views/404.html").await {
            Ok(html) => (StatusCode::NOT_FOUND, Html(html)).into_response(),
            Err(err) => {
                tracing::error!("views/404.html okunamadı: {err}");
                (StatusCode::NOT_FOUND, "404 Not Found").into_response()
            }
        }
    } else {
        (StatusCode::NOT_FOUND, "404 Not Found").into_response()
    }
}
