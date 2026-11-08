-- Çoklu otopark (multi-tenant) desteği.
--
-- Yaklaşım: "paylaşılan veritabanı, paylaşılan şema, tenant_id sütunu".
-- Her otopark `tenants` tablosunda bir satır; `users` ve `notes` tabloları
-- bir otoparka bağlı. Her sorgu, JWT'den gelen `tenant_id` ile filtrelenir,
-- böylece bir otoparkın kullanıcısı başka otoparkın verisini göremez.
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    -- URL'lerde ve kayıt formunda kullanılan kısa, eşsiz "otopark kodu".
    slug TEXT NOT NULL,
    address TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX tenants_slug_lower_idx ON tenants (lower(slug));

-- Mevcut (tek otoparklı) veriyi kaybetmemek için varsayılan bir otopark
-- oluşturup tüm eski kullanıcıları ve kayıtları ona bağlıyoruz.
INSERT INTO tenants (name, slug, address)
VALUES (
    'Muallimköy Tır Parkı',
    'muallimkoy',
    'Kirazpınar Mah. Yeni Bağdat Cd. No:791 PK:41400 Gebze Kocaeli'
);

ALTER TABLE users ADD COLUMN tenant_id UUID REFERENCES tenants (id) ON DELETE CASCADE;
UPDATE users SET tenant_id = (SELECT id FROM tenants WHERE slug = 'muallimkoy');
ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX users_tenant_id_idx ON users (tenant_id);

ALTER TABLE notes ADD COLUMN tenant_id UUID REFERENCES tenants (id) ON DELETE CASCADE;
UPDATE notes SET tenant_id = (SELECT id FROM tenants WHERE slug = 'muallimkoy');
ALTER TABLE notes ALTER COLUMN tenant_id SET NOT NULL;

-- Neredeyse her sorgu "bu otoparkta, çıkışı yapılmış/yapılmamış" diye
-- bakıyor; tek sütunluk eski index'in yerine bileşik index.
DROP INDEX notes_cikis_tarihi_idx;
CREATE INDEX notes_tenant_cikis_tarihi_idx ON notes (tenant_id, cikis_tarihi);

-- Kullanıcı adları GLOBAL olarak eşsiz kalıyor (users_username_lower_idx
-- değişmedi): giriş ekranında otopark kodu sormaya gerek kalmıyor, otopark
-- kullanıcıdan çıkarılıyor.

-- Otoparkları yöneten platform yöneticisi rolü. Mevcut kurucular bu rolü
-- alıyor ki migration sonrası yeni otopark ekleyebilecek biri olsun.
UPDATE users
SET roles = array_append(roles, 'SüperAdmin')
WHERE 'Kurucu' = ANY (roles) AND NOT ('SüperAdmin' = ANY (roles));
