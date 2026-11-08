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

// `SUPERADMIN_USERNAME`/`SUPERADMIN_PASSWORD` tanımlıysa ve bu kullanıcı
// yoksa, ilk otoparkta "Kurucu" + "SüperAdmin" rolleriyle oluşturur. Kullanıcı
// zaten varsa HİÇBİR ŞEY yapmaz (şifresini/rollerini ezmez) -- böylece env
// değişkenini kalıcı olarak bırakmak güvenli.
pub async fn ensure_super_admin(pool: &PgPool, username: &str, password: &str) {
    let exists: Option<uuid::Uuid> =
        sqlx::query_scalar("SELECT id FROM users WHERE lower(username) = lower($1)")
            .bind(username)
            .fetch_optional(pool)
            .await
            .expect("SüperAdmin kontrolü yapılamadı");
    if exists.is_some() {
        return;
    }

    let hashed = bcrypt::hash(password, bcrypt::DEFAULT_COST).expect("şifre hashlenemedi");
    sqlx::query(
        "INSERT INTO users (fullname, username, password, roles, tenant_id)
         VALUES ($1, $1, $2, ARRAY['Kurucu', 'SüperAdmin'],
                 (SELECT id FROM tenants ORDER BY created_at LIMIT 1))",
    )
    .bind(username)
    .bind(&hashed)
    .execute(pool)
    .await
    .expect("SüperAdmin oluşturulamadı");

    tracing::info!("SüperAdmin kullanıcısı oluşturuldu: {username}");
}
