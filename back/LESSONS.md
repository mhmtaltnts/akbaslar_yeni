# Node → Rust Çeviri Günlüğü

`back/` (Express + Mongoose) backend'ini `back-rust/` (Axum + sqlx/Postgres) olarak
adım adım yeniden yazıyoruz. Her ders küçük bir parça, bir kavram ve çalışan bir
sonuç içerir. Bitince burada işaretliyoruz.

Stack kararları:
- Web framework: **Axum**
- Async runtime: **Tokio**
- Veritabanı: **Postgres** + **sqlx** (Mongo'dan geçiş, şema aşağıda tasarlanacak)
  → Sonradan **SQLite**'a geçildi (bkz. Ders 15).
- Auth: **jsonwebtoken** + **bcrypt** (Node tarafındakiyle birebir eşdeğer)

## Ders Listesi

- [x] **1. İskelet** — `cargo new`, `Cargo.toml` tanıtımı, minimal Axum sunucusu
      (`tokio::main`, `Router`, handler fonksiyonu, `axum::serve`).
- [x] **2. Config katmanı** — `.env` okuma (`dotenvy`), CORS whitelist
      (`allowedOrigins.js` karşılığı), paylaşılan `AppState` (`Arc`, `Clone` kavramı).
- [x] **3. Veritabanı** — Postgres'e bağlanma (`sqlx::PgPool`), `users` ve `notes`
      tabloları için migration, Mongo şemasından Postgres şemasına geçiş kararları.
- [x] **4. Modeller** — `User`/`Note` struct'ları, `serde::{Serialize,Deserialize}`,
      `sqlx::FromRow`, `Option<T>` ile nullable alanlar.
- [x] **5. Hata yönetimi** — `AppError` enum'u ve `IntoResponse` trait'i
      (Express'teki `errorHandler.js` karşılığı, ama merkezi ve tip-güvenli).
- [x] **6. Ara katmanlar (middleware)** — request logger (`tracing`), CORS layer,
      404 fallback, login rate limiter.
- [x] **7. Auth** — signup/login/refresh/logout: `bcrypt` hash/verify, JWT üretimi,
      `httpOnly` cookie (refresh token).
- [x] **8. JWT doğrulama extractor'ı** — Axum'da "middleware" yerine kullanılan
      `FromRequestParts` kavramı; `verifyJWT.js` karşılığı.
- [x] **9. Users CRUD** — `usersController.js` → Rust handler'ları.
- [x] **10. Notes CRUD** — `notesController.js` → Rust handler'ları.
- [x] **11. cikis / gumruk / rapor** — Note'a özel kısmi güncellemeler + sayfalama.
- [x] **12. Statik dosyalar & 404 sayfası** — `tower-http` `ServeDir` + fallback.
- [x] **13. Uçtan uca bağlama** — hepsini `main.rs`'te birleştirip frontend'e
      karşı test etme.
- [x] **14. (Bonus)** `sqlx::query_as!` compile-time kontrollü sorgular, testler.

## Ders 1 Notları

- `#[tokio::main]` → async runtime'ı başlatan normal `fn main`'e dönüşen bir macro.
  Node'da event loop hazır gelir (V8 içinde); Rust'ta Tokio ile kendimiz kurarız.
- `Router::new().route("/", get(handler))` ≈ `app.get("/", handler)`.
- Bir handler, dönüş tipi `IntoResponse` trait'ini uygulayan herhangi bir
  `async fn`'dir. `&'static str` bunu zaten uyguluyor.
- `TcpListener::bind(...).await` + `axum::serve(listener, app).await` ≈
  Express'teki `app.listen(PORT, cb)`.

Çalıştırmak için: `cd back-rust && cargo run` → `curl http://localhost:3500/`

## Ders 2 Notları

- `src/config/` altında `allowed_origins.rs` + `cors.rs` + `mod.rs`: Node'daki
  `require('./x')` karşılığı Rust'ta dosya başına bir `mod` bildirimi.
- `AppState` (`src/state.rs`): handler'lar arası paylaşılan veri (secret'lar,
  ileride DB pool). `Arc<AppState>` kullanıyoruz çünkü Rust'ta GC yok — veriyi
  birden fazla yerde "ucuza" paylaşmanın yolu referans sayılı işaretçi (Arc).
  `.clone()` veri kopyalamaz, sadece sayaç artar.
- `dotenvy::dotenv()` + `std::env::var(...).expect(...)`: zorunlu secret
  eksikse uygulama **açılışta** çöker (Node'da da genelde böyle olması
  gerekirdi, ama JS sessizce `undefined` ile devam edebiliyordu — Rust'ta
  `Result` bunu gizlemeyi imkansız kılıyor).
- `CorsLayer` + `AllowOrigin::predicate(move |origin, _| ...)`: `corsOptions.js`
  karşılığı. **Fark:** Node'daki `cors` paketi izinsiz origin'de middleware
  zincirini `Error` ile kesip genelde 500 döndürür; tower-http'de istek yine
  işlenir, sadece `Access-Control-Allow-Origin` header'ı eklenmez. Sonuç
  tarayıcı için aynıdır (JS isteği okuyamaz), ama `curl`/Postman gibi
  doğrudan araçlarla içerik yine görülebilir. CORS zaten bir güvenlik duvarı
  değil, gerçek erişim kontrolü Ders 7-8'deki JWT katmanında.
- Test: izinli origin → `access-control-allow-origin` header'ı var; izinsiz
  origin → yok. İkisini de `curl -H "Origin: ..."` ile doğruladık.

## Ders 3 Notları

- **Şema kararları** (Mongo → Postgres): `id` artık `UUID DEFAULT gen_random_uuid()`
  (PG16'da çekirdek fonksiyon, extension gerekmiyor); `roles` Mongo dizisinden
  Postgres `TEXT[]`'e; case-insensitive `username` eşsizliği için
  `UNIQUE INDEX ON (lower(username))` (citext extension'ı yerine); `*Tarihi`
  alanları `BIGINT` olarak kaldı çünkü frontend bunları epoch sayı olarak
  gönderip okuyor, tipini değiştirip frontend'i bozmayalım.
- `docker-compose.yml`: yerel Postgres, port **5434** (bu makinede zaten
  5432/5433'te başka projelerin konteynerleri çalıştığı için çakışmasın diye).
  `docker compose up -d` ile başlatılıyor.
- `migrations/0001_init.sql` + `sqlx::migrate!("./migrations")`: Node'da
  migration kavramı yoktu (Mongoose şema zorlamasız); Postgres'e geçince bu
  SQL dosyaları programın İÇİNE gömülüyor ve açılışta otomatik çalışıyor.
  Hangi migration'ların uygulandığı `_sqlx_migrations` tablosunda tutuluyor —
  `\dt` ile `users`, `notes`, `_sqlx_migrations` tablolarını gördük.
- `PgPool`, Mongoose'un tek bağlantısı yerine bir **bağlantı havuzu**; `AppState`
  artık `db: PgPool` tutuyor, `State<SharedState>` extractor'ıyla her handler'a
  enjekte ediliyor.
- Doğrulama için geçici `/db-check` route'u eklendik (`SELECT COUNT(*) FROM users`
  çalıştırıp sonucu döndürüyor) — Ders 9'da gerçek users endpoint'i gelince
  kaldıracağız.
- **Bir hata ve çıkarılan ders:** Bash araçlarında `cd` ile dizin değiştirip
  sonraki komutta `cat > main.rs` gibi göreli yol kullanmak, oturumlar arası
  `cwd` her zaman kalıcı olmadığı için dosyayı YANLIŞ dizine (`back-rust/`
  kökü, `src/` değil) yazdırdı; derleme sessizce eski `main.rs`'i kullanmaya
  devam etti. Bundan sonra dosya yazarken hep **tam/absolute yol** kullanıyoruz.

## Ders 4 Notları

- `src/models/{user.rs,note.rs,mod.rs}`: `User`/`Note` struct'ları. Aynı
  struct üzerinde iki bağımsız derive var: `Serialize`/`Deserialize` (serde,
  JSON için) ve `FromRow` (sqlx, DB satırı için). Her biri kendi dünyasında
  yaşıyor:
  - `#[serde(rename_all = "camelCase")]` → DB sütunu `gumruk_bilgi`
    (snake_case) iken JSON'da `gumrukBilgi` (camelCase) çıkıyor. `FromRow`
    bundan habersiz, her zaman struct alan adıyla (snake_case) sütun eşler.
  - `#[serde(skip_serializing)]` → `password` alanı JSON çıktısına hiçbir
    zaman yazılmıyor (Node'daki `.select('-password')` disiplinini manuel
    tekrar etmek yerine derleyici garantisi).
  - `Option<String>` / `Option<i64>` → SQL `NULL` karşılığı, ekstra attribute
    gerekmiyor; hem okurken (`FromRow`) hem yazarken (`query().bind(...)`)
    otomatik çalışıyor.
- Önemli düzeltme: `serde` paketi `sqlx`/`axum` üzerinden DOLAYLI olarak zaten
  proje grafiğindeydi ama `derive` feature'ı açık değildi; bu yüzden
  `#[serde(...)]` attribute'u derleyici tarafından tanınmadı. `cargo add serde
  --features derive` ile düzelttik. **Çıkarılan ders:** bir crate'i kendi
  kodunda DOĞRUDAN kullanıyorsan (burada `serde::{Serialize, Deserialize}`),
  onu kendi `Cargo.toml`'unda da açıkça bağımlılık olarak listelemek lazım —
  transitif olarak gelmesi her zaman yetmez (özellikle feature flag'ler için).
- Geçici `/model-check` route'u ile gerçek bir INSERT...RETURNING yapıp
  sonucu JSON'a çevirdik: `password` yoktu, `roles` dizi geldi, tüm alanlar
  camelCase'di, `Option` alanlar `null` çıktı. Test verisini sildik.

## Ders 5 Notları

- `src/error.rs`: `AppError` enum'u (`BadRequest`/`Unauthorized`/`Forbidden`/
  `NotFound`/`Conflict`/`Internal`, hepsi `(String)` taşıyor) + bunun için
  `IntoResponse` implementasyonu. Her varyant kendi statü kodunu enum'da
  taşıyor; Node'da statü kodu (`res.status(x)`) ile hata mesajı birbirinden
  bağımsız iki ayrı satırda yaşıyordu, burada ikisi tek bir değerde birleşti.
- Handler imzası artık `Result<T, AppError>` olabiliyor. `Err(...)` dönünce
  Axum otomatik `AppError::into_response()`'u çağırıyor -- Node'daki
  `next(err)` + merkezi `errorHandler.js`'in otomatik/tip-güvenli hali.
- `impl From<sqlx::Error> for AppError`: `?` operatörünün bir sqlx sorgusu
  üzerinde doğrudan çalışmasını sağlıyor (`query(...).fetch_one(&pool).await?`).
  `sqlx::Error::RowNotFound` özel olarak `AppError::NotFound`'a eşleniyor,
  diğer tüm DB hataları `AppError::Internal`'a düşüyor ve DETAY SADECE sunucu
  konsoluna yazılıyor -- Node tarafındaki `res.json({error})` gibi ham DB
  hatasının client'a sızmasını (notesController/gumrukController'da olduğu
  gibi) burada tamamen kapattık.
- **Bilinçli küçük fark:** Orijinalde sadece errorHandler.js'in yakaladığı
  gerçek beklenmedik hatalar `isError: true` taşıyordu, controller'ların
  bilerek döndürdüğü 400/401/403/404/409'larda bu alan hiç yoktu. Biz her
  hata yanıtında TUTARLI bir `{ message, isError }` şekli kullanmayı seçtik
  (`isError` sadece 500'de `true`). Frontend zaten sadece `message` alanını
  okuyor, bu ek alanı görmezden gelecek.
- Test: `/error-check/{bad-request|unauthorized|forbidden|not-found|conflict|internal|db}`
  ile her varyantın doğru statü kodu + JSON şekliyle döndüğünü doğruladık;
  `db` kolu gerçek bir `fetch_one` + `?` ile `RowNotFound → 404` dönüşümünü
  test etti; `internal` kolu sunucu konsoluna `[INTERNAL ERROR]` yazdı.
- Not: `errLog.log`'a yazan, `method`/`url`/`origin` bilgisini de içeren
  gerçek dosya-loglama Ders 6'da (ara katmanlar) geliyor; şimdilik `eprintln!`
  ile yetiniyoruz.

## Ders 6 Notları

- `src/logging.rs`: `log_event(message: String, log_file_name: &'static str)`
  — Node'daki `logEvents()`'in tam karşılığı, `logs/<dosya>`'ya
  `yyyyMMdd\tHH:mm:ss\t<uuid>\t<mesaj>` satırı ekliyor. `message` bilerek
  `String` (ödünç değil): `tokio::spawn`'a verilen future `'static` olmak
  zorunda, yani kendi verisinin sahibi olmalı -- bir `&str` kullansaydık,
  spawn edilen task bitmeden çağıran taraftaki geçici `String` silinebilirdi
  ve derleyici bunu reddederdi. Bu dersin en önemli "neden" anı buydu.
- `src/middleware/logger.rs`: özel middleware kalıbı -- `async fn(request:
  Request, next: Next) -> Response`. `next.run(request).await` = Express'in
  `next()`'i. Hem `tracing::info!` (konsol) hem `log_event(..., "reqLog.log")`
  (dosya, `tokio::spawn` ile fire-and-forget) çalıştırıyor.
- `error.rs`/`rate_limit.rs` artık gerçekten `errLog.log`'a yazıyor (Ders
  5'te verdiğimiz sözü tuttuk); sadece 500/429 gibi "gerçekten istisnai"
  durumlar loglanıyor, her 400 değil (Ders 5 notlarındaki bilinçli farkla
  aynı mantık).
- `src/middleware/not_found.rs`: `Router::fallback(...)`, Express'in son
  `app.use((req,res)=>{...})` 404 handler'ının karşılığı. `Accept` header'ına
  göre JSON/HTML/text üç yoldan birini seçiyor; HTML dalı Ders 12'de gerçek
  `views/404.html` dosyasını servis edecek.
- `src/middleware/rate_limit.rs` + `AppState.login_attempts: Mutex<HashMap<IpAddr,
  (u32, Instant)>>`: `loginLimiter.js`'in elle yazılmış hali (60s pencere, IP
  başına 5 istek). **Yeni kavram:** `Mutex`. `AppState` artık `Clone`
  TÜRETMİYOR -- hiç gerek yok, zaten kimse `AppState`'i klonlamıyor, sadece
  dış `Arc<AppState>` klonlanıyor (işaretçi kopyası). `Mutex`, JS'te hiç
  karşılaşmadığın bir sorunu çözüyor: aynı `AppState`'e eşzamanlı erişen
  birden fazla istek (Tokio çoklu görevi paralel çalıştırır) aynı anda
  `HashMap`'i değiştirmeye çalışırsa veri bozulur; `Mutex` "aynı anda sadece
  bir task" garantisi veriyor. Kilidi `await`'den ÖNCE (bloğu kapatarak)
  bırakmak kritik, yoksa bir istek beklerken diğerleri sayaca hiç erişemezdi.
- `route_layer` + ayrı alt-router + `merge`: bir middleware'i TEK bir route'a
  (hepsine değil) uygulamanın yolu. `Router::<SharedState>::new()` ile state
  tipini açıkça yazmak gerekti, yoksa state kullanmayan alt-router'ın tipi
  çıkarılamıyordu.
- `ConnectInfo<SocketAddr>` (= `req.ip`) çalışsın diye `axum::serve`'i
  `app.into_make_service_with_connect_info::<SocketAddr>()`'e çevirdik.
- **Layer sırası — Express'in TERSİ:** Tower'da sonradan eklenen `.layer()`
  en DIŞTA olur (isteği önce o görür). Express'te `app.use(logger)` CORS'tan
  önce yazıldığı için önce çalışıyordu; burada aynı sonucu almak için
  `.layer(cors).layer(logger)` sırasıyla yazdık -- logger'ı EN SONA koyduk ki
  en dışta olsun. Bu, Express'ten gelenler için en kolay tuzak.
- Test: `/` isteğinde konsola `GET /` düştü ve `reqLog.log`'a doğru formatta
  satır yazıldı; `/olmayan-route` üç farklı `Accept` header'ıyla üç farklı
  gövde döndü; `/rate-limit-check`'e 7 istekte ilk 5'i `200`, 6-7. `429` döndü
  ve `errLog.log`'a kayıt düştü.

## Ders 13 Notları

- **En kritik bulgu bu dersteydi.** `client/src/api/{notes,users}ApiSlice.ts`
  içindeki `getNotes`/`getRapor`/`getUsers`, Mongo döneminden kalma
  `item.id = item._id` satırı taşıyor. Bizim API `id` döndürdüğü için bu
  satır `id`'yi `undefined` ile eziyordu; Redux'un `createEntityAdapter`'ı
  (varsayılan `selectId = item => item.id`) bu durumda TÜM kayıtları aynı
  anahtar altında birleştirip listeyi tek kayda düşürürdü -- Notes/Users/
  Rapor listelerinin üçü de etkileniyordu. Sorduk, **backend `_id` döndürsün**
  kararı çıktı: `models/user.rs` ve `models/note.rs`'teki `id` alanına
  `#[serde(rename = "_id")]` eklendi. Frontend'e TEK satır dokunulmadı.
  (`FromRow` bundan habersiz, DB sütunuyla hâlâ `id` adıyla eşleşiyor --
  Ders 4'te kurduğumuz "iki derive, iki bağımsız isimlendirme" ayrımı
  tam burada işe yaradı.)
- Gerçek frontend'i (`client/`) bu backend'e karşı çalıştırdık: `.env`'deki
  `VITE_API_URL=http://localhost:3500` ve vite dev server portu (3000)
  bizim `allowed_origins.rs`'teki `http://localhost:3000` ile zaten
  örtüşüyordu, hiçbir CORS ayarı değiştirmek gerekmedi.
- Tam tarayıcı otomasyonu (gerçek bir Chromium açıp tıklamak) bu ortamda
  MÜMKÜN OLMADI: Linux tarafında kurulu bir tarayıcı yok, Playwright'ın
  Chromium'u indirmesi ağ/TLS kısıtlaması yüzünden başarısız oldu
  (`ERR_TLS_CERT_ALTNAME_INVALID`), sistem Chromium'u `apt`'le kurmak için
  parolasız `sudo` yok. Bunun yerine gerçek frontend kodunun AYNI isteği
  (Origin header, `credentials:include` cookie jar, preflight OPTIONS,
  Bearer token, 403→refresh akışı) birebir `curl` ile simüle edildi --
  hepsi doğru çalıştı. Backend (`:3500`) ve frontend dev server (`:3000`)
  şu an İKİSİ DE çalışır durumda bırakıldı; tarayıcıda `http://localhost:3000`
  açılıp gözle doğrulanabilir.
- Test: CORS preflight (`OPTIONS /auth/login`) doğru header'larla döndü;
  signup→login→not oluştur→listele (`_id` dolu geldi)→refresh akışının
  tamamı `Origin: http://localhost:3000` ile, gerçek cookie jar üzerinden
  çalıştı.

## Ders 14 Notları (Bonus)

- **`sqlx::query_as!` vs `sqlx::query_as`:** Ders 3-11'de hep RUNTIME
  kontrollü `query_as("...")` kullandık -- SQL string'i sadece Postgres'e
  gönderildiğinde doğrulanır. `get_all_users`'ı `query_as!(User, "...")`'e
  çevirdik: bu makro DERLEME ANINDA `.env`'deki `DATABASE_URL` üzerinden
  gerçek Postgres'e bağlanıp sorguyu PREPARE eder, sütun adlarını/tiplerini
  `User` struct'ının alanlarıyla karşılaştırır. `sqlx-cli` kurup `cargo sqlx
  prepare` çalıştırmaya hiç gerek kalmadı -- bu adım sadece DERLEME
  ANINDA CANLI BİR DB'YE ERİŞİMİN OLMADIĞI durumlar (örn. CI, Docker build)
  için gerekli; orada `.sqlx/` altına önceden hazırlanmış sorgu metadata'sı
  commit edilir ve derleyici ona bakar. Bizim geliştirme ortamımızda DB zaten
  `.env`'den erişilebilir olduğu için buna gerek yok.
- **Kanıt:** Sütun adını bilerek `usernam` diye yazıp `cargo build` çalıştırdık
  -- SQL hiç çalışmadan, derleme anında `column "usernam" does not exist`
  hatası aldık (ayrıca alakasız bir rustc incremental-cache ICE'ı tetikledi,
  `cargo clean` ile geçti -- bilinen bir rustc kusuru, sqlx'le ilgisi yok).
  Node'da bu hata ancak o endpoint ÇAĞRILDIĞINDA runtime'da ortaya çıkardı.
- **Birim testler** (`src/error.rs`, `src/jwt.rs` içinde `#[cfg(test)] mod
  tests`): DB/ağ gerektirmiyor. `AppError` varyantlarının doğru statü+body
  ürettiğini, JWT imzala→çöz round-trip'inin çalıştığını ve yanlış secret'la
  çözmenin `Err` (panik değil) döndüğünü doğruladık.
- **Entegrasyon testi** (`src/handlers/users.rs` içinde `#[sqlx::test]`):
  `lower(username)` case-insensitive eşleşmesi gibi GERÇEK DB DAVRANIŞINI
  test etmek için mock yetmez. `#[sqlx::test]`, `.env`'deki sunucuda testin
  kendi tek-kullanımlık veritabanını oluşturup migration'ları çalıştırıyor,
  test bitince siliyor -- dev veritabanımıza (`akbaslar_postgres`) hiç
  dokunmuyor, testler birbirinden izole.
- Rust'ta `tests/` klasörü (gerçek "entegrasyon testi" dizini) sadece bir
  KÜTÜPHANE (`lib.rs`) hedefinden modül import edebilir; bizim proje sadece
  `main.rs` (binary) olduğu için bu klasörü kullanmadık. Bunun yerine
  testleri modüllerin İÇİNE `#[cfg(test)] mod tests` olarak koyduk --
  binary crate'lerde `cargo test` bunu sorunsuz çalıştırır, `lib.rs`'e
  bölmeye gerek yok.
- `cargo test` ile tüm 8 test (`error`: 3, `jwt`: 3, `handlers::users`: 2)
  geçti.

## Ders 7 Notları

- Dizin yapısını Node'la birebir eşledik: `src/handlers/auth.rs` (=
  `controllers/authController.js`, iş mantığı) + `src/routes/auth.rs` (=
  `routes/authRoutes.js`, sadece route bağlama). `main.rs`'te
  `.nest("/auth", routes::auth_routes(state.clone()))` = Express'teki
  `app.use('/auth', require('./routes/authRoutes'))`.
- `MethodRouter::layer(...)`: `post(handlers::login).layer(from_fn_with_state(...))`
  ile rate limiter'ı SADECE `/auth/login`'e taktık. Bu, Ders 6'daki ayrı-
  router+`merge` numarasından daha kısa bir yol -- tek bir route+method'u
  hedeflerken bunu kullanmak yeterliymiş.
- JWT claim'leri: access token `{ UserInfo: { id, fullname, roles }, exp }`,
  refresh token `{ username, fullname, exp }`. `#[serde(rename = "UserInfo")]`
  KRİTİK: frontend token'ı çözüp tam bu anahtar adını okuyabilir, Rust'ın
  normal isimlendirme kurallarına bırakılamaz.
- Node'daki `{ expiresIn: '15m' }` kısayolu yok; `exp`'i `chrono::Utc::now() +
  Duration::minutes(15)` ile KENDİMİZ hesaplayıp claims'e koyduk -- daha
  satır ama ne olduğu tamamen açık.
- **Bilinçli korunan tutarsızlık:** signup'taki duplicate kontrolü
  case-insensitive (`lower(username)`), ama login sorgusu Node'daki gibi
  CASE-SENSITIVE (`WHERE username = $1`). Bu muhtemelen orijinalin
  istemeden yaptığı bir tutarsızlık ama frontend'in davranışını bozmamak
  için birebir koruduk.
- **Build sırasında çıkan gerçek bir hata:** `jsonwebtoken` 11.x artık
  pluggable bir kripto backend'i istiyor (`rust_crypto` ya da `aws_lc_rs`).
  Hiçbirini seçmeden derleyince program derlendi ama İLK JWT işleminde
  (`sign`) RUNTIME'DA panikledi: "Could not automatically determine the
  process-level CryptoProvider". `Cargo.toml`'da
  `jsonwebtoken = { version = "11.1.0", default-features = false, features =
  ["rust_crypto"] }` ile düzelttik (saf Rust backend, cmake/clang gerektiren
  `aws_lc_rs`'ten kaçındık). **Çıkarılan ders:** derlenmek her zaman "doğru"
  demek değil -- bazı crate'ler konfigürasyon hatalarını sadece çalışma
  zamanında, belirli bir kod yolu tetiklendiğinde ortaya çıkarıyor.
- Test: signup + case-insensitive duplicate (409), login + `Set-Cookie: jwt=...
  HttpOnly; SameSite=None; Secure` + `accessToken`, cookie ile refresh (yeni
  accessToken), cookie'siz refresh (401), logout (cookie temizleniyor,
  cookie yoksa 204), ve gerçek `/auth/login`'de rate limiter (5 başarısız
  denemeden sonra 429).

## Ders 8 Notları

- Önce bir refactor: JWT claim struct'ları (`UserInfo`/`AccessClaims`/
  `RefreshClaims`) ve imzalama fonksiyonları Ders 7'de `handlers/auth.rs`
  içindeydi; Ders 8'de hem İMZALAYAN (login/refresh) hem ÇÖZEN (yeni
  extractor) tarafın aynı struct'lara ihtiyacı olduğu ortaya çıkınca bunları
  paylaşımlı `src/jwt.rs`'e taşıdık. İkinci kullanıcı ortaya çıkana kadar bu
  ihtiyacı önceden tahmin edip soyutlamaya gerek yoktu -- gerçek projelerde
  refactor genelde böyle, ihtiyaç ortaya çıkınca yapılır.
- `src/extractors/auth_user.rs`: `impl FromRequestParts<SharedState> for
  AuthUser`. Bu, Express'in middleware modelinden FARKLI bir kavram:
  `verifyJWT.js` router'a `router.use(verifyJWT)` ile kaydediliyordu ve
  ONDAN SONRAKİ her route korunuyordu -- korumalı/korumasız ayrımı dosyadaki
  satır SIRASINA bağlıydı. Axum'da bunun yerine bir handler imzasına `user:
  AuthUser` parametresi EKLEMEK o route'u korur; router'da hiçbir şey
  değişmiyor, sıralama derdi yok, ve bir handler'ın korumalı olup olmadığı
  İMZASINDAN okunabiliyor.
- `Rejection = AppError`: `FromRequestParts`'ın hata tipi doğrudan bizim
  hata enum'umuz. Token yoksa/geçersizse handler'ın gövdesi HİÇ ÇALIŞMAZ,
  Axum `AppError`'ı otomatik yanıta çevirir -- `?` operatörünün extractor
  seviyesindeki karşılığı.
- **Gerçek bir bulgu:** `back/middleware/verifyJWT.js` içinde
  `req.user = decoded.UserInfo.username` satırı var ama access token
  payload'ında (`UserInfo: { id, fullname, roles }`) `username` diye bir
  alan hiç yok -- yani orijinalde `req.user` hep `undefined`'dı. Üstelik
  `grep` ile kontrol ettik: `req.user`/`req.roles` tüm backend'de hiçbir
  controller tarafından okunmuyor, tamamen ölü kod. Bunu aynen taşımak
  yerine, token'da gerçekten var olan bilgiyi (`id`, `fullname`, `roles`)
  düzgün bir `AuthUser` struct'ında sunduk -- bozuk/kullanılmayan bir alanı
  sadık kalmak adına tekrar üretmenin anlamı yoktu.
- Test: `/protected-check`'e header'sız istek → 401 "Yetkiniz Yok";
  uydurma token → 403 "Erişim Engeli Var"; gerçek signup+login'den alınan
  geçerli token → 200, `{id, fullname, roles}` (`password` yok, çünkü zaten
  JWT payload'ında hiç yoktu).

## Ders 9 Notları

- Başlamadan iki gerçek sorun bulduk ve ikisini de kullanıcıya sorup
  yönlendirme aldık:
  1. `usersController.js`'deki `createNewUser`/`updateUser` body'den
     `fullName` okuyor ama model/tablonun gerçek sütunu `fullname`.
     Frontend'i kontrol ettik (`client/src/routes/dashboard/users/*`) --
     frontend GERÇEKTEN `fullName` gönderiyor/okuyor, yani bu canlıda
     çalışan bir hata: yeni kullanıcı eklemek Mongoose validation hatasıyla
     patlıyor, düzenlemede `fullname` hiç güncellenmiyor. **Karar:**
     birebir koru -- Rust tarafında da `fullName` kabul edilip
     KULLANILMIYOR, `fullname` sütunu INSERT'te hiç bind edilmiyor, bu da
     `NOT NULL` ihlaliyle 500'e düşüyor (Node'da Mongoose validation
     hatasının Express 5'te otomatik 500'e dönüşmesiyle aynı sonuç).
  2. `routes/userRoutes.js`'de `router.use(verifyJWT)` YORUM SATIRI --
     `/users` route'ları şu an tamamen korumasız. **Karar:** düzelt --
     Ders 8'deki `AuthUser` extractor'ını her handler'a ekledik.
- Handler imzasına `_user: AuthUser` eklemek (değerini kullanmasak bile)
  route'u korur -- isim `_` ile başlıyor çünkü "sadece doğrulansın,
  değerine ihtiyacım yok" demek istiyoruz.
- `roles: Option<Vec<String>>` + SQL'de `COALESCE($3, ARRAY['Çalışan'])`:
  Node'daki `!Array.isArray(roles) || !roles.length` ternary'sinin SQL
  tarafına taşınmış hali -- boş/sağlanmamışsa tablonun DEFAULT'u devreye
  giriyor.
- Küçük, kozmetik bir bug'ı SESSİZCE düzelttik (sormaya gerek görmedik):
  Node'daki `deleteUser`, `user.deleteOne()`'ın SONUCUNDAN `result.username`
  okuyordu ama o sonuçta (`{acknowledged, deletedCount}`) `username` diye
  bir alan YOK -- mesaj pratikte "undefined adında kullanıcı silindi"
  olurdu. Elimizde zaten doğru `user.username` varken (findById ile
  çekmiştik) onu kullandık. Bunun fullName bug'ından farkı: bu sadece bir
  mesaj metni, veri kaybı/işlev bozukluğu yok -- materyal bir fark
  yaratmıyor, soru sormaya değmedi.
- Artık gereksiz kalan Ders 3/4/8 geçici route'larını (`/db-check`,
  `/model-check`, `/protected-check`) kaldırdık; gerçek `/users` endpoint'i
  aynı rolü (DB bağlantısı + model mapping + JWT koruması) daha iyi
  gösteriyor.
- Test: token'sız `GET /users` → 401; token'lı → liste (`password` yok);
  `POST /users` → beklendiği gibi 500 (fullName bug'ı); `PATCH /users` →
  200 ama `fullname` değişmedi (bug korunuyor); `DELETE /users` → doğru
  kullanıcı adıyla `{reply}`.

## Ders 10 Notları

- Bir gerçek bulgu daha, sorup yönlendirme aldık: `getAllNotes`'un Mongo'daki
  `sort([['_id', -1]])` sıralaması ObjectId zaman sıralı olduğu için örtük
  olarak "en yeni üstte" demekti. Ders 3'te UUID'ye geçince bu garanti
  kayboldu (UUIDv4 rastgele). **Karar:** `migrations/0002_notes_created_at.sql`
  ile `created_at TIMESTAMPTZ DEFAULT now()` eklendi, sıralama ona göre
  yapılıyor. Bu sütunu MODELE/JSON'a eklemedik -- sadece sunucu içi sıralama
  amaçlı, orijinal veri sözleşmesinin bir parçası değil. (`sqlx::FromRow`
  derive'ının seçilen ekstra sütunları, struct'ta karşılığı olmadığında
  sorunsuz atladığını da gördük.)
- `routes/noteRoutes.js`'teki seçici koruma (`GET` herkese açık, `POST`/
  `PATCH`/`DELETE` korumalı -- `router.use(verifyJWT)` GET'ten SONRA
  tanımlı) bizim modelimize zaten doğal geliyor: `get_all_notes` imzasında
  `AuthUser` yok, diğer üçünde var. Router'da hiçbir "sıralama" kodu
  gerekmedi.
- Node'daki `updateNote`, `res.json(\`'${dorse}' güncellendi\`)` ile ÇIPLAK
  bir string dönüyordu (obje değil). Frontend bu yanıtın İÇERİĞİNİ hiç
  okumuyor (sadece mutation başarılı mı diye bakıyor), bu yüzden -- sormaya
  değmeyecek kadar düşük riskli bir seçim -- projenin her yerinde kullandığımız
  tutarlı `{message}` şekline normalize ettik.
- Ders 9'daki `deleteUser`'la AYNI kozmetik bug deleteNote'ta da vardı
  (`result.dorse` → `undefined`); aynı mantıkla sessizce düzelttik (elimizde
  zaten doğru `note.dorse` var).
- `response.rs`'e `ReplyBody` eklendi (artık `users.rs`'teki yerel kopyasının
  yerini aldı) -- `MessageBody` ile aynı mantık, `deleteUser`/`deleteNote`'un
  kullandığı `{reply}` şekli için.
- Test: token'sız `POST /notes` → 401; iki araç girişi + `created_at`'e göre
  doğru sıralama (en yeni üstte); aynı dorse ile tekrar giriş → 409; `PATCH`
  → `{message}`; `DELETE` → doğru dorse numarasıyla `{reply}`.

## Ders 11 Notları

- `cikisController.js`'de bir güvenlik/sağlamlık farkı vardı: `Note.findById`
  null dönerse hiç kontrol edilmeden `note.cikisYapan = user` yazılıyordu --
  bu bir TypeError fırlatır, catch bloğu yakalayıp ham hata nesnesini
  client'a sızdırırdı. Diğer tüm handler'larımızla tutarlı olarak burada da
  "bulunamadı" durumunu AÇIKÇA kontrol ettik (`ok_or_else`), ham hata
  sızdırmadık -- bunun için ayrıca sormaya gerek yoktu, Ders 5'te zaten
  karar verilmiş bir ilkeydi.
- `cikisController`/`gumrukController`'da aynı `.title` bug'ı vardı (Note
  modelinde `title` diye bir alan hiç yok) -- bare string yanıtları, Ders
  10'da kurduğumuz kuralla tutarlı şekilde `{message}` + gerçek `dorse`'a
  normalize edildi.
- `raporController.rapor`'daki sayfalama (`skip`/`limit`/`ORDER BY
  cikis_tarihi DESC`) Ders 10'daki `_id` sıralama tuzağına HİÇ girmiyor --
  çünkü zaten anlamlı bir veri alanına (`cikis_tarihi`) göre sıralıyor,
  UUID'nin rastgeleliğinden etkilenmiyor. Migration gerekmedi.
- `Query<RaporQuery>` extractor'ı: Node'da `req.query.page` her zaman STRING
  gelirdi ama JS'in gevşek tip dönüşümü aritmetikte sorunsuz çalışırdı; Rust
  tarafında extractor bunu doğrudan `Option<i64>`'e çeviriyor, tip
  güvenliği baştan sağlanıyor.
- `/cikis`, `/gumruk`, `/rapor` route'larının üçü de Node'da zaten tam
  korumalıydı (`router.use(verifyJWT)` ilk satırda) -- burada da her handler
  `_user: AuthUser` alıyor, ek bir karar gerekmedi.
- Test: uçtan uca akış -- araç girişi → gümrük bilgisi → çıkış → `/rapor`'da
  doğru pagination ile görünüyor, aynı anda `/notes`'ta artık görünmüyor
  (çıkış yapıldığı için); token'sız `/rapor` → 401.

## Ders 12 Notları

- `back/public/css/style.css`, `back/views/{index,404}.html` dosyaları
  `back-rust/public/css/` ve `back-rust/views/`'e aynen kopyalandı.
- `handlers/root.rs` (`routes/root.js` karşılığı) ve `middleware/not_found.rs`
  artık bu dosyaları `tokio::fs::read_to_string(...)` ile HER İSTEKTE
  diskten okuyor -- `res.sendFile(...)` ile aynı operasyonel davranış
  (HTML'i değiştirmek yeniden derleme gerektirmiyor); `include_str!` ile
  binary'ye gömmeyi bilerek seçmedik.
- `/`, `/index`, `/index.html` için üç ayrı `.route()` çağrısı gerekti --
  Express'in `router.get(['/', '/index', '/index.html'], handler)` tek
  satırının Axum'da birebir karşılığı yok, `.route()` tek path alıyor.
- `express.static(path.join(__dirname,"public"))` karşılığı için genel bir
  `ServeDir` + "bulunamazsa fallback'e düş" zinciri kurmadık -- projenin
  `public/` içinde gerçekten TEK bir şey var (`css/`), onu doğrudan
  `.nest_service("/css", ServeDir::new("public/css"))` ile bağladık. Daha
  basit ve bugünkü içerik için tam karşılık; yeni bir statik klasör
  eklenirse buraya bir satır daha eklenir.
- `AppError`'a `From<std::io::Error>` eklendi (dosya okuma hataları için --
  `sqlx::Error` ve şimdi `std::io::Error`, aynı ilke: her dış hata tipi için
  BİR dönüşüm noktası).
- Test: `/` gerçek `index.html`'i döndü; `/index` ve `/index.html` de aynı
  sayfayı verdi; `/css/style.css` doğru içerik+`Content-Type: text/css` ile
  geldi (ayrıca `ETag`/`Last-Modified` gibi HTTP cache header'larını
  `ServeDir` ücretsiz sağladı, Node'un `express.static`'i de bunu yapardı);
  `Accept: text/html` ile 404 isteğinde gerçek `404.html` içeriği döndü.

## Çoklu Otopark (Multi-tenant)

- **Model:** paylaşılan veritabanı + `tenant_id` sütunu (migration `0003_tenants.sql`).
  `tenants` tablosu her otoparkı tutar; `users` ve `notes` bir otoparka bağlıdır.
  Eski veriler varsayılan `muallimkoy` otoparkına taşındı.
- **İzolasyon:** access token'ın `UserInfo`'su artık `tenantId`/`tenantName` taşıyor;
  `AuthUser.tenant_id` ile otoparka ait HER sorgu `WHERE tenant_id = $n` ile
  filtreleniyor (UPDATE/DELETE dahil). Başka otoparkın kaydının id'sini bilmek
  işe yaramaz: "bulunamadı" döner. Token imzalı olduğu için istemci tenant'ı değiştiremez.
- **Kullanıcı adları global eşsiz:** girişte otopark kodu sorulmuyor, otopark kullanıcıdan çıkarılıyor.
- **SüperAdmin rolü:** `/tenants` (GET/POST/PATCH) ile otopark ekler/düzenler/askıya alır.
  Yeni otopark, ilk "Kurucu" kullanıcısıyla birlikte tek transaction'da oluşur.
  Kurucular bu rolü veremez/silemez (`sanitize_roles`). İlk SüperAdmin:
  `.env`'de `SUPERADMIN_USERNAME` + `SUPERADMIN_PASSWORD` (kullanıcı yoksa açılışta
  oluşturulur); migration ayrıca mevcut "Kurucu"lara bu rolü verir.
- **Askıya alma:** otopark `active = false` olunca login ve refresh reddedilir,
  herkese açık listeden çıkar.
- **Herkese açık liste:** `GET /notes` artık korumalı; misafir listesi
  `GET /public/parks` + `GET /public/parks/{slug}/notes` (sadece çekici/dorse/firma/giriş tarihi).
- **Signup:** otopark kodu (`park`) ister ve kullanıcıyı PASİF oluşturur; kurucu aktif edince giriş yapılabilir.
- **İşlemi yapan kullanıcı:** access token artık `username` da taşıyor. `giris_yapan`,
  `gumruk_yapan`, `cikis_yapan`, `guncelleme_yapan` istemcinin gönderdiği `user`
  alanından değil, `AuthUser.username`'den (imzalı token) yazılıyor. Eskiden
  token'da `username` olmadığı için frontend `user: undefined` gönderiyor ve bu
  istekler reddediliyordu.

## Ders 15: Postgres → SQLite

Neden: ayrı bir veritabanı sunucusu (Docker konteyneri, ~70 MB RAM) yerine
programın içinde çalışan tek dosyalık bir veritabanı. Bir otoparkın yükü
SQLite için çok hafif; kurulum ve yedekleme (`data/akbaslar.db` dosyasını
kopyalamak) çok daha basit.

- `sqlx` feature'ı `postgres` → `sqlite`. `PgPool` → `SqlitePool`; havuz
  açılırken WAL modu, `busy_timeout` ve `foreign_keys` açılıyor (SQLite'ta
  yabancı anahtar kontrolü varsayılan olarak KAPALI).
- Migration'lar tek bir `0001_init.sql`'de yeniden yazıldı (`STRICT` tablolar).
- `UUID` tipi yok → 16 baytlık BLOB, id'ler Rust'ta `Uuid::new_v4()`.
- Dizi tipi yok → `roles` JSON metni; struct'ta `#[sqlx(json)]`, bind ederken
  `Json(&roles)`. `= ANY(roles)` yerine `json_each(roles)`.
- Dizi parametresi yok → `tenant_id = ANY($1)` yerine `QueryBuilder` ile
  `IN (?, ?, ...)` ya da Rust'ta kontrol.
- Parametreler `$1` yerine `?1`.
- `lower()` sadece ASCII → büyük/küçük harf duyarsız kullanıcı adı için
  `username_key` sütunu (Rust'ta hesaplanıyor, Türkçe I/İ/ı/i aynı sayılıyor).
- `query_as!` (Ders 14) runtime `query_as`'e döndü: JSON sütunu ve derleme
  için şeması kurulmuş veritabanı dosyası gereksinimi yüzünden.
- Eski Postgres verisi: `python3 scripts/pg_to_sqlite.py`.

