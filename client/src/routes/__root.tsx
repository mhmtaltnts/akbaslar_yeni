/// <reference types="vite/client" />
import { Outlet, createRootRoute, HeadContent, Scripts, Link } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useSelector } from "react-redux";
import { Toaster } from "sonner";
import { selectCurrentTheme } from "@/appStore/themeSlice";
import { ThemeSync } from "@/components/app/theme";
import { EmptyState } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { MapPinOff } from "lucide-react";

export const Route = createRootRoute({
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
  const dark = useSelector(selectCurrentTheme);
  return (
    <>
      <HeadContent />
      <ThemeSync />
      <Outlet />
      <Toaster richColors position="top-center" theme={dark ? "dark" : "light"} />
      <Scripts />
      <TanStackRouterDevtools position="bottom-right" />
    </>
  );
}
