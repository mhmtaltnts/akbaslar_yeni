import { useEffect } from "react";
import { Outlet, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { DashboardShell } from "@/components/app/dashboard-shell";
import { PageLoader } from "@/components/app/page";
import { refreshAccessToken } from "@/lib/api";
import { getPersist, getToken, useToken } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
  // Alt sayfaların loader'ları çalışmadan ÖNCE oturumu hazırla: token yoksa
  // ve "Beni hatırla" açıksa refresh cookie ile yenisini al; olmazsa girişe.
  beforeLoad: async () => {
    if (!getToken() && getPersist()) await refreshAccessToken();
    if (!getToken()) throw redirect({ to: "/login" });
  },
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <PageLoader label="Oturum doğrulanıyor..." />
    </div>
  ),
  component: RouteComponent,
});

function RouteComponent() {
  const token = useToken();
  const navigate = useNavigate();

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
