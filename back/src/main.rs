mod config;
mod db;
mod error;
mod extractors;
mod handlers;
mod jwt;
mod logging;
mod middleware;
mod models;
mod response;
mod roles;
mod routes;
mod state;

use std::{net::SocketAddr, sync::Arc};

use axum::{
    extract::{Path, State},
    routing::get,
    Router,
};

use error::AppError;
use models::Note;
use state::{AppState, SharedState};

#[tokio::main]
async fn main() {
    // `tracing_subscriber`'ı başlatmadan `tracing::info!`/`tracing::error!`
    // çağrıları HİÇBİR YERE yazılmaz (sessizce yutulur) -- Node'da
    // `console.log` her zaman "hazır" gelirdi, Rust'ta logging altyapısını
    // açıkça kurman gerekiyor.
    tracing_subscriber::fmt::init();

    // Node'daki `require('dotenv').config()` karşılığı: çalışma dizinindeki
    // `.env` dosyasını okuyup `std::env::var(...)` ile erişilebilir hale getirir.
    // `.ok()`: dosya yoksa (örn. prod'da env değişkenleri sistemden geliyorsa)
    // sessizce devam et, panik atma.
    dotenvy::dotenv().ok();

    let database_url =
        std::env::var("DATABASE_URL").expect("DATABASE_URL .env içinde tanımlı olmalı");

    // connectDB() + mongoose.connection.once('open', ...) karşılığı: bağlantı
    // havuzunu kurup migration'ları çalıştırıyoruz. Bu satır bitmeden
    // server.listen'a geçmiyoruz -- Node'daki "önce DB'ye bağlan, sonra
    // app.listen" sırasının aynısı.
    let pool = db::connect(&database_url).await;

    // Çoklu otopark: yeni otoparkları ekleyebilecek ilk SüperAdmin'i
    // `.env`'den oluştur (sadece o kullanıcı adı henüz yoksa).
    if let (Ok(username), Ok(password)) = (
        std::env::var("SUPERADMIN_USERNAME"),
        std::env::var("SUPERADMIN_PASSWORD"),
    ) {
        db::ensure_super_admin(&pool, &username, &password).await;
    }

    // `std::env::var` bir `Result<String, VarError>` döner (JS'teki gibi
    // `undefined` yok; ya değer vardır ya da açıkça bir hata). `.expect(...)`
    // Err durumunda mesajla birlikte programı durdurur -- zorunlu secret'lar
    // için bu doğru davranış: onlar yoksa server zaten ayağa kalkmamalı.
    let state: SharedState = Arc::new(AppState {
        access_token_secret: std::env::var("ACCESS_TOKEN_SECRET")
            .expect("ACCESS_TOKEN_SECRET .env içinde tanımlı olmalı"),
        refresh_token_secret: std::env::var("REFRESH_TOKEN_SECRET")
            .expect("REFRESH_TOKEN_SECRET .env içinde tanımlı olmalı"),
        db: pool,
        login_attempts: std::sync::Mutex::new(std::collections::HashMap::new()),
    });

    // PORT opsiyonel: yoksa 3500'e düş (`process.env.PORT || 3500` ile aynı fikir).
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3500);

    let app = Router::new()
        // routes/root.js'in karşılığı. Express'te `router.get(['/', '/index',
        // '/index.html'], handler)` tek satırda üç path'i aynı handler'a
        // bağlıyordu; Axum'da `.route()` tek bir path alıyor, o yüzden üç
        // ayrı çağrı gerekiyor.
        .route("/", get(handlers::index))
        .route("/index", get(handlers::index))
        .route("/index.html", get(handlers::index))
        // Ders 5'i doğrulamak için geçici bir route: her AppError
        // varyantının doğru statü kodu + JSON şekli ile döndüğünü görelim.
        .route("/error-check/{kind}", get(error_check))
        // routes/authRoutes.js'in karşılığı: `app.use('/auth', ...)` ile
        // birebir aynı fikir.
        .nest("/auth", routes::auth_routes(state.clone()))
        // routes/userRoutes.js'in karşılığı. Ders 3/4/8'deki `/db-check`,
        // `/model-check`, `/protected-check` geçici route'larının görevini
        // artık bu gerçek endpoint'ler üstleniyor, onları kaldırdık.
        .nest("/users", routes::user_routes())
        // routes/noteRoutes.js'in karşılığı.
        .nest("/notes", routes::note_routes())
        // routes/cikisRoute.js, gumrukRoute.js, raporRoute.js karşılıkları.
        .nest("/cikis", routes::cikis_routes())
        .nest("/gumruk", routes::gumruk_routes())
        .nest("/rapor", routes::rapor_routes())
        // Çoklu otopark: otopark yönetimi (SüperAdmin) ve giriş gerektirmeyen
        // otopark bazlı liste.
        .nest("/tenants", routes::tenant_routes())
        .nest("/public", routes::public_routes())
        // `app.use("/", express.static(path.join(__dirname, "public")))`
        // karşılığı. Projede `public/` altında tek şey var: `css/style.css`
        // (views/index.html ve 404.html ona `css/style.css` diye göreli bir
        // yoldan bakıyor). Genel bir `ServeDir` + fallback-zinciri kurmak
        // yerine, gerçekte var olan TEK alt dizini -- `/css` -- doğrudan
        // bağlıyoruz; bu, projenin bugünkü içeriği için tam karşılık, daha
        // basit. `public/`e yeni bir üst düzey klasör eklenirse buraya
        // bir `.nest_service(...)` satırı daha eklenir.
        .nest_service("/css", tower_http::services::ServeDir::new("public/css"))
        // server.js'teki son `app.use((req,res)=>{...})` 404 handler'ının
        // karşılığı: hiçbir route eşleşmezse bu çalışır.
        .fallback(middleware::not_found)
        // Router'a state'i bildiriyoruz; State<SharedState> isteyen her
        // handler artık buna erişebilir.
        .with_state(state)
        // CORS, Express'teki `app.use(cors(corsOptions))` ile aynı yerde:
        // her isteğe uygulanan bir ara katman (middleware yerine Axum'da
        // buna "layer" deniyor, Tower ekosisteminden geliyor).
        .layer(config::build_cors_layer())
        // ÖNEMLİ: Tower'da `.layer()` çağrıları İÇTEN DIŞA değil, soncadan
        // eklenen EN DIŞTA olacak şekilde sarar (Express'in "üstten alta,
        // yazdığın sıra = çalışma sırası" mantığının TERSİ). Express'te
        // `app.use(logger)` CORS'tan önce yazıldığı için önce çalışıyordu;
        // burada aynı sonucu almak için logger'ı EN SONA ekliyoruz --
        // böylece o en dışta olur ve istek önce ondan geçer.
        .layer(axum::middleware::from_fn(middleware::logger));

    // `ConnectInfo<SocketAddr>` extractor'ının çalışması için Axum'a
    // bağlantının gerçek adresini de iletmemiz gerekiyor --
    // `into_make_service_with_connect_info` bunun için var.
    let listener = tokio::net::TcpListener::bind(("0.0.0.0", port))
        .await
        .unwrap();

    println!("Server running on port {port}");

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .unwrap();
}

// Dönüş tipi `Result<&'static str, AppError>`. Bu imza tek başına şunu
// söylüyor: "bu handler ya düz metin döner ya da bir AppError" -- Express'te
// bir handler'ın hangi hataları fırlatabileceğini imzadan ANLAMAK mümkün
// değildi, çalışırken görürdün. `?` operatörü `Err` ile karşılaşınca
// fonksiyondan HEMEN erken çıkıp hatayı olduğu gibi yukarı (Axum'a) iletir --
// Node'daki `return next(err)` ile aynı fikir, ama manuel değil.
async fn error_check(
    State(state): State<SharedState>,
    Path(kind): Path<String>,
) -> Result<&'static str, AppError> {
    match kind.as_str() {
        "bad-request" => return Err(AppError::BadRequest("örnek 400".into())),
        "unauthorized" => return Err(AppError::Unauthorized("örnek 401".into())),
        "forbidden" => return Err(AppError::Forbidden("örnek 403".into())),
        "not-found" => return Err(AppError::NotFound("örnek 404".into())),
        "conflict" => return Err(AppError::Conflict("örnek 409".into())),
        "internal" => return Err(AppError::Internal("örnek 500".into())),
        _ => {}
    }

    if kind == "db" {
        // Hiçbir satıra denk gelmeyen bir sorgu: `fetch_one` boş sonuçta
        // `sqlx::Error::RowNotFound` döner. Sonundaki `?`, bunu otomatik
        // olarak `AppError::NotFound`'a çevirip erken döner --
        // `From<sqlx::Error> for AppError` implementasyonumuzu gerçek bir
        // DB sorgusu üzerinden test ediyoruz.
        sqlx::query_as::<_, Note>("SELECT * FROM notes WHERE false")
            .fetch_one(&state.db)
            .await?;
    }

    Ok("dene: bad-request | unauthorized | forbidden | not-found | conflict | internal | db")
}
