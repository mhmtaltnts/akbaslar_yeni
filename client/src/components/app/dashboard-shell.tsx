import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
  Truck,
  Users,
  X,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLogout } from "@/api/auth";
import { tenantsQuery } from "@/api/tenants";
import { setActivePark, useActivePark } from "@/lib/auth";
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

// SüperAdmin'in hangi otoparkın verisiyle çalıştığını seçtiği alan. Seçim
// değişince otoparka bağlı tüm önbellek (araçlar, rapor, kullanıcılar)
// sıfırlanıp yeni parktan yüklenir.
function ParkSwitcher() {
  const { tenantId } = useAuth();
  const active = useActivePark();
  const qc = useQueryClient();
  const { data: tenants } = useQuery(tenantsQuery);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Seçili park silinmiş/bulunamıyorsa kendi otoparka dön; Otoparklar
  // sayfasından adı değiştirildiyse saklanan adı güncelle.
  useEffect(() => {
    if (!tenants || !active) return;
    const park = tenants.find((t) => t.id === active.id);
    if (!park) setActivePark(null);
    else if (park.name !== active.name) setActivePark({ id: park.id, name: park.name });
  }, [tenants, active]);

  const onChange = (id: string) => {
    const park = tenants?.find((t) => t.id === id);
    setActivePark(!park || id === tenantId ? null : { id: park.id, name: park.name });
    qc.resetQueries({ predicate: (q) => !["tenants", "officers"].includes(q.queryKey[0] as string) });
    // Bir kaydın/kullanıcının detayındaysa o kayıt diğer parkta yok: listeye dön.
    if (/^\/dashboard\/(notes|rapor|users)\/./.test(pathname)) {
      navigate({ to: `/dashboard/${pathname.split("/")[2]}` });
    }
  };

  return (
    <div className="px-5 pb-2">
      <label htmlFor="park-switcher" className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wider uppercase">
        Otopark
      </label>
      <select
        id="park-switcher"
        value={active?.id ?? tenantId ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={!tenants}
        className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-9 w-full rounded-md border px-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
      >
        {!tenants && <option value={tenantId ?? ""}>Yükleniyor...</option>}
        {tenants?.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
            {t.active ? "" : " (askıda)"}
          </option>
        ))}
      </select>
    </div>
  );
}

// Masaüstünde kenar çubuğu simge durumuna daraltılabilir; seçim bu
// tarayıcıda hatırlanır. (Mobil çekmece her zaman tam genişlikte.)
const COLLAPSED_KEY = "sidebarCollapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function SidebarContent({
  onNavigate,
  collapsed = false,
  onToggleCollapsed,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const items = useNavItems();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { fullname, status, parkName, isSuperAdmin } = useAuth();
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
      <div className={cn("flex h-16 items-center gap-2", collapsed ? "justify-center px-2" : "px-5")}>
        {!collapsed && (
          <Link to="/dashboard" onClick={onNavigate} className="min-w-0 flex-1">
            <Brand name={parkName ?? "Tır Parkı"} className="text-[15px]" />
          </Link>
        )}
        {onToggleCollapsed && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground shrink-0"
            onClick={onToggleCollapsed}
            title={collapsed ? `Menüyü genişlet (${parkName ?? ""})` : "Menüyü daralt"}
            aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
        )}
      </div>

      {isSuperAdmin && !collapsed && <ParkSwitcher />}

      <nav className={cn("flex-1 space-y-1 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
        {!collapsed && (
          <p className="text-muted-foreground mb-2 px-3 text-[11px] font-semibold tracking-wider uppercase">
            Menü
          </p>
        )}
        {items.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              aria-label={collapsed ? item.label : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-0" : "px-3",
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
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-sidebar-border border-t", collapsed ? "p-2" : "p-3")}>
        <div
          className={cn(
            "flex items-center rounded-lg py-2",
            collapsed ? "flex-col gap-2 px-0" : "gap-3 px-2",
          )}
        >
          <div
            className="bg-primary/15 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
            title={collapsed ? `${fullname ?? ""} · ${status}` : undefined}
          >
            {initials(fullname)}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{fullname}</p>
              <p className="text-muted-foreground truncate text-xs">{status}</p>
            </div>
          )}
          <ThemeToggle />
        </div>
        <Button
          variant="ghost"
          className={cn(
            "text-muted-foreground hover:text-destructive mt-1 w-full gap-3",
            collapsed ? "justify-center px-0" : "justify-start px-3",
          )}
          onClick={onLogout}
          disabled={logout.isPending}
          title={collapsed ? "Çıkış Yap" : undefined}
          aria-label="Çıkış Yap"
        >
          <LogOut className="size-[18px]" />
          {!collapsed && "Çıkış Yap"}
        </Button>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, c ? "0" : "1");
      } catch {
        // depolama kapalıysa sadece bu oturumda geçerli
      }
      return !c;
    });
  const { parkName } = useAuth();
  const { pathname } = useLocation();

  // Sayfa değişince mobil menüyü kapat.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="bg-background min-h-screen">
      {/* Masaüstü kenar çubuğu */}
      <aside
        className={cn(
          "border-sidebar-border bg-sidebar fixed inset-y-0 left-0 z-30 hidden border-r transition-[width] duration-200 lg:block",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <SidebarContent collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      {/* Mobil üst çubuk */}
      <header className="bg-background/80 sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-4 backdrop-blur lg:hidden">
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Menüyü aç">
          <Menu />
        </Button>
        <Brand name={parkName ?? "Tır Parkı"} className="min-w-0 text-sm" />
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

      <main className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-16" : "lg:pl-64")}>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
