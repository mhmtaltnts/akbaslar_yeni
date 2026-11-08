export const ROLES = {
  Employee: "Çalışan",
  Officer: "Memur",
  Manager: "Yönetici",
  Admin: "Kurucu",
} as const;

export type Roles = (typeof ROLES)[keyof typeof ROLES][];

// Otopark (tenant) yönetimi rolü. Bilerek ROLES içinde değil: kullanıcı
// formlarındaki rol listesinde görünmesin, sadece backend'in verdiği bir rol.
export const SUPER_ADMIN = "SüperAdmin";
