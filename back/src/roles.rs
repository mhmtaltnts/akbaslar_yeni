// Rol adları. Frontend'deki `utils/config/roles.ts` ile aynı string'ler.
pub const ADMIN: &str = "Kurucu";
pub const MANAGER: &str = "Yönetici";

// Gümrük memuru: izinli otoparkların araçlarını görür ve sadece gümrük
// bilgisi girer. Kurucu/Yönetici rolüyle birlikte verilmişse o rollerin
// yetkileri geçerlidir (frontend'deki `defineAbilityFor` sırasıyla aynı).
pub const OFFICER: &str = "Memur";

// Otoparkların kendisini (tenant) yöneten platform yöneticisi. Bir otoparkın
// kurucusu bu rolü KENDİ kullanıcılarına veremez; sadece başka bir
// SüperAdmin verebilir (bkz. `handlers::users::sanitize_roles`).
pub const SUPER_ADMIN: &str = "SüperAdmin";

/// Rol listesi "sadece memur" yetkisi mi taşıyor?
pub fn is_officer(roles: &[String]) -> bool {
    let has = |role: &str| roles.iter().any(|r| r == role);
    has(OFFICER) && !has(ADMIN) && !has(MANAGER) && !has(SUPER_ADMIN)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn roles(list: &[&str]) -> Vec<String> {
        list.iter().map(|r| r.to_string()).collect()
    }

    #[test]
    fn sadece_memur_kisitlidir() {
        assert!(is_officer(&roles(&["Memur"])));
        assert!(is_officer(&roles(&["Memur", "Çalışan"])));
        assert!(!is_officer(&roles(&["Memur", "Kurucu"])));
        assert!(!is_officer(&roles(&["Memur", "Yönetici"])));
        assert!(!is_officer(&roles(&["Çalışan"])));
    }
}
