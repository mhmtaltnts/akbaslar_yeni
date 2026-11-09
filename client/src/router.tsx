import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";
import { queryClient } from "./lib/query-client";
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
