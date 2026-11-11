-- Otoparkın alan adı: site bu adresten açıldığında
--  * misafir ana sayfası (şifresiz) bu otoparkı gösterir,
--  * bu otoparkta çalışmaya yetkili kullanıcılar (kendi otoparkı,
--    `officer_parks` ile izin verilmiş personel, SüperAdmin) bu otoparkta
--    çalışır; diğerleri her zaman kendi otoparkında kalır.
-- "www." öneki olmadan, küçük harfle saklanır (bkz. site::normalize_host).
ALTER TABLE tenants ADD COLUMN domain TEXT;

CREATE UNIQUE INDEX tenants_domain_idx ON tenants (domain) WHERE domain IS NOT NULL;

UPDATE tenants SET domain = 'akbaslartirparki.com' WHERE slug = 'akbaslar';
UPDATE tenants SET domain = 'muallimkoykonak.com' WHERE slug = 'muallimkoy';

-- `officer_parks` artık sadece memurlar için değil: SüperAdmin herhangi bir
-- personele kendi otoparkı dışında otopark izni verebilir. Memur bu
-- otoparkların araçlarını birlikte görür; diğer personel, sitenin açıldığı
-- alan adının otoparkında çalışır.
