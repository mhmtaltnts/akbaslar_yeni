use axum::{
    extract::{Query, State},
    http::header,
    response::{IntoResponse, Response},
    Json,
};
use chrono::{DateTime, Datelike, FixedOffset, NaiveDateTime};
use rust_xlsxwriter::{Color, Format, FormatBorder, Workbook, XlsxError};
use serde::{Deserialize, Serialize};
use sqlx::{QueryBuilder, Sqlite};
use uuid::Uuid;

use crate::{error::AppError, extractors::AuthUser, models::Note, response::MessageBody, state::SharedState};

const NOTES_PER_PAGE: i64 = 1000;

#[derive(Deserialize)]
pub struct RaporQuery {
    pub page: Option<i64>,
    // Arama metni: dorse, getiren, götüren, firma, yük ve gümrük bilgisinde
    // büyük/küçük harf duyarsız arar (Türkçe I/İ/ı/i aynı sayılır).
    pub q: Option<String>,
    // Çıkış tarihi aralığı (milisaniye epoch, iki uç dahil). İstemci seçilen
    // günlerin başını/sonunu KENDİ saat diliminde hesaplayıp gönderiyor.
    pub from: Option<i64>,
    pub to: Option<i64>,
    // Sadece Excel: tarih hücrelerinin yazılacağı saat dilimi, UTC'den
    // dakika farkı (Türkiye: 180). Sunucu UTC'de çalışıyor.
    pub tz: Option<i32>,
}

// Arama metnini `notes.search_text` sütunuyla (bkz. migrations/0002) aynı
// kurala göre normalleştirip LIKE
// desenine çevirir; boşsa None. `%`, `_` ve `\` kaçışlanır ki kullanıcının
// yazdığı karakterler joker gibi davranmasın.
fn search_pattern(q: Option<&str>) -> Option<String> {
    let q = q.map(str::trim).filter(|q| !q.is_empty())?;
    let folded: String = q
        .chars()
        .flat_map(|c| match c {
            'I' | 'İ' | 'ı' => 'i'.to_lowercase(),
            c => c.to_lowercase(),
        })
        .collect();
    let escaped = folded.replace('\\', "\\\\").replace('%', "\\%").replace('_', "\\_");
    Some(format!("%{escaped}%"))
}

// Rapor listesi ve Excel aktarımı AYNI filtreyi kullanır: bu otoparkın
// çıkışı yapılmış kayıtları + (varsa) arama + (varsa) çıkış tarihi aralığı.
// `QueryBuilder` kullanıcı değerlerini her zaman parametre olarak bağlar;
// SQL metnine sadece sabit parçalar yazılır.
fn push_filter(qb: &mut QueryBuilder<Sqlite>, user: &AuthUser, params: &RaporQuery) {
    qb.push(" WHERE tenant_id = ")
        .push_bind(user.tenant_id)
        .push(" AND cikis_tarihi IS NOT NULL");
    if let Some(pattern) = search_pattern(params.q.as_deref()) {
        qb.push(" AND search_text LIKE ").push_bind(pattern).push(" ESCAPE '\\'");
    }
    if let Some(from) = params.from {
        qb.push(" AND cikis_tarihi >= ").push_bind(from);
    }
    if let Some(to) = params.to {
        qb.push(" AND cikis_tarihi <= ").push_bind(to);
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Pagination {
    count: i64,
    page_count: i64,
}

#[derive(Serialize)]
pub struct RaporResponse {
    pagination: Pagination,
    notes: Vec<Note>,
}

// @route GET /rapor?page=&q=&from=&to=
// `req.query.page` Node'da STRING geliyordu ama JS'in gevşek tip
// dönüşümü sayesinde aritmetikte sorunsuz çalışıyordu
// (`("2" - 1) * 1000 === 1000`). Rust'ta `Query<RaporQuery>` extractor'ı
// bunu doğrudan `Option<i64>`'e çeviriyor -- tip dönüşümü sihirli değil,
// extractor'ın bir parçası.
pub async fn rapor(
    user: AuthUser,
    State(state): State<SharedState>,
    Query(params): Query<RaporQuery>,
) -> Result<Json<RaporResponse>, AppError> {
    user.require_manager()?;

    let page = params.page.unwrap_or(1).max(1);
    let skip = (page - 1) * NOTES_PER_PAGE;

    // Arama/tarih filtresi varsa hem sayım hem sayfalama SADECE eşleşen
    // kayıtlar üzerinden yapılır: tüm rapor geçmişinde çalışır.
    let mut count_query = QueryBuilder::<Sqlite>::new("SELECT COUNT(*) FROM notes");
    push_filter(&mut count_query, &user, &params);
    let count: i64 = count_query.build_query_scalar().fetch_one(&state.db).await?;

    // Burada `created_at`'e değil, Node'daki gibi gerçek veri alanı
    // `cikis_tarihi`'ye göre sıralıyoruz -- notesController'daki `_id`
    // sıralaması gibi bir "örtük zaman" tuzağı burada YOK, çünkü
    // `cikis_tarihi` zaten anlamlı bir zaman damgası.
    let mut notes_query = QueryBuilder::<Sqlite>::new("SELECT * FROM notes");
    push_filter(&mut notes_query, &user, &params);
    notes_query
        .push(" ORDER BY cikis_tarihi DESC LIMIT ")
        .push_bind(NOTES_PER_PAGE)
        .push(" OFFSET ")
        .push_bind(skip);
    let notes: Vec<Note> = notes_query.build_query_as().fetch_all(&state.db).await?;

    let page_count = if count <= NOTES_PER_PAGE {
        // Arama sonucu boş olsa da en az 1 sayfa.
        1
    } else {
        (count as f64 / NOTES_PER_PAGE as f64).ceil() as i64
    };

    Ok(Json(RaporResponse {
        pagination: Pagination { count, page_count },
        notes,
    }))
}

// Excel'e aktarılabilecek en fazla satır: tüm geçmiş (~200 bin) sığıyor;
// sınır, yanlışlıkla devasa bir dosya üretip sunucuyu yormamak için.
const EXPORT_MAX_ROWS: i64 = 300_000;

// @route GET /rapor/export?q=&from=&to=&tz=
// Rapor listesiyle aynı filtredeki TÜM kayıtları (sayfalama yok) .xlsx
// olarak indirir. Kayıtlar çıkış tarihine göre eskiden yeniye sıralanır.
pub async fn export_rapor(
    user: AuthUser,
    State(state): State<SharedState>,
    Query(params): Query<RaporQuery>,
) -> Result<Response, AppError> {
    user.require_manager()?;

    let mut count_query = QueryBuilder::<Sqlite>::new("SELECT COUNT(*) FROM notes");
    push_filter(&mut count_query, &user, &params);
    let count: i64 = count_query.build_query_scalar().fetch_one(&state.db).await?;
    if count > EXPORT_MAX_ROWS {
        return Err(AppError::BadRequest(format!(
            "{count} kayıt Excel için çok fazla; tarih aralığını daraltın (en fazla {EXPORT_MAX_ROWS})"
        )));
    }

    let mut query = QueryBuilder::<Sqlite>::new("SELECT * FROM notes");
    push_filter(&mut query, &user, &params);
    query.push(" ORDER BY cikis_tarihi ASC");
    let notes: Vec<Note> = query.build_query_as().fetch_all(&state.db).await?;

    let park: String = sqlx::query_scalar("SELECT name FROM tenants WHERE id = ?1")
        .bind(user.tenant_id)
        .fetch_one(&state.db)
        .await?;

    // Türkiye saati (+03:00) varsayılan; sınır dışı değerleri yok say.
    let offset = FixedOffset::east_opt(params.tz.unwrap_or(180).clamp(-720, 840) * 60)
        .expect("geçerli saat dilimi");

    // Dosyayı oluşturmak CPU işi (200 bin satırda birkaç saniye): async
    // çalışan diğer istekleri bekletmesin diye ayrı bir thread'de.
    let bytes = tokio::task::spawn_blocking(move || build_xlsx(&notes, offset))
        .await
        .map_err(|err| AppError::Internal(format!("excel oluşturulamadı: {err}")))?
        .map_err(|err| AppError::Internal(format!("excel oluşturulamadı: {err}")))?;

    let filename = export_filename(&park, &params, offset);
    // RFC 5987: Türkçe karakterli dosya adı `filename*` ile; eski tarayıcılar
    // için ASCII `filename` da var.
    let ascii: String = filename
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || "-_.".contains(c) { c } else { '_' })
        .collect();
    let disposition = format!(
        "attachment; filename=\"{ascii}\"; filename*=UTF-8''{}",
        percent_encode(&filename)
    );

    Ok((
        [
            (
                header::CONTENT_TYPE,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet".to_string(),
            ),
            (header::CONTENT_DISPOSITION, disposition),
        ],
        bytes,
    )
        .into_response())
}

fn local(ms: Option<i64>, offset: FixedOffset) -> Option<NaiveDateTime> {
    let dt = DateTime::from_timestamp_millis(ms?)?.with_timezone(&offset).naive_local();
    // Excel 1900 öncesi tarihleri gösteremez; eski verilerde hatalı girilmiş
    // tarihler var (örn. 24. yüzyıl), onları boş bırakıyoruz.
    (1900..=9999).contains(&dt.year()).then_some(dt)
}

// Rapordaki "Gün" sütunuyla aynı: giriş ve çıkış GÜNLERİ dahil sayılır.
fn stay_days(giris: Option<NaiveDateTime>, cikis: Option<NaiveDateTime>) -> Option<i64> {
    Some((cikis?.date() - giris?.date()).num_days().abs() + 1)
}

fn build_xlsx(notes: &[Note], offset: FixedOffset) -> Result<Vec<u8>, XlsxError> {
    let mut workbook = Workbook::new();
    let sheet = workbook.add_worksheet();
    sheet.set_name("Rapor")?;

    let header = Format::new()
        .set_bold()
        .set_font_color(Color::White)
        .set_background_color(Color::RGB(0x1D3FC4))
        .set_border(FormatBorder::Thin);
    let date = Format::new().set_num_format("dd.mm.yyyy hh:mm");
    let mono = Format::new().set_font_name("Consolas");

    let columns: [(&str, f64); 13] = [
        ("Dorse", 16.0),
        ("Getiren", 16.0),
        ("Götüren", 24.0),
        ("Firma", 22.0),
        ("Yük", 16.0),
        ("Giriş Tarihi", 17.0),
        ("Çıkış Tarihi", 17.0),
        ("Gün", 6.0),
        ("Gümrük Bilgisi", 22.0),
        ("Gümrük Tarihi", 17.0),
        ("Giriş Yapan", 13.0),
        ("Çıkış Yapan", 13.0),
        ("Gümrük Yapan", 13.0),
    ];
    for (col, (title, width)) in columns.iter().enumerate() {
        sheet.write_string_with_format(0, col as u16, *title, &header)?;
        sheet.set_column_width(col as u16, *width)?;
    }

    for (i, n) in notes.iter().enumerate() {
        let row = i as u32 + 1;
        let giris = local(n.giris_tarihi, offset);
        let cikis = local(n.cikis_tarihi, offset);
        let texts = [
            (0, Some(&n.dorse)),
            (1, Some(&n.getiren)),
            (2, n.goturen.as_ref()),
            (3, n.firma.as_ref()),
            (4, n.mal.as_ref()),
            (8, n.gumruk_bilgi.as_ref()),
            (10, n.giris_yapan.as_ref()),
            (11, n.cikis_yapan.as_ref()),
            (12, n.gumruk_yapan.as_ref()),
        ];
        for (col, value) in texts {
            if let Some(v) = value.filter(|v| !v.is_empty()) {
                if col <= 2 {
                    sheet.write_string_with_format(row, col, v, &mono)?;
                } else {
                    sheet.write_string(row, col, v)?;
                }
            }
        }
        for (col, value) in [(5, giris), (6, cikis), (9, local(n.gumruk_bilgi_tarihi, offset))] {
            if let Some(dt) = value {
                sheet.write_datetime_with_format(row, col, dt, &date)?;
            }
        }
        if let Some(days) = stay_days(giris, cikis) {
            sheet.write_number(row, 7, days as f64)?;
        }
    }

    // Başlık satırı sabit kalsın, sütunlarda Excel filtresi açık gelsin.
    sheet.set_freeze_panes(1, 0)?;
    sheet.autofilter(0, 0, notes.len() as u32, columns.len() as u16 - 1)?;

    workbook.save_to_buffer()
}

// "Akbaşlar Tır Parkı rapor 01.11.2026-08.11.2026.xlsx"
fn export_filename(park: &str, params: &RaporQuery, offset: FixedOffset) -> String {
    let day = |ms: Option<i64>| local(ms, offset).map(|d| d.format("%d.%m.%Y").to_string());
    let range = match (day(params.from), day(params.to)) {
        (Some(a), Some(b)) if a == b => format!(" {a}"),
        (Some(a), Some(b)) => format!(" {a}-{b}"),
        (Some(a), None) => format!(" {a} sonrası"),
        (None, Some(b)) => format!(" {b} öncesi"),
        (None, None) => String::new(),
    };
    format!("{park} rapor{range}.xlsx")
}

fn percent_encode(s: &str) -> String {
    s.bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => (b as char).to_string(),
            _ => format!("%{b:02X}"),
        })
        .collect()
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRaporPayload {
    pub id: Uuid,
    pub dorse: String,
    pub getiren: String,
    pub goturen: Option<String>,
    pub firma: Option<String>,
    pub mal: Option<String>,
    pub giris_tarihi: Option<i64>,
    pub cikis_tarihi: Option<i64>,
    pub gumruk_bilgi: Option<String>,
    pub gumruk_bilgi_tarihi: Option<i64>,
    pub guncelleme_tarihi: Option<i64>,
}

// @route PATCH /rapor
pub async fn update_rapor(
    user: AuthUser,
    State(state): State<SharedState>,
    Json(payload): Json<UpdateRaporPayload>,
) -> Result<Json<MessageBody>, AppError> {
    user.require_manager()?;

    let exists: Option<(Uuid,)> =
        sqlx::query_as("SELECT id FROM notes WHERE id = ?1 AND tenant_id = ?2")
        .bind(payload.id)
        .bind(user.tenant_id)
        .fetch_optional(&state.db)
        .await?;

    if exists.is_none() {
        return Err(AppError::BadRequest("Kayıt bulunamadı".to_string()));
    }

    sqlx::query(
        "UPDATE notes
         SET guncelleme_yapan = ?1, dorse = ?2, getiren = ?3, goturen = ?4, firma = ?5,
             mal = ?6, giris_tarihi = ?7, cikis_tarihi = ?8, gumruk_bilgi = ?9,
             gumruk_bilgi_tarihi = ?10, guncelleme_tarihi = ?11
         WHERE id = ?12 AND tenant_id = ?13",
    )
    .bind(&user.username)
    .bind(&payload.dorse)
    .bind(&payload.getiren)
    .bind(&payload.goturen)
    .bind(&payload.firma)
    .bind(&payload.mal)
    .bind(payload.giris_tarihi)
    .bind(payload.cikis_tarihi)
    .bind(&payload.gumruk_bilgi)
    .bind(payload.gumruk_bilgi_tarihi)
    .bind(payload.guncelleme_tarihi)
    .bind(payload.id)
    .bind(user.tenant_id)
    .execute(&state.db)
    .await?;

    Ok(Json(MessageBody::new(format!(
        "'{}' güncellendi",
        payload.dorse
    ))))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::username_key;

    #[test]
    fn arama_deseni_normallesir_ve_kacislanir() {
        assert_eq!(search_pattern(Some("  ")), None);
        assert_eq!(search_pattern(None), None);
        assert_eq!(search_pattern(Some("KAYIKÇIOĞLU")).unwrap(), "%kayikçioğlu%");
        assert_eq!(search_pattern(Some("İSTANBUL")).unwrap(), "%istanbul%");
        assert_eq!(search_pattern(Some("50%_a\\")).unwrap(), "%50\\%\\_a\\\\%");
        // Kullanıcı adlarıyla aynı katlama kuralı.
        assert_eq!(search_pattern(Some("ÇALIŞAN")).unwrap(), format!("%{}%", username_key("ÇALIŞAN")));
    }

    fn tr() -> FixedOffset {
        FixedOffset::east_opt(3 * 3600).unwrap()
    }

    #[test]
    fn excel_tarihleri_turkiye_saatine_cevrilir_ve_hatalilar_atlanir() {
        // 2026-11-08 21:30 UTC = 9 Kasım 00:30 Türkiye saati.
        let dt = local(Some(1_794_173_400_000), tr()).unwrap();
        assert_eq!(dt.format("%d.%m.%Y %H:%M").to_string(), "09.11.2026 00:30");
        // Eski veride hatalı girilmiş, Excel'in gösteremeyeceği tarih.
        assert_eq!(local(Some(-61_396_743_892_000), tr()), None);
        assert_eq!(local(None, tr()), None);
    }

    #[test]
    fn gun_sayisi_rapordaki_gibi_iki_gunu_de_sayar() {
        let d = |s: &str| NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M").ok();
        assert_eq!(stay_days(d("2026-11-01 23:50"), d("2026-11-02 00:10")), Some(2));
        assert_eq!(stay_days(d("2026-11-01 08:00"), d("2026-11-01 18:00")), Some(1));
        assert_eq!(stay_days(None, d("2026-11-01 18:00")), None);
    }

    #[test]
    fn dosya_adi_tarih_araligini_icerir() {
        let p = |from, to| RaporQuery { page: None, q: None, from, to, tz: None };
        // 1 Kasım 00:00 ve 8 Kasım 23:59 Türkiye saati.
        let range = p(Some(1_793_480_400_000), Some(1_794_171_599_000));
        assert_eq!(export_filename("Akbaşlar", &range, tr()), "Akbaşlar rapor 01.11.2026-08.11.2026.xlsx");
        assert_eq!(export_filename("X", &p(None, None), tr()), "X rapor.xlsx");
        assert_eq!(percent_encode("Ş a.xlsx"), "%C5%9E%20a.xlsx");
    }

    #[test]
    fn gecerli_bir_xlsx_uretilir() {
        let note: Note = serde_json::from_value(serde_json::json!({
            "_id": Uuid::new_v4(), "getiren": "34ABC", "dorse": "34XYZ+300", "firma": "ÖZ İNŞAAT",
            "girisTarihi": 1_793_480_400_000i64, "cikisTarihi": 1_794_171_599_000i64
        }))
        .unwrap();
        let bytes = build_xlsx(&[note], tr()).unwrap();
        assert_eq!(&bytes[..2], b"PK"); // xlsx bir zip arşivi
    }

    async fn insert(pool: &sqlx::SqlitePool, dorse: &str, firma: &str) -> sqlx::Result<()> {
        sqlx::query(
            "INSERT INTO notes (id, tenant_id, getiren, dorse, firma, cikis_tarihi)
             VALUES (?1, (SELECT id FROM tenants LIMIT 1), 'X', ?2, ?3, 1)",
        )
        .bind(Uuid::new_v4())
        .bind(dorse)
        .bind(firma)
        .execute(pool)
        .await?;
        Ok(())
    }

    // `rapor` handler'ındaki filtrenin aynısıyla veritabanında eşleşme sayısı.
    // `search_text`'i INSERT trigger'ı doldurur (migrations/0002).
    async fn matches(pool: &sqlx::SqlitePool, q: &str) -> sqlx::Result<i64> {
        sqlx::query_scalar("SELECT COUNT(*) FROM notes WHERE search_text LIKE ?1 ESCAPE '\\'")
        .bind(search_pattern(Some(q)))
        .fetch_one(pool)
        .await
    }

    #[sqlx::test]
    async fn turkce_buyuk_kucuk_harf_duyarsiz_arar(pool: sqlx::SqlitePool) -> sqlx::Result<()> {
        insert(&pool, "34ABI12", "KAYIKCIOGLU").await?;
        insert(&pool, "34ŞÇ99", "İSTANBUL ÖZ ÜNAL").await?;
        insert(&pool, "06XY1", "yağcı ltd").await?;
        insert(&pool, "07ZZ1", "%50 indirim_A").await?;

        assert_eq!(matches(&pool, "kayikcioglu").await?, 1);
        assert_eq!(matches(&pool, "abi").await?, 1);
        assert_eq!(matches(&pool, "şç").await?, 1);
        assert_eq!(matches(&pool, "istanbul öz ünal").await?, 1);
        assert_eq!(matches(&pool, "ıstanbul").await?, 1);
        assert_eq!(matches(&pool, "YAĞCI").await?, 1);
        assert_eq!(matches(&pool, "%").await?, 1); // joker değil, düz karakter
        assert_eq!(matches(&pool, "_a").await?, 1);
        assert_eq!(matches(&pool, "1kay").await?, 0); // alan sınırını aşmaz
        assert_eq!(matches(&pool, "yok").await?, 0);
        Ok(())
    }

    // UPDATE trigger'ı: alan değişince arama metni de güncellenir.
    #[sqlx::test]
    async fn guncellenen_kayit_yeni_degeriyle_bulunur(pool: sqlx::SqlitePool) -> sqlx::Result<()> {
        insert(&pool, "34AA1", "ESKİ FİRMA").await?;
        assert_eq!(matches(&pool, "eski firma").await?, 1);
        sqlx::query("UPDATE notes SET firma = 'YENİ IŞIK', goturen = 'Çekici'")
            .execute(&pool)
            .await?;
        assert_eq!(matches(&pool, "eski").await?, 0);
        assert_eq!(matches(&pool, "yeni işık").await?, 1); // "IŞIK" -> "işik"
        assert_eq!(matches(&pool, "ÇEKİCİ").await?, 1);
        Ok(())
    }
}
