import { useActivePark, useToken } from "@/lib/auth";
import { jwtDecode } from "jwt-decode";
import { SUPER_ADMIN, isOfficer, type Roles } from "../config/roles";

type AccessToken = {
  UserInfo: {
    id: string;
    username: string;
    fullname: string;
    roles: string[];
    tenantId: string;
    tenantName: string;
  };
};

const useAuth = () => {
  const token = useToken();
  const activePark = useActivePark();
  let isManager = false;
  let isAdmin = false;
  let status = "Çalışan";

  if (token) {
    const {
      UserInfo: { username, roles, fullname, tenantId, tenantName },
    } = jwtDecode<AccessToken>(token);

    isManager = roles.includes("Yönetici");
    isAdmin = roles.includes("Kurucu");
    // Otoparkları (tenant) yöneten platform yöneticisi.
    const isSuperAdmin = roles.includes(SUPER_ADMIN);

    if (isManager) status = "Yönetici";
    if (isAdmin) status = "Kurucu";
    if (roles.includes("Memur")) status = "Memur";
    if (roles.includes("Çalışan")) status = "Çalışan";

    return {
      username,
      roles: roles as Roles,
      fullname,
      status,
      isManager,
      isAdmin,
      isSuperAdmin,
      // Gümrük memuru: birden çok otoparkın araçlarını görebilir.
      isOfficer: isOfficer(roles),
      tenantId,
      tenantName,
      // Ekranda gösterilecek otopark: SüperAdmin başka bir park seçtiyse o.
      parkName: isSuperAdmin && activePark ? activePark.name : tenantName,
    };
  }

  return {
    username: undefined,
    roles: [] as Roles,
    isManager,
    isAdmin,
    isSuperAdmin: false,
    isOfficer: false,
    status,
    tenantId: undefined,
    tenantName: undefined,
    parkName: undefined,
  };
};
export default useAuth;
