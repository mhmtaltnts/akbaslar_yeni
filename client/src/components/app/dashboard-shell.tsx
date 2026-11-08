import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  Truck,
  Users,
  X,
} from "lucide-react";
import { useLogout } from "@/api/auth";
import useAuth from "@/utils/hooks/useAuth";
import defineAbilityFor from "@/utils/permission";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Brand } from "./page";
import { ThemeToggle } from "./theme";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Truck;
  exact?: boolean;
  show: boolean;
};

function useNavItems(): NavItem[] {
  const { roles, isSuperAdmin } = useAuth();
  const ability = defineAbilityFor(roles);
  return [
    { to: "/dashboard", label: "Genel Bakış", icon: LayoutDashboard, exact: true, show: true },
    { to: "/dashboard/notes", label: "Parktaki Araçlar", icon: Truck, exact: true, show: true },
    {
      to: "/dashboard/notes/new",
      label: "Araç Girişi",
      icon: PlusCircle,
      show: ability.can("create", "notes"),
    },
    { to: "/dashboard/rapor", label: "Rapor", icon: ClipboardList, show: ability.can("read", "rapor") },
    { to: "/dashboard/users", label: "Kullanıcılar", icon: Users, show: ability.can("read", "users") },
    { to: "/dashboard/parks", label: "Otoparklar", icon: Building2, show: isSuperAdmin },
  ].filter((i) => i.show);
}

function initials(name?: string) {
  return (name ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toLocaleUpperCase("tr-TR"))
    .join("");
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const items = useNavItems();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { fullname, status, tenantName } = useAuth();
  const logout = useLogout();

  // Sıra için bkz. `useLogout`: sunucu → sayfa → yerel oturum.
  const onLogout = async () => {
    await logout.mutateAsync();
    await navigate({ to: "/" });
    logout.clearSession();
  };

  const isActive = (item: NavItem) =>
    item.exact
      ? pathname.replace(/\/$/, "") === item.to
      : pathname.startsWith(item.to);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Link to="/dashboard" onClick={onNavigate} className="min-w-0">
          <Brand name={tenantName ?? "Tır Parkı"} className="text-[15px]" />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="text-muted-foreground mb-2 px-3 text-[11px] font-semibold tracking-wider uppercase">
          Menü
        </p>
        {items.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <item.icon
                className={cn(
                  "size-[18px] shrink-0",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-sidebar-border border-t p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="bg-primary/15 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
            {initials(fullname)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{fullname}</p>
            <p className="text-muted-foreground truncate text-xs">{status}</p>
          </div>
          <ThemeToggle />
        </div>
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-destructive mt-1 w-full justify-start gap-3 px-3"
          onClick={onLogout}
          disabled={logout.isPending}
        >
          <LogOut className="size-[18px]" />
          Çıkış Yap
        </Button>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { tenantName } = useAuth();
  const { pathname } = useLocation();

  // Sayfa değişince mobil menüyü kapat.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="bg-background min-h-screen">
      {/* Masaüstü kenar çubuğu */}
      <aside className="border-sidebar-border bg-sidebar fixed inset-y-0 left-0 z-30 hidden w-64 border-r lg:block">
        <SidebarContent />
      </aside>

      {/* Mobil üst çubuk */}
      <header className="bg-background/80 sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-4 backdrop-blur lg:hidden">
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Menüyü aç">
          <Menu />
        </Button>
        <Brand name={tenantName ?? "Tır Parkı"} className="min-w-0 text-sm" />
      </header>

      {/* Mobil çekmece */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="animate-in fade-in absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="bg-sidebar animate-in slide-in-from-left absolute inset-y-0 left-0 w-72 shadow-xl duration-200">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3"
              onClick={() => setOpen(false)}
              aria-label="Menüyü kapat"
            >
              <X />
            </Button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
