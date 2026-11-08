use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;

use crate::logging::log_event;

// errorHandler.js'in karşılığı, ama Node'dakinden temel bir farkla:
// Node'da "hata" her zaman tek bir `Error` nesnesiydi, statü kodu ayrıca
// `res.status(x)` ile elle set edilip sonra throw/next(err) edilirdi --
// kod ile statü kodu birbirinden bağımsız iki ayrı yerde yaşıyordu.
// Burada her HATA TÜRÜ kendi statü kodunu enum varyantında taşıyor; bir
// handler `AppError::Conflict(...)` döndürdüğünde 409 olacağını unutmak
// mümkün değil, derleyici seviyesinde bağlı.
#[derive(Debug)]
pub enum AppError {
    BadRequest(String),   // 400 - Tüm alanları doldurun vb.
    Unauthorized(String), // 401 - Yetkisiz / şifre geçersiz
    Forbidden(String),    // 403 - erişim engeli (JWT geçersiz)
    NotFound(String),     // 404 - kayıt bulunamadı
    Conflict(String),     // 409 - zaten var (duplicate)
    Internal(String),     // 500 - beklenmeyen hata
}

// errorHandler.js'in gönderdiği `{ message, isError: true }` şekli. Burada
// `isError` SADECE gerçekten beklenmedik (Internal/500) hatalarda `true`;
// controller'ların bilerek döndürdüğü 400/401/403/404/409'larda `false`.
// Bu, Node'daki orijinalden küçük ve BİLİNÇLİ bir fark: orijinalde explicit
// controller hataları hiç `isError` alanı taşımıyordu, biz her hata
// yanıtında TUTARLI bir şekil istedik. Frontend zaten sadece `message`
// alanına bakıyor, bu ek alanı görmezden gelecektir.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ErrorBody {
    message: String,
    is_error: bool,
}

// Bu trait implementasyonu Axum'a "bir AppError, bir HTTP Response'a nasıl
// çevrilir" öğretiyor. Bunu bir kere yazdıktan sonra her handler'da
// `Result<T, AppError>` döndürmek yeterli -- `Err(...)` geldiğinde Axum
// otomatik olarak bunu çağırıp doğru statü + JSON body'yi üretiyor. Express'te
// buna en yakın şey `next(err)` çağırıp merkezi errorHandler'a güvenmekti;
// farkı, burada hangi hatanın hangi yanıta döneceği TİPTE görünür ve
// derleyici kontrol eder.
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message, is_error) = match self {
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg, false),
            AppError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, msg, false),
            AppError::Forbidden(msg) => (StatusCode::FORBIDDEN, msg, false),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg, false),
            AppError::Conflict(msg) => (StatusCode::CONFLICT, msg, false),
            AppError::Internal(msg) => {
                tracing::error!("{msg}");
                // Node'daki errorHandler.js HER hatayı (400'ler dahil)
                // errLog.log'a yazıyordu. Bilinçli bir fark: burada SADECE
                // gerçekten beklenmedik (500) hataları dosyaya yazıyoruz --
                // 400/401/403/404/409'lar zaten "beklenen, ele alınmış"
                // durumlar, her birini dosyaya basmak günlüğü gürültüyle
                // doldurur. `into_response` senkron bir fonksiyon, `log_event`
                // ise async; `tokio::spawn` ile Node'daki "logEvents(...)
                // çağır ama await'leme" (fire-and-forget) davranışının
                // aynısını elde ediyoruz.
                tokio::spawn(log_event(format!("Internal: {msg}"), "errLog.log"));
                (StatusCode::INTERNAL_SERVER_ERROR, msg, true)
            }
        };

        (status, Json(ErrorBody { message, is_error })).into_response()
    }
}

// Node tarafında bir controller `try { ... } catch (error) { res.json({error}) }`
// yazıp ham veritabanı hatasını client'a sızdırabiliyordu (notesController,
// gumrukController vb. bunu yapıyor). Burada `?` operatörünü kullanabilmek
// için sqlx::Error -> AppError dönüşümünü BİR KERE tanımlıyoruz; sonrasında
// her handler'da `.fetch_one(&pool).await?` yazmak yeterli, hata otomatik
// AppError'a çevrilir ve client'a asla ham DB hatası sızmaz (detay sadece
// sunucu loguna gider).
impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        match err {
            // fetch_one() satır bulamazsa bu hatayı döner -- "kayıt
            // bulunamadı" durumumuzla birebir eşleşiyor.
            sqlx::Error::RowNotFound => AppError::NotFound("Kayıt bulunamadı".to_string()),
            other => {
                tracing::error!("db hatası: {other}");
                AppError::Internal("Sunucu hatası".to_string())
            }
        }
    }
}

// Ders 12: `views/index.html` / `views/404.html` dosyalarını `tokio::fs`
// ile okuyan handler'larda `?` kullanabilmek için.
impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        tracing::error!("dosya okunamadı: {err}");
        AppError::Internal("Sunucu hatası".to_string())
    }
}

// Ders 14: birim testler. `#[cfg(test)]` bu modülü NORMAL `cargo build`'e
// hiç dahil etmiyor -- sadece `cargo test` çalıştırıldığında derleniyor.
// Burada DB/ağ YOK, saf fonksiyon davranışı test ediliyor: `cargo test`
// birkaç saniyede biter.
#[cfg(test)]
mod tests {
    use super::*;

    // Bir `Response`'un JSON body'sini test içinde okumak için küçük bir
    // yardımcı: `axum::body::to_bytes` body'yi async olarak tüketiyor.
    async fn body_json(response: Response) -> serde_json::Value {
        let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("body okunamadı");
        serde_json::from_slice(&bytes).expect("geçerli JSON değil")
    }

    #[tokio::test]
    async fn bad_request_401_409_404_403_is_error_false_dondurur() {
        for (err, expected_status) in [
            (
                AppError::BadRequest("x".to_string()),
                StatusCode::BAD_REQUEST,
            ),
            (
                AppError::Unauthorized("x".to_string()),
                StatusCode::UNAUTHORIZED,
            ),
            (AppError::Forbidden("x".to_string()), StatusCode::FORBIDDEN),
            (AppError::NotFound("x".to_string()), StatusCode::NOT_FOUND),
            (AppError::Conflict("x".to_string()), StatusCode::CONFLICT),
        ] {
            let response = err.into_response();
            assert_eq!(response.status(), expected_status);
            let body = body_json(response).await;
            assert_eq!(body["message"], "x");
            assert_eq!(body["isError"], false);
        }
    }

    #[tokio::test]
    async fn internal_500_is_error_true_dondurur() {
        let response = AppError::Internal("patladı".to_string()).into_response();
        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
        let body = body_json(response).await;
        assert_eq!(body["isError"], true);
    }

    #[test]
    fn row_not_found_not_found_a_eslenir() {
        let err: AppError = sqlx::Error::RowNotFound.into();
        assert!(matches!(err, AppError::NotFound(_)));
    }
}
