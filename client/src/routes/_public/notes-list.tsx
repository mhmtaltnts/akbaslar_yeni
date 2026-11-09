import { useState } from "react";
import { publicNotesQuery, publicParksQuery } from "@/api/public";
import { useQuery } from "@tanstack/react-query";
import { EmptyState, PageLoader, SearchInput } from "@/components/app/page";
import { Plate } from "@/components/app/plate";
import { formatDateTime, matchesSearch, stayLabel } from "@/lib/format";
import { useSiteBrand } from "@/utils/hooks/useSite";
import useTitle from "@/utils/hooks/useTitle";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, Search, Truck } from "lucide-react";

// Çoklu otopark: hangi otoparkın listeleneceği `?park=<kod>` ile seçiliyor,
// böylece her otopark kendi müşterilerine doğrudan bir link verebilir.
export const Route = createFileRoute("/_public/notes-list")({
  validateSearch: (search: Record<string, unknown>): { park?: string } => ({
    park: typeof search.park === "string" ? search.park : undefined,
  }),
  component: PublicNotesList,
});

function PublicNotesList() {
  useTitle("Misafir Araçlar");

  const { park } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [search, setSearch] = useState("");

  const { data: parks, isLoading: parksLoading } = useQuery(publicParksQuery);
  const { site } = useSiteBrand();

  // Adresteki seçim; yoksa sitenin alan adının otoparkı (akbaslartirparki.com
  // -> Gebze Konak); o da yoksa ve tek otopark varsa seçim yaptırmadan o.
  const slug = park ?? site?.slug ?? (parks?.length === 1 ? parks[0].slug : undefined);
  const current = parks?.find((p) => p.slug === slug);

  const { data: notes, isLoading, isSuccess, isError } = useQuery({
    ...publicNotesQuery(slug ?? ""),
    enabled: Boolean(slug),
    refetchInterval: 15000,
  });

  const filtered =
    notes?.filter(
      (n) =>
        matchesSearch(n.dorse, search) ||
        matchesSearch(n.getiren, search) ||
        matchesSearch(n.firma, search),
    ) ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6 space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Misafir Araçlar</h1>
        <p className="text-muted-foreground">
          Dorsenizin parkta olup olmadığını plaka veya firma ile arayın.
        </p>
      </div>

      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
          {parks && parks.length > 1 && (
            <div className="relative sm:w-64">
              <Building2 className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <select
                className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-9 w-full appearance-none rounded-md border pr-3 pl-9 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                value={slug ?? ""}
                onChange={(e) => navigate({ search: { park: e.target.value || undefined } })}
              >
                <option value="">Otopark seçin</option>
                {parks.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Dorse, çekici veya firma..."
            className="sm:max-w-none sm:flex-1"
          />
        </div>

        {(parksLoading || isLoading) && <PageLoader />}
        {!parksLoading && !slug && (
          <EmptyState icon={Building2} title="Otopark seçin" description="Araçları görmek için yukarıdan bir otopark seçin." />
        )}
        {isError && (
          <EmptyState icon={Building2} title="Otopark bulunamadı" description="Bağlantıdaki otopark kodu geçersiz ya da otopark askıya alınmış." />
        )}
        {isSuccess && notes.length === 0 && (
          <EmptyState icon={Truck} title="Parkta araç yok" description={current?.name} />
        )}
        {isSuccess && notes.length > 0 && filtered.length === 0 && (
          <EmptyState icon={Search} title="Sonuç bulunamadı" description={`"${search}" ile eşleşen araç yok.`} />
        )}

        {isSuccess && filtered.length > 0 && (
          <>
            <ul className="divide-y">
              {filtered.map((n) => (
                <li
                  key={n.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1.5 px-4 py-3 sm:grid-cols-[9rem_10rem_1fr_auto] sm:px-5"
                >
                  <div>
                    <Plate value={n.dorse} />
                  </div>
                  <div className="text-muted-foreground order-3 flex items-center gap-1.5 text-xs sm:order-none">
                    <Truck className="size-3.5" /> <Plate value={n.getiren} size="sm" />
                  </div>
                  <p className="order-4 min-w-0 truncate text-sm font-medium sm:order-none">
                    {n.firma || "—"}
                  </p>
                  <div className="text-right">
                    <p className="text-sm whitespace-nowrap">{formatDateTime(n.girisTarihi)}</p>
                    <p className="text-muted-foreground text-xs">{stayLabel(n.girisTarihi)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="text-muted-foreground border-t px-5 py-3 text-xs">
              {current?.name} · {notes?.length} araç · 15 saniyede bir güncellenir
            </div>
          </>
        )}
      </div>
    </div>
  );
}
