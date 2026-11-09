import { useEffect, useRef, useState } from "react";
import { downloadRaporExcel, raporQuery, useDeleteNote } from "@/api/notes";
import type { Note } from "@/api/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  EmptyState,
  ErrorAlert,
  PageHeader,
  PageLoader,
  SearchInput,
} from "@/components/app/page";
import { Plate } from "@/components/app/plate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiErrorMessage, formatDateTime, stayDays } from "@/lib/format";
import { type RaporSearch, validateRaporSearch, withPage } from "@/lib/rapor-search";
import useAuth from "@/utils/hooks/useAuth";
import useMediaQuery from "@/utils/hooks/useMediaQuery";
import { useIncrementalList } from "@/utils/hooks/useIncrementalList";
import useTitle from "@/utils/hooks/useTitle";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CalendarRange,
  ClipboardList,
  Eye,
  FileSpreadsheet,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/rapor/")({
  validateSearch: validateRaporSearch,
  loaderDeps: ({ search }) => search,
  // Beklemiyoruz: önbellekte veri varsa (örn. detaydan geri dönüş) sayfa hemen
  // açılır, yenileme arkada yapılır; yoksa bileşen yükleniyor durumunu gösterir.
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(raporQuery(deps));
  },
  component: RouteComponent,
});

// "2026-11-01" -> "01.11.2026"
const trDay = (d: string) => d.split("-").reverse().join(".");

function RouteComponent() {
  useTitle("Rapor");
  const rs = Route.useSearch();
  const { page = 1, q, from, to } = rs;
  const navigate = useNavigate({ from: Route.fullPath });
  const isDesktop = useMediaQuery("(min-width: 768px)"); // Tailwind md
  // Yetki ve silme satır başına değil sayfada bir kez hesaplanır.
  const { isAdmin, isManager } = useAuth();
  const canEdit = isAdmin || isManager;
  const deleteNote = useDeleteNote();
  const onDelete = (note: Note) => {
    if (window.confirm(`${note.dorse} kaydını silmek istediğinizden emin misiniz?`)) {
      // Optimistik: satır hemen kalkar; hata olursa hook geri alıp bildirir.
      deleteNote.mutate(note.id);
      toast.success("Kayıt silindi");
    }
  };
  // Filtre değişince 1. sayfaya dön. Fonksiyon biçimi: art arda iki değişiklik
  // (örn. önce başlangıç sonra bitiş tarihi) URL güncellenmeden gelirse ikincisi
  // eski duruma değil, birincinin sonucuna uygulansın.
  const setFilter = (patch: Partial<RaporSearch>, replace = false) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }), replace });

  // Kutudaki metin anında güncellenir; aramayı (URL + istek) yazmayı
  // bıraktıktan kısa süre sonra yaparız ki her tuşta istek gitmesin.
  const [search, setSearch] = useState(q ?? "");
  // URL'deki arama DIŞARIDAN değişirse (geri/ileri tuşu, link) kutuya yansıt.
  // Kendi yazdığımız değeri geri yazmıyoruz: kullanıcı o arada yazmaya devam
  // ettiyse yeni metni ezerdi.
  const sent = useRef(q ?? "");
  const setFilterRef = useRef(setFilter);
  setFilterRef.current = setFilter;
  useEffect(() => {
    if ((q ?? "") !== sent.current) {
      sent.current = q ?? "";
      setSearch(q ?? "");
    }
  }, [q]);
  useEffect(() => {
    const next = search.trim();
    if (next === (q ?? "")) return;
    const t = setTimeout(() => {
      sent.current = next;
      setFilterRef.current({ q: next || undefined }, true);
    }, 350);
    return () => clearTimeout(t);
  }, [search, q]);

  const { data, isLoading, isFetching, isSuccess, isError, error } = useQuery({
    ...raporQuery(rs),
    placeholderData: keepPreviousData, // sayfa/filtre değişirken tablo boşalmasın
  });

  const notes: Note[] = data?.notes ?? [];
  const count = data?.count ?? 0;
  const pageCount = data?.pageCount ?? 1;
  const filtered = notes; // arama ve tarih filtresi backend'de uygulanıyor
  // Bir sayfada 1000 kayıt var: hepsini tek seferde çizmek mobilde saniyelerce
  // kilitleniyordu. Sayfa/filtre değişince baştan başlar.
  const { visible, hasMore, sentinelRef } = useIncrementalList(filtered, `${page}|${q ?? ""}|${from ?? ""}|${to ?? ""}`);
  const hasFilter = Boolean(q || from || to);

  const goTo = (p: number) =>
    navigate({ search: (prev) => withPage(prev, Math.min(Math.max(1, p), pageCount)) });

  const [exporting, setExporting] = useState(false);
  const onExport = async () => {
    if (!from && !to && !window.confirm(`Tarih aralığı seçilmedi. ${count} kaydın tamamı Excel'e aktarılsın mı?`)) {
      return;
    }
    setExporting(true);
    try {
      await downloadRaporExcel(rs);
      toast.success(`${count} kayıt Excel'e aktarıldı`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const rangeLabel =
    from && to
      ? from === to
        ? `${trDay(from)} tarihinde`
        : `${trDay(from)} – ${trDay(to)} arasında`
      : from
        ? `${trDay(from)} sonrasında`
        : to
          ? `${trDay(to)} öncesinde`
          : "";

  return (
    <>
      <PageHeader
        title="Rapor"
        description={
          !isSuccess
            ? "Parktan çıkışı yapılmış araçlar"
            : hasFilter
              ? [rangeLabel && `${rangeLabel} çıkış yapan`, q && `"${q}" ile eşleşen`]
                  .filter(Boolean)
                  .join(", ")
                  .replace(/^./, (c) => c.toLocaleUpperCase("tr-TR")) + ` ${count} kayıt`
              : `Toplam ${count} çıkış kaydı`
        }
        actions={
          // Tarih aralığı Excel düğmesinin önünde: aktarılacak aralık seçilip
          // hemen yanındaki düğmeyle indirilir (tabloyu da filtreler).
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {/* Çıkış tarihi aralığı (iki gün de dahil). */}
            {/* Dar ekranda tam satır, kutular esner: sabit genişlikli iki tarih
                kutusu iPhone'da sayfayı yatay taşırıyordu. */}
            <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
              <CalendarRange className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
              <Input
                type="date"
                aria-label="Başlangıç tarihi (çıkış)"
                title="Başlangıç tarihi (çıkış)"
                className="min-w-0 flex-1 sm:w-auto sm:flex-none"
                value={from ?? ""}
                max={to}
                onChange={(e) => setFilter({ from: e.target.value || undefined })}
              />
              <span className="text-muted-foreground text-sm">–</span>
              <Input
                type="date"
                aria-label="Bitiş tarihi (çıkış)"
                title="Bitiş tarihi (çıkış)"
                className="min-w-0 flex-1 sm:w-auto sm:flex-none"
                value={to ?? ""}
                min={from}
                onChange={(e) => setFilter({ to: e.target.value || undefined })}
              />
              {(from || to) && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Tarih aralığını temizle"
                  title="Tarih aralığını temizle"
                  onClick={() => setFilter({ from: undefined, to: undefined })}
                >
                  <X />
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={onExport} disabled={exporting || !isSuccess || count === 0}>
              {exporting ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
              Excel'e aktar
            </Button>
          </div>
        }
      />

      <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <SearchInput value={search} onChange={setSearch} placeholder="Plaka, firma, gümrük ara..." />
          </div>
          {isSuccess && pageCount > 1 && (
            <Pagination page={page} pageCount={pageCount} onChange={goTo} disabled={isFetching} />
          )}
        </div>

        {isLoading && <PageLoader />}
        {isError && (
          <div className="p-4">
            <ErrorAlert message={apiErrorMessage(error)} />
          </div>
        )}
        {isSuccess && notes.length === 0 && !hasFilter && (
          <EmptyState icon={ClipboardList} title="Henüz çıkış kaydı yok" />
        )}
        {isSuccess && notes.length === 0 && hasFilter && (
          <EmptyState title="Sonuç bulunamadı" description="Seçilen filtreyle eşleşen kayıt yok." />
        )}

        {filtered.length > 0 &&
          (isDesktop ? (
            <div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="pl-4">Dorse</TableHead>
                    <TableHead>Getiren / Götüren</TableHead>
                    <TableHead>Firma / Yük</TableHead>
                    <TableHead className="hidden xl:table-cell">Gümrük</TableHead>
                    <TableHead>Giriş / Çıkış</TableHead>
                    <TableHead className="text-center">Gün</TableHead>
                    <TableHead className="pr-4 text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell className="max-w-36 pl-4 xl:max-w-44">
                        <Plate value={n.dorse} truncate />
                      </TableCell>
                      <TableCell className="max-w-44 xl:max-w-56">
                        <div className="flex flex-col items-start gap-1">
                          <Plate value={n.getiren} size="sm" truncate />
                          <Plate value={n.goturen} size="sm" truncate />
                        </div>
                      </TableCell>
                      <TableCell className="max-w-32 xl:max-w-44">
                        <p className="truncate font-medium">{n.firma || "—"}</p>
                        <p className="text-muted-foreground truncate text-xs">{n.mal}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden max-w-32 truncate xl:table-cell 2xl:max-w-48" title={n.gumrukBilgi ?? ""}>
                        {n.gumrukBilgi || "—"}
                      </TableCell>
                      {/* Giriş üstte, çıkış altta (Getiren/Götüren gibi): iki ayrı geniş
                          tarih sütunu tabloyu dar ekranlarda taşırıyordu. */}
                      <TableCell className="text-xs whitespace-nowrap tabular-nums">
                        <p>{formatDateTime(n.girisTarihi) || "—"}</p>
                        <p className="text-muted-foreground">{formatDateTime(n.cikisTarihi) || "—"}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="tabular-nums">
                          {stayDays(n.girisTarihi, n.cikisTarihi) ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <RaporActions note={n} search={rs} canEdit={canEdit} onDelete={onDelete} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <ul className="divide-y">
              {visible.map((n) => (
                <li key={n.id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <Plate value={n.dorse} truncate />
                      {n.girisTarihi && <Badge variant="secondary">{stayDays(n.girisTarihi, n.cikisTarihi)} gün</Badge>}
                    </div>
                    <RaporActions note={n} search={rs} canEdit={canEdit} onDelete={onDelete} />
                  </div>
                  <p className="text-sm font-medium">{n.firma || "Firma yok"}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatDateTime(n.girisTarihi)} → {formatDateTime(n.cikisTarihi)}
                  </p>
                </li>
              ))}
            </ul>
          ))}
        {hasMore && <div ref={sentinelRef} className="h-px" aria-hidden />}

        {isSuccess && pageCount > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-muted-foreground text-sm">
              Sayfa {page} / {pageCount}
            </p>
            <Pagination page={page} pageCount={pageCount} onChange={goTo} disabled={isFetching} />
          </div>
        )}
      </div>
    </>
  );
}

function Pagination({
  page,
  pageCount,
  onChange,
  disabled,
}: {
  page: number;
  pageCount: number;
  onChange: (p: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon-sm" disabled={disabled || page <= 1} onClick={() => onChange(1)} aria-label="İlk sayfa">
        <ChevronsLeft />
      </Button>
      <Button variant="outline" size="icon-sm" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)} aria-label="Önceki sayfa">
        <ChevronLeft />
      </Button>
      <span className="min-w-14 text-center text-sm tabular-nums">
        {page} / {pageCount}
      </span>
      <Button variant="outline" size="icon-sm" disabled={disabled || page >= pageCount} onClick={() => onChange(page + 1)} aria-label="Sonraki sayfa">
        <ChevronRight />
      </Button>
      <Button variant="outline" size="icon-sm" disabled={disabled || page >= pageCount} onClick={() => onChange(pageCount)} aria-label="Son sayfa">
        <ChevronsRight />
      </Button>
    </div>
  );
}

function RaporActions({
  note,
  search,
  canEdit,
  onDelete,
}: {
  note: Note;
  search: RaporSearch;
  canEdit: boolean;
  onDelete: (note: Note) => void;
}) {
  const navigate = useNavigate();
  const noteId = note.id;

  if (!canEdit) {
    return (
      <Button asChild variant="ghost" size="sm">
        <Link to="/dashboard/rapor/$noteId" params={{ noteId }} search={search}>
          <Eye /> Detay
        </Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="İşlemler">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => navigate({ to: "/dashboard/rapor/$noteId", params: { noteId }, search })}>
          <Eye /> Detay
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: "/dashboard/rapor/$noteId/edit", params: { noteId }, search })}>
          <Pencil /> Düzenle
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => onDelete(note)}>
          <Trash2 /> Sil
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
