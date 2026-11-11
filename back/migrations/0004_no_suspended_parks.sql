-- Uygulama iki sabit otoparklı (akbaslar, muallimkoy): otopark oluşturma ve
-- askıya alma kaldırıldı. Askıda kalmış otopark varsa yeniden aktif olur.
-- (`active` sütunu duruyor; artık hiçbir yerden false yapılamıyor.)
UPDATE tenants SET active = 1 WHERE NOT active;
