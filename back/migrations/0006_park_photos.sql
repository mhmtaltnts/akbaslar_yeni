-- Otoparkın fotoğrafları: ana sayfa slaytında gösterilir. Kurucu (veya
-- SüperAdmin) kendi otoparkına ekler/siler. Görüntü istemcide küçültülüp
-- (en uzun kenar 1600 px, JPEG, <1 MB, EXIF/konum bilgisi silinmiş) gelir;
-- veritabanında durduğu için günlük yedeğe ve taşımaya dahildir.
CREATE TABLE park_photos (
    id BLOB PRIMARY KEY NOT NULL,
    tenant_id BLOB NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
    data BLOB NOT NULL,
    created_at INTEGER NOT NULL
) STRICT;

CREATE INDEX park_photos_tenant_idx ON park_photos (tenant_id, created_at);
