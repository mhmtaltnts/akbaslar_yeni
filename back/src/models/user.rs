use serde::{Deserialize, Serialize};
use uuid::Uuid;

// models/User.js'in karşılığı.
//
// İki ayrı derive makrosu, İKİ AYRI amaç için bu struct'ı "okuyor":
//  - `Serialize`/`Deserialize` (serde)   -> JSON <-> struct (API katmanı)
//  - `FromRow` (sqlx)                    -> Postgres satırı -> struct (DB katmanı)
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
    pub roles: Vec<String>,
    pub active: bool,
}
