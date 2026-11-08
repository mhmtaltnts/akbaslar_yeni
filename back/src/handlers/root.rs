use axum::response::Html;

use crate::error::AppError;

// routes/root.js'teki `router.get(['/', '/index', '/index.html'], (req,res) =>
// res.sendFile(...))` karşılığı. Dosyayı her istekte diskten okuyoruz --
// `sendFile` ile aynı davranış, HTML'i değiştirmek yeniden derleme
// gerektirmiyor.
pub async fn index() -> Result<Html<String>, AppError> {
    let html = tokio::fs::read_to_string("views/index.html").await?;
    Ok(Html(html))
}
