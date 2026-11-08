use std::{str::FromStr, time::Duration};

use sqlx::{
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous},
    types::Json,
    SqlitePool,
};

use crate::{models::username_key, roles};

// Node tarafındaki `connectDB()` (config/dbConn.js) karşılığı.
//
// SQLite ayrı bir sunucu değil, programın İÇİNDE çalışan bir kütüphane:
// veritabanı tek bir dosya (`DATABASE_URL=sqlite://data/akbaslar.db`).
// Yine de bir bağlantı HAVUZU kullanıyoruz: aynı anda birden çok okuma
// yapılabiliyor, yazmalar ise SQLite'ta sırayla (tek yazıcı) yapılır.
pub async fn connect(database_url: &str) -> SqlitePool {
    let options = SqliteConnectOptions::from_str(database_url)
        .expect("DATABASE_URL geçerli bir sqlite adresi olmalı")
        // Dosya (ve ilk açılışta şema) yoksa oluştur.
        .create_if_missing(true)
        // WAL: okuyucular yazıcıyı beklemez, yazıcı okuyucuları bekletmez.
        // Web sunucusu gibi eşzamanlı erişimde SQLite için önerilen mod.
        .journal_mode(SqliteJournalMode::Wal)
        // WAL ile NORMAL güvenli ve FULL'dan çok daha hızlı.
        .synchronous(SqliteSynchronous::Normal)
        // Başka bir bağlantı yazarken "database is locked" hatası vermek
        // yerine en fazla 5 sn bekle.
        .busy_timeout(Duration::from_secs(5))
        // SQLite'ta yabancı anahtar kontrolü varsayılan olarak KAPALI;
        // ON DELETE CASCADE'in çalışması için açıyoruz.
        .foreign_keys(true);

    // Dosyanın bulunduğu klasör yoksa SQLite dosyayı oluşturamaz.
    if let Some(dir) = options.get_filename().parent() {
        if !dir.as_os_str().is_empty() {
            std::fs::create_dir_all(dir).expect("veritabanı klasörü oluşturulamadı");
        }
    }

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await
        .expect("SQLite veritabanı açılamadı");

    // `sqlx::migrate!` derleme zamanında `./migrations` klasöründeki .sql
    // dosyalarını programın içine GÖMER. `.run(&pool)` ise açılışta "bu
    // migration'lardan hangileri daha önce uygulanmadı" diye bakıp sırayla
    // çalıştırır.
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Migration'lar çalıştırılamadı");

    pool
}

// `SUPERADMIN_USERNAME`/`SUPERADMIN_PASSWORD` tanımlıysa ve bu kullanıcı
// yoksa, ilk otoparkta "Kurucu" + "SüperAdmin" rolleriyle oluşturur. Kullanıcı
// zaten varsa HİÇBİR ŞEY yapmaz (şifresini/rollerini ezmez) -- böylece env
// değişkenini kalıcı olarak bırakmak güvenli.
pub async fn ensure_super_admin(pool: &SqlitePool, username: &str, password: &str) {
    let exists: Option<uuid::Uuid> =
        sqlx::query_scalar("SELECT id FROM users WHERE username_key = ?1")
            .bind(username_key(username))
            .fetch_optional(pool)
            .await
            .expect("SüperAdmin kontrolü yapılamadı");
    if exists.is_some() {
        return;
    }

    let hashed = bcrypt::hash(password, bcrypt::DEFAULT_COST).expect("şifre hashlenemedi");
    sqlx::query(
        "INSERT INTO users (id, fullname, username, username_key, password, roles, tenant_id)
         VALUES (?1, ?2, ?2, ?3, ?4, ?5, (SELECT id FROM tenants ORDER BY created_at LIMIT 1))",
    )
    .bind(uuid::Uuid::new_v4())
    .bind(username)
    .bind(username_key(username))
    .bind(&hashed)
    .bind(Json(vec![roles::ADMIN, roles::SUPER_ADMIN]))
    .execute(pool)
    .await
    .expect("SüperAdmin oluşturulamadı");

    tracing::info!("SüperAdmin kullanıcısı oluşturuldu: {username}");
}
