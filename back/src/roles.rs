// Rol adları. Frontend'deki `utils/config/roles.ts` ile aynı string'ler.
pub const ADMIN: &str = "Kurucu";

// Otoparkların kendisini (tenant) yöneten platform yöneticisi. Bir otoparkın
// kurucusu bu rolü KENDİ kullanıcılarına veremez; sadece başka bir
// SüperAdmin verebilir (bkz. `handlers::users::sanitize_roles`).
pub const SUPER_ADMIN: &str = "SüperAdmin";
