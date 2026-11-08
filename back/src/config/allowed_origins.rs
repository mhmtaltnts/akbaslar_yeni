// Node tarafındaki config/allowedOrigins.js'in birebir karşılığı.
// &'static str: programın ömrü boyunca yaşayan, sabit bir string dilimi.
// (JS'teki string literal'lardan farkı yok, Rust sadece bunu tipte belirtiyor.)
pub fn allowed_origins() -> Vec<&'static str> {
    vec![
        "http://localhost:3000",
        "https://www.akbaslartirparki.com",
        "https://www.akbaslartirparki.com/",
        "https://akbaslartirparki.com/",
        "https://akbaslartirparki.com",
    ]
}
