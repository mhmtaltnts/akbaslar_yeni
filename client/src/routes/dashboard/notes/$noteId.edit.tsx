import { notesQuery, useDeleteNote, useUpdateNote } from "@/api/notes";
import type { Note } from "@/api/types";
import { FormCard, plateInputClass } from "@/components/app/form-card";
import { NoteGate } from "@/components/app/note-gate";
import { EmptyState, Field } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fromDateTimeLocal, toDateTimeLocal } from "@/lib/format";
import useAuth from "@/utils/hooks/useAuth";
import useTitle from "@/utils/hooks/useTitle";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Save, ShieldX, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/notes/$noteId/edit")({
  // Önbellekte varsa beklemeden aç (yenileme arkada); bayat veriyi engelleyici
  // biçimde yeniden çekmek, optimistik güncellemeyle yarışırdı.
  loader: ({ context }) => context.queryClient.prefetchQuery({ ...notesQuery, staleTime: Infinity }),
  component: RouteComponent,
});

function RouteComponent() {
  useTitle("Kaydı Düzenle");
  const { noteId } = Route.useParams();
  const { username, isManager, isAdmin } = useAuth();

  return (
    <NoteGate id={noteId}>
      {(note) =>
        !isManager && !isAdmin && note.girisYapan !== username ? (
          <EmptyState
            icon={ShieldX}
            title="Erişim engeli"
            description="Bu kaydı sadece giriş yapan kullanıcı veya yöneticiler düzenleyebilir."
          />
        ) : (
          <EditNoteForm note={note} />
        )
      }
    </NoteGate>
  );
}

function EditNoteForm({ note }: { note: Note }) {
  const { isManager, isAdmin } = useAuth();
  const navigate = useNavigate();
  const update = useUpdateNote();
  const remove = useDeleteNote();

  const [getiren, setGetiren] = useState(note.getiren ?? "");
  const [dorse, setDorse] = useState(note.dorse ?? "");
  const [firma, setFirma] = useState(note.firma ?? "");
  const [mal, setMal] = useState(note.mal ?? "");
  const [girisTarihi, setGirisTarihi] = useState(note.girisTarihi ?? null);

  const canSave = Boolean(getiren && dorse) && !update.isPending;
  // Optimistik: önbellek hemen güncellenir, sayfa sunucuyu beklemeden döner;
  // hata olursa hook değişikliği geri alıp bildirir.
  const done = (msg: string) => {
    toast.success(msg);
    navigate({ to: "/dashboard/notes" });
  };

  const onSave = () => {
    if (!canSave) return;
    update.mutate({ id: note.id, getiren, dorse, firma, mal, girisTarihi, guncellemeTarihi: Date.now() });
    done("Kayıt güncellendi");
  };

  const onDelete = () => {
    if (window.confirm(`${note.dorse} kaydını silmek istediğinizden emin misiniz?`)) {
      remove.mutate(note.id);
      done("Kayıt silindi");
    }
  };

  return (
    <FormCard
      title="Kaydı Düzenle"
      description="Parktaki aracın giriş bilgilerini güncelleyin."
      backTo="/dashboard/notes"
      backLabel="Parktaki araçlar"
      onSubmit={onSave}
      footer={
        <>
          {(isManager || isAdmin) && (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive sm:mr-auto"
              onClick={onDelete}
              disabled={remove.isPending}
            >
              <Trash2 /> Kaydı Sil
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to="/dashboard/notes">Vazgeç</Link>
          </Button>
          <Button type="submit" disabled={!canSave}>
            {update.isPending ? <Loader2 className="animate-spin" /> : <Save />} Kaydet
          </Button>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Dorse plakası *" htmlFor="dorse">
          <Input
            id="dorse"
            className={plateInputClass}
            value={dorse}
            onChange={(e) => setDorse(e.target.value.toLocaleUpperCase("tr-TR"))}
            required
          />
        </Field>
        <Field label="Getiren çekici plakası *" htmlFor="getiren">
          <Input
            id="getiren"
            className={plateInputClass}
            value={getiren}
            onChange={(e) => setGetiren(e.target.value.toLocaleUpperCase("tr-TR"))}
            required
          />
        </Field>
        <Field label="Firma" htmlFor="firma">
          <Input id="firma" value={firma} onChange={(e) => setFirma(e.target.value)} />
        </Field>
        <Field label="Yükü" htmlFor="mal">
          <Input id="mal" value={mal} onChange={(e) => setMal(e.target.value)} />
        </Field>
        <Field label="Giriş tarihi" htmlFor="girisTarihi">
          <Input
            id="girisTarihi"
            type="datetime-local"
            value={toDateTimeLocal(girisTarihi)}
            onChange={(e) => setGirisTarihi(fromDateTimeLocal(e.target.value))}
          />
        </Field>
      </div>
    </FormCard>
  );
}
