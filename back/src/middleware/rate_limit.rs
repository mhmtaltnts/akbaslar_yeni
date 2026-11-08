use std::{
    net::SocketAddr,
    time::{Duration, Instant},
};

use axum::{
    extract::{ConnectInfo, Request, State},
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;

use crate::{logging::log_event, state::SharedState};

// middleware/loginLimiter.js'teki ayarların birebir karşılığı.
const WINDOW: Duration = Duration::from_secs(60);
const MAX_ATTEMPTS: u32 = 5;

#[derive(Serialize)]
struct LimitBody {
    message: String,
}

// Dikkat: parametre sırası önemli. `State`/`ConnectInfo` gibi "parça parça"
// extractor'lar önce gelir, sonra TAM `Request`, en sonda `Next`. Axum bunu
// bu sırayla bekliyor çünkü `Request`'i bir kere tükettikten sonra ondan
// başka bir şey çıkaramazsın (body sahipliği devrediyor).
//
// `ConnectInfo<SocketAddr>` Express'teki `req.ip`'nin karşılığı: isteği
// gönderen TCP bağlantısının adresi. Bunun çalışması için `main.rs`'te
// `axum::serve`'e bağlantı bilgisini aktarmamız gerekiyor (az sonra göreceğiz).
pub async fn login_rate_limiter(
    State(state): State<SharedState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    request: Request,
    next: Next,
) -> Response {
    let ip = addr.ip();
    let now = Instant::now();

    // `express-rate-limit`'in varsayılan algoritması "sabit pencere" (fixed
    // window): pencere başladığında sayaç sıfırlanır, pencere süresince her
    // istekte sayaç artar, limit aşılırsa reddedilir. Aşağıdaki blok bunun
    // elle yazılmış hali.
    let allowed = {
        // `.lock().unwrap()`: kilidi al. `unwrap()` burada güvenli çünkü tek
        // panik senaryosu "başka bir thread kilit tutarken panikledi" --
        // bizim kodumuzda kilit tutulan blok çok kısa ve panik atmıyor.
        let mut attempts = state.login_attempts.lock().unwrap();
        let entry = attempts.entry(ip).or_insert((0, now));

        if now.duration_since(entry.1) > WINDOW {
            // Pencere doldu, sıfırdan başla.
            *entry = (1, now);
            true
        } else if entry.0 < MAX_ATTEMPTS {
            entry.0 += 1;
            true
        } else {
            false
        }
    }; // <- Mutex kilidi burada bırakılıyor (scope bitti). Kilidi `await`
       // noktasının ÖNCESİNDE bırakmak önemli: aksi halde bu task beklerken
       // başka hiçbir istek sayaca erişemezdi.

    if allowed {
        next.run(request).await
    } else {
        let method = request.method().clone();
        let uri = request.uri().clone();
        let message =
            "Too many login attempts from this IP, please try again after a 60 second pause"
                .to_string();

        tokio::spawn(log_event(
            format!("Too Many Requests: {message}\t{method}\t{uri}"),
            "errLog.log",
        ));

        (StatusCode::TOO_MANY_REQUESTS, Json(LimitBody { message })).into_response()
    }
}
