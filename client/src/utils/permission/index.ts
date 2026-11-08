import { AbilityBuilder, createMongoAbility } from "@casl/ability";
import type { Roles } from "../config/roles";

export default function defineAbilityFor(roles: Roles) {
  const { can, cannot, build } = new AbilityBuilder(createMongoAbility);

  if (roles.includes("Kurucu")) {
    can("manage", "all"); // read-write access to everything
  } else if (roles.includes("Yönetici")) {
    can("manage", "all"); // read-only access to everything
  } else if (roles.includes("Memur")) {
    can("read", "notes");
    can("create", "notes", ["Gümrük"]);
    can("update", "notes", ["Gümrük"]);
    cannot("delete", "notes");
    cannot("read", "users");
    cannot("read", "rapor");
    cannot("create", "notes"); // read-only access to everything
  } else if (roles.includes("Çalışan")) {
    can("create", "notes");
    can("update", "notes");
    can("read", "notes"); // read-only access to everything
  }

  return build();
}
