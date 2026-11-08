use serde::{Deserialize, Serialize};
use uuid::Uuid;

// models/Note.js'in karşılığı. Mongoose'da `required: true` olmayan her alan
// ("firma", "mal", "gumrukBilgi" vb.) burada `Option<T>` -- Rust'ta "bu
// değer yok" demenin tek yolu budur, JS'teki `undefined`/`null` karmaşasının
// aksine derleyici her `Option<T>` kullanımında None durumunu ele almanı
// ZORUNLU kılar. `sqlx` tarafında `Option<T>` = SQL `NULL`: ekstra bir
// attribute yazmaya gerek yok, hem okurken hem yazarken otomatik çalışır.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    // bkz. models/user.rs'teki aynı yorum -- frontend'in
    // `note.id = note._id` satırı yüzünden burada da `_id` gerekiyor.
    #[serde(rename = "_id")]
    pub id: Uuid,
    pub getiren: String,
    pub dorse: String,
    pub firma: Option<String>,
    pub mal: Option<String>,
    pub gumruk_bilgi: Option<String>,
    pub goturen: Option<String>,
    pub giris_yapan: Option<String>,
    pub gumruk_yapan: Option<String>,
    pub cikis_yapan: Option<String>,
    pub guncelleme_yapan: Option<String>,
    // Mongoose'daki `Number` (epoch) karşılığı: SQLite'ta INTEGER, Rust'ta i64.
    pub giris_tarihi: Option<i64>,
    pub gumruk_bilgi_tarihi: Option<i64>,
    pub cikis_tarihi: Option<i64>,
    pub guncelleme_tarihi: Option<i64>,
    // Sadece `GET /notes` doldurur (tenants ile JOIN): gümrük memuru birden
    // çok otoparkın araçlarını tek listede görüyor. `SELECT *` yapan diğer
    // sorgularda bu sütun yok; `sqlx(default)` sayesinde None kalır.
    #[sqlx(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub park_name: Option<String>,
}

// Herkese açık "Misafir Araçlar" sayfası için sadeleştirilmiş görünüm:
// giriş yapmamış ziyaretçiye kimin işlem yaptığı, gümrük bilgisi gibi iç
// alanları göstermiyoruz.
#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct PublicNote {
    #[serde(rename = "_id")]
    pub id: Uuid,
    pub getiren: String,
    pub dorse: String,
    pub firma: Option<String>,
    pub giris_tarihi: Option<i64>,
}
