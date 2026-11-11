// Alan adına göre otopark: aynı uygulama birden çok alan adından
// (akbaslartirparki.com, muallimkoykonak.com) yayınlanır; isteğin geldiği
// alan adı hangi otoparkın "sitesi" olduğunu belirler (`tenants.domain`).
//
// Alan adı tek başına YETKİ VERMEZ: sadece "bu otoparkta çalışmak istiyorum"
// bilgisini taşır. Kullanıcının o otoparkta çalışıp çalışamayacağına
// `AuthUser` karar verir (bkz. extractors::auth_user).

use axum::http::{header, HeaderMap};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::error::AppError;

// "WWW.Akbaslartirparki.com:443" -> "akbaslartirparki.com". nginx `Host $host`
// iletir; IP ile ya da yerelden açılırsa eşleşen otopark olmaz (None).
pub fn normalize_host(raw: &str) -> Option<String> {
    let host = raw.trim().to_ascii_lowercase();
    // IPv6 ("[::1]:80") ve port ("x.com:443")
    let host = if host.starts_with('[') {
        host.split(']').next().map(|h| format!("{h}]"))?
    } else {
        host.split(':').next()?.to_string()
    };
    let host = host.strip_prefix("www.").unwrap_or(&host).trim_end_matches('.');
    if host.is_empty() {
        None
    } else {
        Some(host.to_string())
    }
}

pub fn request_host(headers: &HeaderMap) -> Option<String> {
    headers
        .get(header::HOST)
        .and_then(|v| v.to_str().ok())
        .and_then(normalize_host)
}

// İsteğin alan adına bağlı, askıda olmayan otopark.
pub async fn tenant_for_request(
    db: &SqlitePool,
    headers: &HeaderMap,
) -> Result<Option<Uuid>, AppError> {
    let Some(host) = request_host(headers) else {
        return Ok(None);
    };
    let id: Option<Uuid> =
        sqlx::query_scalar("SELECT id FROM tenants WHERE domain = ?1 AND active")
            .bind(host)
            .fetch_optional(db)
            .await?;
    Ok(id)
}

#[cfg(test)]
mod tests {
    use super::normalize_host;

    #[test]
    fn www_port_ve_buyuk_harf_atilir() {
        assert_eq!(normalize_host("WWW.Akbaslartirparki.com:443").as_deref(), Some("akbaslartirparki.com"));
        assert_eq!(normalize_host("muallimkoykonak.com").as_deref(), Some("muallimkoykonak.com"));
        assert_eq!(normalize_host("muallimkoykonak.com.").as_deref(), Some("muallimkoykonak.com"));
    }

    #[test]
    fn ip_ve_bos_host() {
        assert_eq!(normalize_host("92.112.180.41").as_deref(), Some("92.112.180.41"));
        assert_eq!(normalize_host("[::1]:3500").as_deref(), Some("[::1]"));
        assert_eq!(normalize_host("   "), None);
    }
}
