-- Mongo'da ObjectId zaman sıralıydı, bu yüzden `sort([['_id', -1]])` aynı
-- zamanda "en yeni giren üstte" anlamına geliyordu. UUID'ye geçince (Ders 3)
-- bu örtük garanti kayboldu -- UUIDv4 tamamen rastgele. Sıralama için
-- sunucu kontrollü, gerçek bir zaman damgası ekliyoruz.
ALTER TABLE notes ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
