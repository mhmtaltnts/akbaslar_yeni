import { notesQuery } from "@/api/notes";
import type { Note } from "@/api/types";
import { useQuery } from "@tanstack/react-query";
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
import { apiErrorMessage, formatDateTime, stayLabel } from "@/lib/format";
import useAuth from "@/utils/hooks/useAuth";
import useTitle from "@/utils/hooks/useTitle";
import defineAbilityFor from "@/utils/permission";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  FileCheck2,
  LogOut,
  MoreHorizontal,
  Pencil,
  PlusCircle,
  Truck,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/dashboard/notes/")({
  loader: ({ context }) => context.queryClient.prefetchQuery(notesQuery),
  component: RouteComponent,
});

const SEARCH_KEYS = ["dorse", "getiren", "firma", "mal", "gumrukBilgi", "girisYapan", "parkName"] as const;

function RouteComponent() {
  useTitle("Parktaki Araçlar");
  const [search, setSearch] = useState("");
  const { roles, isOfficer } = useAuth();
  const ability = defineAbilityFor(roles);

  const { data: notes = [], isLoading, isSuccess, isError, error } = useQuery({
    ...notesQuery,
    refetchInterval: 15000,
  });

  const isEmpty = isSuccess && notes.length === 0;
  const q = search.toLocaleLowerCase("tr-TR");
  const filtered = q
    ? notes.filter((n) =>
        SEARCH_KEYS.some((k) => n[k]?.toLocaleLowerCase("tr-TR").includes(q)),
      )
    : notes;

  return (
    <>
      <PageHeader
        title="Parktaki Araçlar"
        description={
          !isSuccess
            ? "Çıkışı yapılmamış araçlar"
            : isOfficer
              ? `Yetkili olduğunuz otoparklarda ${notes.length} araç bulunuyor, ${notes.filter((n) => !n.gumrukBilgi).length} tanesi gümrük bekliyor.`
              : `Şu anda parkta ${notes.length} araç bulunuyor.`
        }
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

      <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Plaka, firma, yük ara..."
          />
          {isSuccess && search && (
            <p className="text-muted-foreground text-sm">
              {filtered.length} / {notes.length} sonuç
            </p>
          )}
        </div>

        {isLoading && <PageLoader />}
        {isError && (
          <div className="p-4">
            <ErrorAlert message={apiErrorMessage(error)} />
          </div>
        )}
        {isEmpty && (
          <EmptyState
            icon={Truck}
            title="Parkta araç yok"
            description={
              isOfficer
                ? "Yetkili olduğunuz otoparklarda bekleyen araç bulunmuyor."
                : "Yeni bir araç girişi yaparak başlayabilirsiniz."
            }
            action={
              ability.can("create", "notes") && (
                <Button asChild size="sm">
                  <Link to="/dashboard/notes/new">Araç Girişi</Link>
                </Button>
              )
            }
          />
        )}
        {isSuccess && !isEmpty && filtered.length === 0 && (
          <EmptyState title="Sonuç bulunamadı" description={`"${search}" ile eşleşen araç yok.`} />
        )}

        {isSuccess && filtered.length > 0 && (
          <>
            {/* Masaüstü: tablo */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    {isOfficer && <TableHead className="pl-4">Otopark</TableHead>}
                    <TableHead className={isOfficer ? undefined : "pl-4"}>Dorse</TableHead>
                    <TableHead>Çekici</TableHead>
                    <TableHead>Firma / Yük</TableHead>
                    <TableHead>Gümrük</TableHead>
                    <TableHead>Giriş</TableHead>
                    <TableHead className="hidden xl:table-cell">Giriş Yapan</TableHead>
                    <TableHead className="pr-4 text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((note) => (
                    <TableRow key={note.id}>
                      {isOfficer && (
                        <TableCell className="max-w-44 pl-4">
                          <span className="block truncate font-medium">{note.parkName}</span>
                        </TableCell>
                      )}
                      <TableCell className={isOfficer ? undefined : "pl-4"}>
                        <Plate value={note.dorse} />
                      </TableCell>
                      <TableCell>
                        <Plate value={note.getiren} />
                      </TableCell>
                      <TableCell className="max-w-56">
                        <p className="truncate font-medium">{note.firma || "—"}</p>
                        <p className="text-muted-foreground truncate text-xs">{note.mal}</p>
                      </TableCell>
                      <TableCell className="max-w-48">
                        <CustomsBadge info={note.gumrukBilgi} />
                      </TableCell>
                      <TableCell>
                        <p className="whitespace-nowrap">{formatDateTime(note.girisTarihi)}</p>
                        <p className="text-muted-foreground text-xs">{stayLabel(note.girisTarihi)}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden xl:table-cell">
                        {note.girisYapan}
                      </TableCell>
                      <TableCell className="pr-4">
                        <NoteActions noteId={note.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobil: kartlar */}
            <ul className="divide-y md:hidden">
              {filtered.map((note) => (
                <li key={note.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      {isOfficer && note.parkName && (
                        <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <Building2 className="size-3.5" /> {note.parkName}
                        </p>
                      )}
                      <Plate value={note.dorse} />
                      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        <Truck className="size-3.5" /> <Plate value={note.getiren} size="sm" />
                      </div>
                    </div>
                    <NoteActions noteId={note.id} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="font-medium">{note.firma || "Firma yok"}</span>
                    {note.mal && <span className="text-muted-foreground">· {note.mal}</span>}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <CustomsBadge info={note.gumrukBilgi} />
                    </div>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {[formatDateTime(note.girisTarihi), stayLabel(note.girisTarihi)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}

function CustomsBadge({ info }: { info?: string | null }) {
  if (!info)
    return (
      <Badge className="bg-warning/20 text-warning-foreground dark:text-warning">Bekliyor</Badge>
    );
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-sm" title={info}>
      <FileCheck2 className="text-success size-4 shrink-0" />
      <span className="truncate">{info}</span>
    </span>
  );
}

function NoteActions({ noteId }: { noteId: string }) {
  const { roles, isAdmin, isManager } = useAuth();
  const ability = defineAbilityFor(roles);
  const canCustoms = ability.can("update", "notes", "Gümrük");
  const canExit = ability.can("update", "notes", "all");
  const canManage = isAdmin || isManager;

  return (
    <div className="flex items-center justify-end gap-1">
      {canCustoms && (
        <Button asChild variant="ghost" size="sm" title="Gümrük bilgisi">
          <Link to="/dashboard/notes/$noteId/gumruk" params={{ noteId }}>
            <FileCheck2 /> <span className="hidden lg:inline">Gümrük</span>
          </Link>
        </Button>
      )}
      {canExit && (
        <Button asChild variant="outline" size="sm" title="Araç çıkışı">
          <Link to="/dashboard/notes/$noteId/cikis" params={{ noteId }}>
            <LogOut /> <span className="hidden lg:inline">Çıkış</span>
          </Link>
        </Button>
      )}
      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Diğer işlemler">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/dashboard/notes/$noteId/edit" params={{ noteId }}>
                <Pencil /> Düzenle
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
