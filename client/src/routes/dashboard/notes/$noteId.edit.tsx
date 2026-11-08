import { useDeleteNoteMutation, useGetNotesQuery, useUpdateNoteMutation } from "@/api/notesApiSlice";
import { FormCard, plateInputClass } from "@/components/app/form-card";
import { EmptyState, ErrorAlert, Field, PageLoader } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiErrorMessage, fromDateTimeLocal, toDateTimeLocal } from "@/lib/format";
import useAuth from "@/utils/hooks/useAuth";
import useTitle from "@/utils/hooks/useTitle";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { Loader2, Save, ShieldX, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/notes/$noteId/edit")({
  component: RouteComponent,
});

function RouteComponent() {
  useTitle("Kaydı Düzenle");
  const id = useParams({
    from: "/dashboard/notes/$noteId/edit",
    select: (params) => params.noteId,
  });
  const { username, isManager, isAdmin } = useAuth();
  const { note } = useGetNotesQuery("notesList", {
    selectFromResult: ({ data }) => ({ note: data?.entities[id] }),
  });

  if (!note) return <PageLoader />;
  if (!isManager && !isAdmin && note.girisYapan !== username) {
    return (
      <EmptyState
        icon={ShieldX}
        title="Erişim engeli"
        description="Bu kaydı sadece giriş yapan kullanıcı veya yöneticiler düzenleyebilir."
      />
    );
  }

  return <EditNoteForm note={note} />;
}

const EditNoteForm = ({ note }) => {
  const { username, isManager, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [updateNote, { isLoading, isSuccess, isError, error }] = useUpdateNoteMutation();
  const [deleteNote, { isSuccess: isDelSuccess, isLoading: isDeleting }] = useDeleteNoteMutation();

  const [getiren, setGetiren] = useState(note.getiren ?? "");
  const [dorse, setDorse] = useState(note.dorse ?? "");
  const [firma, setFirma] = useState(note.firma ?? "");
  const [mal, setMal] = useState(note.mal ?? "");
  const [girisTarihi, setGirisTarihi] = useState(note.girisTarihi ?? null);

  useEffect(() => {
    if (isSuccess) toast.success("Kayıt güncellendi");
    if (isDelSuccess) toast.success("Kayıt silindi");
    if (isSuccess || isDelSuccess) navigate({ to: "/dashboard/notes" });
  }, [isSuccess, isDelSuccess, navigate]);

  const canSave = [getiren, dorse].every(Boolean) && !isLoading;

  const onSave = async () => {
    if (canSave) {
      await updateNote({
        id: note.id,
        user: username,
        getiren,
        dorse,
        firma,
        mal,
        girisTarihi,
        guncellemeTarihi: Date.now(),
      });
    }
  };

  const onDelete = async () => {
    if (window.confirm(`${note.dorse} kaydını silmek istediğinizden emin misiniz?`)) {
      await deleteNote({ id: note.id });
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
              disabled={isDeleting}
            >
              <Trash2 /> Kaydı Sil
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to="/dashboard/notes">Vazgeç</Link>
          </Button>
          <Button type="submit" disabled={!canSave}>
            {isLoading ? <Loader2 className="animate-spin" /> : <Save />} Kaydet
          </Button>
        </>
      }
    >
      {isError && <ErrorAlert message={apiErrorMessage(error)} />}
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
};
