-- Rapor araması (GET /rapor?q=) için önceden hesaplanmış arama metni.
--
-- Aranan alanlar (dorse, getiren, götüren, firma, yük, gümrük bilgisi) tek
-- metinde birleştirilip büyük/küçük harf duyarsız hale getiriliyor:
--  * Alanlar görünmez bir ayraçla (char(31)) ayrılıyor: arama iki alanın
--    sınırını aşarak yanlış eşleşmesin.
--  * SQLite'ın lower()'ı sadece ASCII harfleri küçültür; Türkçe büyük
--    harfler (Ç Ğ İ Ö Ş Ü) ve "ı" elle katlanıyor. "I" ve "ı" -> "i": arama
--    metni de Rust'ta aynı kurala göre katlanır (handlers::rapor::search_pattern).
--
-- Bunu her aramada 200 bin kayıt üzerinde hesaplamak ~0.4-2 sn sürüyordu;
-- saklanan sütunla ~0.1 sn. Sütunu trigger'lar güncel tutar: kayıt ekleyen
-- veya bu alanları değiştiren hiçbir kodun ayrıca bir şey yapması gerekmez.

ALTER TABLE notes ADD COLUMN search_text TEXT NOT NULL DEFAULT '';

UPDATE notes SET search_text = replace(replace(replace(replace(replace(replace(replace(lower(
        coalesce(dorse, '') || char(31) || coalesce(getiren, '') || char(31) || coalesce(goturen, '') || char(31) ||
        coalesce(firma, '') || char(31) || coalesce(mal, '') || char(31) || coalesce(gumruk_bilgi, '')
    ), 'Ç', 'ç'), 'Ğ', 'ğ'), 'İ', 'i'), 'Ö', 'ö'), 'Ş', 'ş'), 'Ü', 'ü'), 'ı', 'i');

CREATE TRIGGER notes_search_text_insert AFTER INSERT ON notes
BEGIN
    UPDATE notes SET search_text = replace(replace(replace(replace(replace(replace(replace(lower(
        coalesce(dorse, '') || char(31) || coalesce(getiren, '') || char(31) || coalesce(goturen, '') || char(31) ||
        coalesce(firma, '') || char(31) || coalesce(mal, '') || char(31) || coalesce(gumruk_bilgi, '')
    ), 'Ç', 'ç'), 'Ğ', 'ğ'), 'İ', 'i'), 'Ö', 'ö'), 'Ş', 'ş'), 'Ü', 'ü'), 'ı', 'i')
    WHERE id = NEW.id;
END;

CREATE TRIGGER notes_search_text_update
AFTER UPDATE OF dorse, getiren, goturen, firma, mal, gumruk_bilgi ON notes
BEGIN
    UPDATE notes SET search_text = replace(replace(replace(replace(replace(replace(replace(lower(
        coalesce(dorse, '') || char(31) || coalesce(getiren, '') || char(31) || coalesce(goturen, '') || char(31) ||
        coalesce(firma, '') || char(31) || coalesce(mal, '') || char(31) || coalesce(gumruk_bilgi, '')
    ), 'Ç', 'ç'), 'Ğ', 'ğ'), 'İ', 'i'), 'Ö', 'ö'), 'Ş', 'ş'), 'Ü', 'ü'), 'ı', 'i')
    WHERE id = NEW.id;
END;
