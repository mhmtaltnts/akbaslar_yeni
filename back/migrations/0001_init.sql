-- SQLite şeması. Postgres'teki 0001-0004 migration'larının birleşik hali
-- (Postgres'ten geçiş için bkz. scripts/pg_to_sqlite.py).
--
-- Postgres'e göre farklar:
--  * UUID tipi yok: id'ler 16 baytlık BLOB, Rust'ta `Uuid::new_v4()` ile
--    üretilip INSERT'e veriliyor (gen_random_uuid() yok).
--  * Dizi tipi yok: `roles` JSON metni (`["Kurucu","SüperAdmin"]`), Rust'ta
--    `#[sqlx(json)] Vec<String>`.
--  * BOOLEAN yok: 0/1 INTEGER (sqlx `bool` olarak okuyup yazıyor).
--  * TIMESTAMPTZ yok: `created_at` milisaniye cinsinden epoch (INTEGER).
--  * `STRICT`: SQLite normalde her sütuna her tipi kabul eder; STRICT
--    tablolar Postgres gibi tip uyuşmazlığında hata verir.

CREATE TABLE tenants (
    id BLOB PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    -- URL'lerde ve kayıt formunda kullanılan kısa, eşsiz "otopark kodu"
    -- (sadece a-z, 0-9 ve tire; bkz. handlers::tenants::normalize_slug).
    slug TEXT NOT NULL,
    address TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER))
) STRICT;

CREATE UNIQUE INDEX tenants_slug_lower_idx ON tenants (lower(slug));

CREATE TABLE users (
    id BLOB PRIMARY KEY NOT NULL,
    tenant_id BLOB NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    fullname TEXT NOT NULL,
    username TEXT NOT NULL,
    -- Büyük/küçük harf duyarsız eşsizlik anahtarı: Rust'ta
    -- `username.to_lowercase()` ile hesaplanıyor (bkz. models::user::username_key).
    -- SQLite'ın `lower()` fonksiyonu sadece ASCII harfleri küçültür
    -- ("ÇALIŞAN" ile "çalışan" farklı sayılırdı), bu yüzden Postgres'teki
    -- `lower(username)` index'inin yerine bu sütun var.
    username_key TEXT NOT NULL,
    password TEXT NOT NULL,
    roles TEXT NOT NULL DEFAULT '["Çalışan"]' CHECK (json_valid(roles)),
    active INTEGER NOT NULL DEFAULT 1
) STRICT;

CREATE UNIQUE INDEX users_username_key_idx ON users (username_key);
CREATE INDEX users_tenant_id_idx ON users (tenant_id);

CREATE TABLE notes (
    id BLOB PRIMARY KEY NOT NULL,
    tenant_id BLOB NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    getiren TEXT NOT NULL,
    dorse TEXT NOT NULL,
    firma TEXT,
    mal TEXT,
    gumruk_bilgi TEXT,
    goturen TEXT,
    giris_yapan TEXT,
    gumruk_yapan TEXT,
    cikis_yapan TEXT,
    guncelleme_yapan TEXT,
    giris_tarihi INTEGER,
    gumruk_bilgi_tarihi INTEGER,
    cikis_tarihi INTEGER,
    guncelleme_tarihi INTEGER,
    created_at INTEGER NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER))
) STRICT;

-- Neredeyse her sorgu "bu otoparkta, çıkışı yapılmış/yapılmamış" diye bakıyor.
CREATE INDEX notes_tenant_cikis_tarihi_idx ON notes (tenant_id, cikis_tarihi);

-- Gümrük memurlarının (rol: "Memur") erişebildiği EK otoparklar. Memur kendi
-- otoparkına her zaman erişir; buradaki satırlar SüperAdmin'in ayrıca izin
-- verdiği diğer otoparklardır.
CREATE TABLE officer_parks (
    user_id BLOB NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    tenant_id BLOB NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, tenant_id)
) STRICT, WITHOUT ROWID;

-- Varsayılan ilk otopark: SüperAdmin bu otoparka eklenir (bkz. db::ensure_super_admin).
INSERT INTO tenants (id, name, slug, address)
VALUES (
    X'e02ce5f1b25749648ed74eae87e03cbf',
    'Muallimköy Tır Parkı',
    'muallimkoy',
    'Kirazpınar Mah. Yeni Bağdat Cd. No:791 PK:41400 Gebze Kocaeli'
);
