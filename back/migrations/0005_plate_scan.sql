-- Telefonda plaka okuma (deneme özelliği): SüperAdmin otopark bazında açar.
-- Varsayılan kapalı; kapalıyken araç giriş/çıkış formlarında kamera düğmesi
-- görünmez. Okuma tamamen telefonda yapılır, sunucuya görüntü gelmez.
ALTER TABLE tenants ADD COLUMN plate_scan INTEGER NOT NULL DEFAULT 0;
