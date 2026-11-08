import { useState } from "react";
import { useDeleteNoteMutation, useGetRaporQuery } from "@/api/notesApiSlice";
import { selectCurrentPage, setPage } from "@/appStore/pageSlice";
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
import useAuth from "@/utils/hooks/useAuth";
import useTitle from "@/utils/hooks/useTitle";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/rapor/")({
  component: RouteComponent,
});

type Note = {
  id: string;
  dorse: string;
  getiren: string;
  goturen?: string | null;
  firma?: string | null;
  mal?: string | null;
  gumrukBilgi?: string | null;
  girisTarihi?: number | null;
  cikisTarihi?: number | null;
};

const SEARCH_KEYS = ["dorse", "getiren", "goturen", "firma", "mal", "gumrukBilgi"] as const;

function RouteComponent() {
  useTitle("Rapor");
  const page = useSelector(selectCurrentPage);
  const dispatch = useDispatch();
  const [search, setSearch] = useState("");

  const { data, isLoading, isFetching, isSuccess, isError, error } = useGetRaporQuery(page);

  const notes: Note[] = isSuccess
    ? data.notes.ids.map((id: string) => data.notes.entities[id])
    : [];
  const count: number = data?.pagination.count ?? 0;
  const pageCount: number = data?.pagination.pageCount ?? 1;

  const q = search.toLocaleLowerCase("tr-TR");
  const filtered = q
    ? notes.filter((n) => SEARCH_KEYS.some((k) => n[k]?.toLocaleLowerCase("tr-TR").includes(q)))
    : notes;

  const goTo = (sayfa: number) =>
    dispatch(setPage({ sayfa: Math.min(Math.max(1, sayfa), pageCount) }));

  return (
    <>
      <PageHeader
        title="Rapor"
        description={isSuccess ? `Toplam ${count} çıkış kaydı` : "Parktan çıkışı yapılmış araçlar"}
      />

      <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={search} onChange={setSearch} placeholder="Plaka, firma, gümrük ara..." />
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
        {isSuccess && notes.length === 0 && (
          <EmptyState icon={ClipboardList} title="Henüz çıkış kaydı yok" />
        )}
        {isSuccess && notes.length > 0 && filtered.length === 0 && (
          <EmptyState title="Sonuç bulunamadı" description={`"${search}" ile eşleşen kayıt yok.`} />
        )}

        {filtered.length > 0 && (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="pl-4">Dorse</TableHead>
                    <TableHead>Getiren / Götüren</TableHead>
                    <TableHead>Firma / Yük</TableHead>
                    <TableHead className="hidden xl:table-cell">Gümrük</TableHead>
                    <TableHead>Giriş</TableHead>
                    <TableHead>Çıkış</TableHead>
                    <TableHead className="text-center">Gün</TableHead>
                    <TableHead className="pr-4 text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell className="pl-4">
                        <Plate value={n.dorse} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <Plate value={n.getiren} size="sm" />
                          <Plate value={n.goturen} size="sm" />
                        </div>
                      </TableCell>
                      <TableCell className="max-w-48">
                        <p className="truncate font-medium">{n.firma || "—"}</p>
                        <p className="text-muted-foreground truncate text-xs">{n.mal}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden max-w-48 truncate xl:table-cell" title={n.gumrukBilgi ?? ""}>
                        {n.gumrukBilgi || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateTime(n.girisTarihi)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateTime(n.cikisTarihi)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="tabular-nums">
                          {stayDays(n.girisTarihi, n.cikisTarihi) ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <RaporActions note={n} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="divide-y md:hidden">
              {filtered.map((n) => (
                <li key={n.id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Plate value={n.dorse} />
                      {n.girisTarihi && <Badge variant="secondary">{stayDays(n.girisTarihi, n.cikisTarihi)} gün</Badge>}
                    </div>
                    <RaporActions note={n} />
                  </div>
                  <p className="text-sm font-medium">{n.firma || "Firma yok"}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatDateTime(n.girisTarihi)} → {formatDateTime(n.cikisTarihi)}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}

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

function RaporActions({ note }: { note: Note }) {
  const { isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const [deleteNote] = useDeleteNoteMutation();
  const noteId = note.id;

  const onDelete = async () => {
    if (window.confirm(`${note.dorse} kaydını silmek istediğinizden emin misiniz?`)) {
      try {
        await deleteNote({ id: noteId }).unwrap();
        toast.success("Kayıt silindi");
      } catch (err) {
        toast.error(apiErrorMessage(err));
      }
    }
  };

  if (!isAdmin && !isManager) {
    return (
      <Button asChild variant="ghost" size="sm">
        <Link to="/dashboard/rapor/$noteId" params={{ noteId }}>
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
        <DropdownMenuItem onClick={() => navigate({ to: "/dashboard/rapor/$noteId", params: { noteId } })}>
          <Eye /> Detay
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: "/dashboard/rapor/$noteId/edit", params: { noteId } })}>
          <Pencil /> Düzenle
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 /> Sil
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
