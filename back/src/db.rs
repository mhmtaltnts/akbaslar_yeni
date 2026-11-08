use sqlx::postgres::{PgPool, PgPoolOptions};

// Node tarafındaki `connectDB()` (config/dbConn.js) karşılığı.
// `PgPool`, Mongoose'un tek bağlantısı yerine bir BAĞLANTI HAVUZU tutar:
// her sorgu havuzdan bir bağlantı ödünç alır, işi bitince geri bırakır.
pub async fn connect(database_url: &str) -> PgPool {
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await
        .expect("Postgres'e bağlanılamadı");

    // `sqlx::migrate!` derleme zamanında `../migrations` klasöründeki .sql
    // dosyalarını programın içine GÖMER (Node'daki gibi runtime'da diskten
    // ayrıca bir migration aracı çalıştırmamıza gerek yok). `.run(&pool)`
    // ise açılışta "bu migration'lardan hangileri daha önce uygulanmadı"
    // diye bakıp sırayla çalıştırır.
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Migration'lar çalıştırılamadı");

    pool
}
