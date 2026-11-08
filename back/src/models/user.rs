use serde::{Deserialize, Serialize};
use uuid::Uuid;

// models/User.js'in karşılığı.
//
// İki ayrı derive makrosu, İKİ AYRI amaç için bu struct'ı "okuyor":
//  - `Serialize`/`Deserialize` (serde)   -> JSON <-> struct (API katmanı)
//  - `FromRow` (sqlx)                    -> veritabanı satırı -> struct (DB katmanı)
// Her birinin kendi isimlendirme kuralı var ve birbirini etkilemiyor.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
// JSON tarafında alan adlarını camelCase'e çeviriyoruz (frontend zaten
// Mongoose'tan beri camelCase bekliyor). `FromRow` bundan habersiz, o hep
// struct alan adıyla (snake_case) veritabanı sütun adını eşler.
#[serde(rename_all = "camelCase")]
pub struct User {
    // Ders 13'te ortaya çıktı: frontend'in `usersApiSlice.ts`/`notesApiSlice.ts`
    // dosyaları hâlâ Mongo döneminden kalma `item.id = item._id` satırı
    // içeriyor. Alanı burada `id` yapsak bu satır onu `undefined` ile
    // ezer ve Redux'un entity adapter'ı tüm kayıtları tek bir anahtar
    // altında birleştirirdi. `_id` olarak göndermek frontend'e hiç
    // dokunmadan bu eski-kod varsayımını karşılıyor.
    #[serde(rename = "_id")]
    pub id: Uuid,
    pub fullname: String,
    pub username: String,
    // Node tarafında `.select('-password')` ile HER sorguda elle hariç
    // tutuluyordu -- unutulabilir bir disiplin. Burada derleyici garanti
    // ediyor: bu struct JSON'a çevrilirken `password` alanı hiçbir zaman
    // çıktıya yazılmaz, hangi endpoint'ten geçerse geçsin.
    #[serde(skip_serializing)]
    pub password: String,
    // SQLite'ta dizi tipi yok: sütun JSON metni (`["Kurucu"]`). `sqlx(json)`
    // okurken JSON'u Vec'e çeviriyor; yazarken `Json(&roles)` bind ediyoruz.
    #[sqlx(json)]
    pub roles: Vec<String>,
    pub active: bool,
    // Kullanıcının bağlı olduğu otopark (bkz. migration 0003). JSON'a
    // yazmıyoruz: istemci otoparkı zaten access token'dan okuyor.
    #[serde(skip_serializing)]
    pub tenant_id: Uuid,
}

// Kullanıcı adlarının büyük/küçük harf duyarsız eşsizlik anahtarı
// (`users.username_key`). SQLite'ın `lower()` fonksiyonu sadece ASCII
// harfleri küçülttüğü için Rust'ın Unicode farkında `to_lowercase()`'ini
// kullanıyoruz: "ÇALIŞAN" ve "çalışan" aynı anahtarı üretir.
//
// Türkçe I sorunu: genel Unicode kuralında "I" -> "i" ve "İ" -> "i̇" olur,
// ama Türkçede "I" -> "ı", "İ" -> "i". Hangi klavyeyle yazıldığı belli
// olmadığından dört harfin (I, İ, ı, i) hepsini "i" sayıyoruz: böylece
// "ÇALIŞAN" = "çalışan" ve "çalişan" ile "çalışan" gibi birbirine çok
// benzeyen iki ayrı kullanıcı adı da açılamıyor.
pub fn username_key(username: &str) -> String {
    username
        .chars()
        .flat_map(|c| match c {
            'I' | 'İ' | 'ı' => 'i'.to_lowercase(),
            c => c.to_lowercase(),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::username_key;

    #[test]
    fn turkce_buyuk_harfler_kucultulur() {
        assert_eq!(username_key("ÇALIŞAN"), username_key("çalışan"));
        assert_eq!(username_key("Gümrük_Öğe"), "gümrük_öğe");
        assert_eq!(username_key("İSMAİL"), username_key("ismail"));
        assert_eq!(username_key("IŞIK"), username_key("ışık"));
        assert_eq!(username_key("çalişan"), username_key("çalışan"));
        assert_ne!(username_key("ali"), username_key("ela"));
    }
}
