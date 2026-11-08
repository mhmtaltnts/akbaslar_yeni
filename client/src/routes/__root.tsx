/// <reference types="vite/client" />
import { Outlet, createRootRouteWithContext, HeadContent, Scripts, Link } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "sonner";
import { useDarkMode } from "@/lib/theme";
import { EmptyState } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { MapPinOff } from "lucide-react";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <EmptyState
        icon={MapPinOff}
        title="Sayfa bulunamadı"
        description="Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir."
        action={
          <Button asChild size="sm">
            <Link to="/">Ana sayfaya dön</Link>
          </Button>
        }
      />
    </div>
  ),
});

function RootComponent() {
  const { dark } = useDarkMode();
  return (
    <>
      <HeadContent />
      <Outlet />
      <Toaster richColors position="top-center" theme={dark ? "dark" : "light"} />
      <Scripts />
      <TanStackRouterDevtools position="bottom-right" />
    </>
  );
}
