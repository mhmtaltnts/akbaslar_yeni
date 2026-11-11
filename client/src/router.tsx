import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";
import { queryClient } from "./lib/query-client";
import { onAuthChanged } from "./lib/api";
import { getActivePark, getToken, setActivePark } from "./lib/auth";
import { jwtDecode } from "jwt-decode";
import { SUPER_ADMIN } from "./utils/config/roles";
import "./index.css";

const router = createRouter({
  routeTree,
  // Route loader'ları veriyi bu QueryClient ile önceden yükler.
  context: { queryClient },
  // Bağlantının üzerine gelince önceden yükle: SADECE fareli cihazlarda.
  // Dokunmatik ekranda (özellikle iOS Safari) parmak değer değmez başlayan
  // ön yükleme, Safari'nin tıklamayı vermeden önce sayfadaki değişikliği
  // beklemesine yol açıp düğme tepkisini geciktiriyordu.
  defaultPreload: window.matchMedia("(hover: hover) and (pointer: fine)").matches ? "intent" : false,
  // Önbellekteki veriyi TanStack Query yönetir; router'ın kendi loader
  // önbelleği her zaman query'ye sorsun.
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

// Rol/otopark değişikliği token'a yansıyınca (bkz. lib/api.ts): SüperAdmin
// yetkisi alındıysa park seçimi bırakılır; tüm sorgular yeni yetkiyle
// yeniden yüklenir, açık sayfanın loader'ı da yeniden çalışır.
onAuthChanged(() => {
  const token = getToken();
  const roles = token ? jwtDecode<{ UserInfo: { roles: string[] } }>(token).UserInfo.roles : [];
  if (getActivePark() && !roles.includes(SUPER_ADMIN)) setActivePark(null);
  queryClient.invalidateQueries();
  router.invalidate();
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("app")!;

if (!rootElement.innerHTML) {
  ReactDOM.createRoot(rootElement).render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}
