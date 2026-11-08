use axum::{extract::Request, middleware::Next, response::Response};

use crate::logging::log_event;

// middleware/logger.js'teki `logger` middleware'inin karşılığı.
//
// İmzaya dikkat: `(request: Request, next: Next) -> Response`. Bu, Axum'da
// "özel bir middleware" yazmanın standart kalıbı -- Express'teki
// `(req, res, next) => { ...; next(); }` ile satır satır eşleşiyor:
//  - `request`  ~ `req`
//  - `next.run(request).await` ~ `next()` çağrısı (bir sonraki handler'a geç)
//  - geri dönen `Response`     ~ `res`'in kendisi (burada ayrıca mutasyon
//    yerine DÖNÜŞ değeri olarak akıyor)
pub async fn logger(request: Request, next: Next) -> Response {
    let method = request.method().clone();
    let uri = request.uri().clone();
    let origin = request
        .headers()
        .get("origin")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("-")
        .to_string();

    // Node'da `logEvents(...)` çağrılıyor ama await edilmiyordu (fire-and-
    // forget); burada da aynı şekilde `tokio::spawn` ile dosya yazma işini
    // arka plana atıyoruz, isteği bu yüzden bekletmiyoruz.
    tokio::spawn(log_event(
        format!("{method}\t{uri}\t{origin}"),
        "reqLog.log",
    ));

    // `console.log(`${req.method} ${req.path}`)` karşılığı.
    tracing::info!("{method} {}", uri.path());

    // Burada `next.run(request).await` ÇAĞRILMAZSA istek bir sonraki
    // handler'a hiç ulaşmaz -- Express'te `next()` çağırmayı unutmak gibi,
    // ama derleyici bunu unutmana izin vermez: `Response` döndürmek
    // ZORUNDASIN, ve onu elde etmenin yolu genelde bu çağrıdan geçer.
    next.run(request).await
}
