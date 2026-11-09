import { notesQuery } from "@/api/notes";
import type { Note } from "@/api/types";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, StatCard } from "@/components/app/page";
import { Plate } from "@/components/app/plate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { stayDays, timeAgo } from "@/lib/format";
import useAuth from "@/utils/hooks/useAuth";
import useTitle from "@/utils/hooks/useTitle";
import defineAbilityFor from "@/utils/permission";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  FileCheck2,
  Hourglass,
  PlusCircle,
  Truck,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  loader: ({ context }) => context.queryClient.prefetchQuery(notesQuery),
  component: RouteComponent,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "İyi geceler";
  if (h < 12) return "Günaydın";
  if (h < 18) return "İyi günler";
  return "İyi akşamlar";
}

function RouteComponent() {
  useTitle("Genel Bakış");
  const { fullname, roles, parkName } = useAuth();
  const ability = defineAbilityFor(roles);

  const { data: notes = [] } = useQuery({ ...notesQuery, refetchInterval: 30000 });

  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const todayCount = notes.filter((n) => (n.girisTarihi ?? 0) >= startOfToday).length;
  const customsPending = notes.filter((n) => !n.gumrukBilgi).length;
  const longest = [...notes]
    .filter((n) => n.girisTarihi)
    .sort((a, b) => (a.girisTarihi ?? 0) - (b.girisTarihi ?? 0))[0];
  const recent: Note[] = notes.slice(0, 6); // zaten en yeni giriş üstte

  const quickActions = [
    ability.can("create", "notes") && {
      to: "/dashboard/notes/new",
      title: "Yeni araç girişi",
      desc: "Parka giren aracı kaydedin",
      icon: PlusCircle,
    },
    {
      to: "/dashboard/notes",
      title: "Parktaki araçlar",
      desc: ability.can("update", "notes", "all") ? "Çıkış ve gümrük işlemleri" : "Gümrük işlemleri",
      icon: Truck,
    },
    ability.can("read", "rapor") && {
      to: "/dashboard/rapor",
      title: "Rapor",
      desc: "Çıkışı yapılmış araç geçmişi",
      icon: ClipboardList,
    },
    ability.can("read", "users") && {
      to: "/dashboard/users",
      title: "Kullanıcılar",
      desc: "Personel ve yetkiler",
      icon: Users,
    },
  ].filter(Boolean) as { to: string; title: string; desc: string; icon: typeof Truck }[];

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${fullname?.split(" ")[0] ?? ""}`}
        description={`${parkName ?? ""} · ${new Date().toLocaleDateString("tr-TR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}`}
        actions={
          ability.can("create", "notes") && (
            <Button asChild>
              <Link to="/dashboard/notes/new">
                <PlusCircle /> Araç Girişi
              </Link>
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Parktaki araç" value={notes.length} icon={Truck} hint="Çıkışı yapılmamış araçlar" />
        <StatCard label="Bugün giren" value={todayCount} icon={CalendarClock} tone="success" />
        <StatCard
          label="Gümrük bekleyen"
          value={customsPending}
          icon={FileCheck2}
          tone="warning"
          hint="Gümrük bilgisi girilmemiş"
        />
        <StatCard
          label="En uzun bekleyen"
          value={longest ? `${stayDays(longest.girisTarihi)} gün` : "—"}
          icon={Hourglass}
          tone="muted"
          hint={longest ? <Plate value={longest.dorse} size="sm" /> : "Parkta araç yok"}
        />
      </div>

      {/* Bölümler min-w-0: grid hücresi varsayılan olarak içeriğinden dar
          olamıyor, uzun plakalar dar telefonda sayfayı yatay taşırıyordu. */}
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="bg-card min-w-0 rounded-xl border shadow-xs lg:col-span-3">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="font-semibold">Son girişler</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard/notes">
                Tümü <ArrowRight />
              </Link>
            </Button>
          </div>
          {recent.length === 0 ? (
            <p className="text-muted-foreground px-5 py-10 text-center text-sm">
              Parkta araç bulunmuyor.
            </p>
          ) : (
            <ul className="divide-y">
              {recent.map((n) => (
                <li key={n.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <Truck className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Plate value={n.dorse} size="sm" truncate />
                      <span className="text-muted-foreground text-xs">çekici</span>
                      <Plate value={n.getiren} size="sm" truncate />
                    </div>
                    <p className="text-muted-foreground mt-1 truncate text-xs">
                      {n.firma || "Firma belirtilmemiş"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                      {timeAgo(n.girisTarihi)}
                    </span>
                    {n.gumrukBilgi ? (
                      <Badge variant="secondary">Gümrük tamam</Badge>
                    ) : (
                      <Badge className="bg-warning/20 text-warning-foreground dark:text-warning">
                        Gümrük bekliyor
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="min-w-0 space-y-3 lg:col-span-2">
          <h2 className="px-1 font-semibold">Hızlı işlemler</h2>
          {quickActions.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="bg-card hover:border-primary/40 group flex items-center gap-4 rounded-xl border p-4 shadow-xs transition-all hover:shadow-md"
            >
              <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                <a.icon className="size-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-muted-foreground text-xs">{a.desc}</p>
              </div>
              <ArrowRight className="text-muted-foreground group-hover:text-primary size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}
