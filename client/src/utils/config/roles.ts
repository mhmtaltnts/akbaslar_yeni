export const ROLES = {
  Employee: "Çalışan",
  Officer: "Memur",
  Manager: "Yönetici",
  Admin: "Kurucu",
} as const;

export type Roles = (typeof ROLES)[keyof typeof ROLES][];

// Otopark (tenant) yönetimi rolü. Bilerek ROLES içinde değil: rol seçicide
// sadece SüperAdmin'e gösterilir (bir SüperAdmin başkasını SüperAdmin
// yapabilir; Kurucu bu rolü veremez, backend de engeller).
export const SUPER_ADMIN = "SüperAdmin";

// "Sadece memur" yetkisi: izinli otoparkların araçlarını görür, sadece gümrük
// bilgisi girer. Kurucu/Yönetici rolü de varsa o rollerin yetkisi geçerli.
// Backend'deki `roles::is_officer` ile aynı kural.
export function isOfficer(roles: readonly string[]) {
  return (
    roles.includes(ROLES.Officer) &&
    !roles.includes(ROLES.Admin) &&
    !roles.includes(ROLES.Manager) &&
    !roles.includes(SUPER_ADMIN)
  );
}
