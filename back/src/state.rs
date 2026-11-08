use std::{
    collections::HashMap,
    net::IpAddr,
    sync::{Arc, Mutex},
    time::Instant,
};

use sqlx::SqlitePool;

// Express'te her handler'ın `req`/`res` dışında env secret'lara vs. erişmesi
// kolaydı çünkü hepsi modül seviyesinde `process.env` ile her yerden okunabilir.
// Axum'da handler'lar arasında veri paylaşmak için bunu AÇIKÇA bir "state"
// struct'ında topluyoruz ve Router'a bildiriyoruz.
//
// Artık `#[derive(Clone)]` YOK: `Mutex<T>` klonlanamaz (iki kopya aynı kilidi
// tutamaz), ve zaten hiçbir yerde `AppState`'in kendisini klonlamıyoruz --
// `State<SharedState>` extractor'ı `Arc<AppState>`'i klonluyor, bu da sadece
// bir işaretçi kopyası (referans sayacı +1), AppState'in İÇİNİ hiç etkilemiyor.
pub struct AppState {
    pub access_token_secret: String,
    pub refresh_token_secret: String,
    // SqlitePool kendi içinde zaten Arc ile paylaşımlı; .clone() ucuz.
    pub db: SqlitePool,
    // middleware/loginLimiter.js'teki rate limit sayaçlarının karşılığı:
    // IP başına (deneme sayısı, pencerenin başladığı an). `express-rate-limit`
    // bunu kendi içinde bir Map ile tutuyordu; biz de aynısını elle yapıyoruz.
    //
    // Neden Mutex? Aynı AppState'e (Arc üzerinden) birden fazla istek AYNI
    // ANDA erişebilir (Tokio çoklu görevi paralel çalıştırır). JS'te tek
    // thread olduğu için böyle bir yarış durumu imkansızdı; Rust'ta paylaşılan
    // MUTABLE veriye eşzamanlı erişim derleme zamanında YASAKTIR -- `Mutex`,
    // "aynı anda sadece bir task bu kilidi tutabilir" garantisini verip bunu
    // mümkün kılıyor. `.lock()` kilidi alır, scope bitince otomatik bırakılır.
    pub login_attempts: Mutex<HashMap<IpAddr, (u32, Instant)>>,
}

// Neden Arc<AppState> ve düz AppState değil?
// Her istek kendi async task'ında çalışır ve handler'lar state'in bir
// kopyasını alır (State<S> extractor'ı S: Clone ister). AppState içindeki
// String'leri her istekte gerçekten kopyalamak istemeyiz. Arc (Atomic
// Reference Counted) bir "paylaşımlı, referans sayılı işaretçi": .clone()
// çağrıldığında veri kopyalanmaz, sadece referans sayacı bir artar — JS'teki
// bir objeyi birden fazla yere referans olarak vermeye çok benzer, farkı
// Rust'ın bunu tipte açıkça göstermesi.
pub type SharedState = Arc<AppState>;
