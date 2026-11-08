import { useSelector } from "react-redux";
import { selectCurrentToken } from "../../appStore/authSlice";
import { jwtDecode } from "jwt-decode";
import { SUPER_ADMIN, type Roles } from "../config/roles";

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
  const token = useSelector(selectCurrentToken);
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
      tenantId,
      tenantName,
    };
  }

  return {
    username: undefined,
    roles: [] as Roles,
    isManager,
    isAdmin,
    isSuperAdmin: false,
    status,
    tenantId: undefined,
    tenantName: undefined,
  };
};
export default useAuth;
