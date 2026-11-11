import { AbilityBuilder, createMongoAbility } from "@casl/ability";
import type { Roles } from "../config/roles";

export default function defineAbilityFor(roles: Roles) {
  const { can, cannot, build } = new AbilityBuilder(createMongoAbility);

  if (roles.includes("Kurucu")) {
    can("manage", "all"); // read-write access to everything
  } else if (roles.includes("Yönetici")) {
    can("manage", "all");
    // Kullanıcı yönetimi sadece Kurucu'ya açık (backend de reddediyor).
    cannot("read", "users");
  } else if (roles.includes("Memur")) {
    // Sadece araçları görür ve gümrük bilgisi girer; giriş/çıkış, rapor ve
    // kullanıcılar kapalı (backend de ayrıca reddediyor).
    can("read", "notes");
    can("update", "notes", ["Gümrük"]);
    cannot("create", "notes");
    cannot("delete", "notes");
    cannot("read", "users");
    cannot("read", "rapor");
  } else if (roles.includes("Çalışan")) {
    can("create", "notes");
    can("update", "notes");
    can("read", "notes"); // read-only access to everything
  }

  return build();
}
