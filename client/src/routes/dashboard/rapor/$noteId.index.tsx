import { raporQuery } from "@/api/notes";
import type { Note } from "@/api/types";
import { RaporNoteGate } from "@/components/app/note-gate";
import { DetailList } from "@/components/app/page";
import { Plate } from "@/components/app/plate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, stayDays } from "@/lib/format";
import { type RaporSearch, validateRaporSearch } from "@/lib/rapor-search";
import useAuth from "@/utils/hooks/useAuth";
import useTitle from "@/utils/hooks/useTitle";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileCheck2, LogIn, LogOut, Pencil, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/dashboard/rapor/$noteId/")({
  validateSearch: validateRaporSearch,
  loaderDeps: ({ search }) => search,
  // Beklemiyoruz: önbellekteki veriyle sayfa hemen açılır (RaporNoteGate yükleniyor durumunu gösterir).
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(raporQuery(deps));
  },
  component: NoteDetail,
});

type TimelineEvent = {
  icon: typeof LogIn;
  title: string;
  at?: number | null;
  by?: string | null;
  body?: ReactNode;
  tone: string;
};

function NoteDetail() {
  useTitle("Kayıt Detayı");
  const { noteId: id } = Route.useParams();
  const search = Route.useSearch();
  return (
    <RaporNoteGate id={id} search={search}>
      {(note) => <Detail note={note} id={id} search={search} />}
    </RaporNoteGate>
  );
}

function Detail({ note, id, search }: { note: Note; id: string; search: RaporSearch }) {
  const { isAdmin, isManager } = useAuth();

  const events = [
    {
      icon: LogIn,
      title: "Parka giriş",
      at: note.girisTarihi,
      by: note.girisYapan,
      body: <span className="flex items-center gap-2">Getiren çekici <Plate value={note.getiren} size="sm" /></span>,
      tone: "bg-primary/15 text-primary",
    },
    note.gumrukBilgi && {
      icon: FileCheck2,
      title: "Gümrük bilgisi",
      at: note.gumrukBilgiTarihi,
      by: note.gumrukYapan,
      body: note.gumrukBilgi,
      tone: "bg-warning/20 text-warning-foreground dark:text-warning",
    },
    note.guncellemeTarihi && {
      icon: RefreshCw,
      title: "Kayıt güncellendi",
      at: note.guncellemeTarihi,
      by: note.guncellemeYapan,
      tone: "bg-muted text-muted-foreground",
    },
    {
      icon: LogOut,
      title: "Parktan çıkış",
      at: note.cikisTarihi,
      by: note.cikisYapan,
      body: <span className="flex items-center gap-2">Götüren çekici <Plate value={note.goturen} size="sm" /></span>,
      tone: "bg-success/15 text-success",
    },
  ].filter(Boolean) as TimelineEvent[];

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link
        to="/dashboard/rapor"
        search={search}
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeft className="size-4" /> Rapor
      </Link>

      <div className="bg-card rounded-xl border shadow-xs">
        <div className="flex flex-col gap-4 border-b px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Plate value={note.dorse} size="lg" />
            {note.girisTarihi && (
              <Badge variant="secondary">{stayDays(note.girisTarihi, note.cikisTarihi)} gün parkta kaldı</Badge>
            )}
          </div>
          {(isAdmin || isManager) && (
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard/rapor/$noteId/edit" params={{ noteId: id }} search={search}>
                <Pencil /> Düzenle
              </Link>
            </Button>
          )}
        </div>

        <div className="px-6 py-6">
          <DetailList
            items={[
              { label: "Firma", value: note.firma },
              { label: "Yükü", value: note.mal },
            ]}
          />
        </div>

        <div className="border-t px-6 py-6">
          <h2 className="mb-5 text-sm font-semibold">Hareket geçmişi</h2>
          <ol className="relative space-y-6">
            {events.map((e, i) => (
              <li key={i} className="relative flex gap-4">
                {i < events.length - 1 && (
                  <span className="bg-border absolute top-10 bottom-[-1.5rem] left-[17px] w-px" />
                )}
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${e.tone}`}>
                  <e.icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="text-sm font-medium">{e.title}</p>
                    <time className="text-muted-foreground text-xs">{formatDateTime(e.at)}</time>
                  </div>
                  {e.by && <p className="text-muted-foreground text-xs">{e.by}</p>}
                  {e.body && <div className="mt-2 text-sm">{e.body}</div>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
