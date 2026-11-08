// Node'da `require('./allowedOrigins')` ile dosyaları birbirine bağlıyorduk.
// Rust'ta bunun karşılığı `mod` bildirimleri: her biri aynı isimde bir .rs
// dosyasını (burada config/allowed_origins.rs ve config/cors.rs) bu modüle
// dahil ediyor.
mod allowed_origins;
mod cors;

// `pub use` ile iç fonksiyonu dışarıya (main.rs'e) yeniden ihraç ediyoruz;
// böylece dışarıdan `config::build_cors_layer()` diye çağrılabiliyor.
pub use cors::build_cors_layer;
