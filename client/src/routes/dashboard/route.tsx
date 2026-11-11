import { useEffect } from "react";
import { Outlet, createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { DashboardShell } from "@/components/app/dashboard-shell";
import { PageLoader } from "@/components/app/page";
import { refreshAccessToken } from "@/lib/api";
import { getPersist, getToken, useToken } from "@/lib/auth";
import { ROLES, SUPER_ADMIN, isOfficer } from "@/utils/config/roles";
import { jwtDecode } from "jwt-decode";

// Gümrük memurunun açabileceği sayfalar: genel bakış, parktaki araçlar ve
// gümrük formu. Diğerlerine (giriş, çıkış, rapor, kullanıcılar...) adres
// çubuğundan gidilirse araç listesine yönlendirilir.
const OFFICER_PATHS = [/^\/dashboard\/?$/, /^\/dashboard\/notes\/?$/, /^\/dashboard\/notes\/[^/]+\/gumruk\/?$/];

// Kullanıcılar sayfaları sadece Kurucu (ve SüperAdmin) içindir.
const USERS_PATH = /^\/dashboard\/users(\/|$)/;

// Rolün açamayacağı bir sayfaya adres çubuğundan gidilirse nereye
// yönlendirileceği; erişebiliyorsa null.
function blockedRedirect(pathname: string, token: string) {
  try {
    const { roles } = jwtDecode<{ UserInfo: { roles: string[] } }>(token).UserInfo;
    if (isOfficer(roles) && !OFFICER_PATHS.some((re) => re.test(pathname))) return "/dashboard/notes";
    if (USERS_PATH.test(pathname) && !roles.includes(ROLES.Admin) && !roles.includes(SUPER_ADMIN))
      return "/dashboard";
    return null;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/dashboard")({
  // Alt sayfaların loader'ları çalışmadan ÖNCE oturumu hazırla: token yoksa
  // ve "Beni hatırla" açıksa refresh cookie ile yenisini al; olmazsa girişe.
  beforeLoad: async ({ location }) => {
    if (!getToken() && getPersist()) await refreshAccessToken();
    const token = getToken();
    if (!token) throw redirect({ to: "/login" });
    const to = blockedRedirect(location.pathname, token);
    if (to) throw redirect({ to });
  },
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <PageLoader label="Oturum doğrulanıyor..." />
    </div>
  ),
  component: RouteComponent,
});

// Panel açıldıktan sonra, tarayıcı boştayken sık kullanılan sayfaların KODU
// arkada indirilir (veri değil: rapor gibi büyük verileri boşuna indirmeyelim).
// Sayfalar ilk dokunuşta indirilen ayrı parçalar; telefonda bağlantı ön
// yüklemesi kapalı olduğu için (bkz. router.tsx) her ilk geçiş bunu bekliyordu.
const PRELOAD_ROUTE_IDS = [
  "/dashboard/",
  "/dashboard/notes/",
  "/dashboard/notes/new",
  "/dashboard/notes/$noteId/cikis",
  "/dashboard/notes/$noteId/gumruk",
  "/dashboard/rapor/",
] as const;

function usePreloadPages() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => {
      for (const id of PRELOAD_ROUTE_IDS) {
        const route = router.routesById[id];
        if (route) void router.loadRouteChunk(route).catch(() => {});
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [router]);
}

function RouteComponent() {
  const token = useToken();
  const navigate = useNavigate();
  usePreloadPages();

  // Kullanım sırasında oturum düşerse (refresh başarısız) girişe yönlendir.
  useEffect(() => {
    if (!token) navigate({ to: "/login" });
  }, [token, navigate]);

  if (!token) return null;

  return (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  );
}
