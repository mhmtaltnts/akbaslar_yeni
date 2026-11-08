import { useEffect, useState } from "react";
import { useDeleteNoteMutation, useGetRaporQuery, useUpdateRaporMutation } from "@/api/notesApiSlice";
import { selectCurrentPage } from "@/appStore/pageSlice";
import { FormCard, plateInputClass } from "@/components/app/form-card";
import { ErrorAlert, Field, PageLoader } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiErrorMessage, fromDateTimeLocal, toDateTimeLocal } from "@/lib/format";
import useAuth from "@/utils/hooks/useAuth";
import useTitle from "@/utils/hooks/useTitle";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { Loader2, Save, Trash2 } from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/rapor/$noteId/edit")({
  component: EditRapor,
});

function EditRapor() {
  useTitle("Kaydı Düzenle");
  const id = useParams({
    from: "/dashboard/rapor/$noteId/edit",
    select: (params) => params.noteId,
  });
  const page = useSelector(selectCurrentPage);
  const { note } = useGetRaporQuery(page, {
    selectFromResult: ({ data }) => ({ note: data?.notes.entities[id] }),
  });

  if (!note) return <PageLoader />;
  return <EditNoteForm note={note} />;
}

const EditNoteForm = ({ note }) => {
  const { username, isManager, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [dorse, setDorse] = useState(note.dorse ?? "");
  const [getiren, setGetiren] = useState(note.getiren ?? "");
  const [goturen, setGoturen] = useState(note.goturen ?? "");
  const [firma, setFirma] = useState(note.firma ?? "");
  const [mal, setMal] = useState(note.mal ?? "");
  const [girisTarihi, setGirisTarihi] = useState(note.girisTarihi ?? null);
  const [cikisTarihi, setCikisTarihi] = useState(note.cikisTarihi ?? null);
  const [gumrukBilgi, setGumrukBilgi] = useState(note.gumrukBilgi ?? "");
  const [gumrukBilgiTarihi, setGumrukBilgiTarihi] = useState(note.gumrukBilgiTarihi ?? null);

  const [updateRapor, { isLoading, isSuccess, isError, error }] = useUpdateRaporMutation();
  const [deleteNote, { isSuccess: isDelSuccess, isLoading: isDeleting, isError: isDelError, error: delError }] =
    useDeleteNoteMutation();

  useEffect(() => {
    if (isSuccess) toast.success("Kayıt güncellendi");
    if (isDelSuccess) toast.success("Kayıt silindi");
    if (isSuccess || isDelSuccess) navigate({ to: "/dashboard/rapor" });
  }, [isSuccess, isDelSuccess, navigate]);

  const onSave = async () => {
    await updateRapor({
      id: note.id,
      user: username,
      dorse,
      getiren,
      goturen,
      firma,
      mal,
      girisTarihi,
      cikisTarihi,
      gumrukBilgi,
      gumrukBilgiTarihi,
      guncellemeTarihi: Date.now(),
    });
  };

  const onDelete = async () => {
    if (window.confirm(`${note.dorse} kaydını silmek istediğinizden emin misiniz?`)) {
      await deleteNote({ id: note.id });
    }
  };

  const plate = (value: string, set: (v: string) => void, id: string) => (
    <Input
      id={id}
      className={plateInputClass}
      value={value}
      onChange={(e) => set(e.target.value.toLocaleUpperCase("tr-TR"))}
    />
  );

  return (
    <FormCard
      title="Çıkış Kaydını Düzenle"
      description="Rapordaki kaydın tüm bilgilerini düzeltebilirsiniz."
      backTo="/dashboard/rapor"
      backLabel="Rapor"
      onSubmit={onSave}
      className="max-w-3xl"
      footer={
        <>
          {(isAdmin || isManager) && (
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
            <Link to="/dashboard/rapor">Vazgeç</Link>
          </Button>
          <Button type="submit" disabled={isLoading || !dorse || !getiren}>
            {isLoading ? <Loader2 className="animate-spin" /> : <Save />} Kaydet
          </Button>
        </>
      }
    >
      {(isError || isDelError) && <ErrorAlert message={apiErrorMessage(error ?? delError)} />}

      <section className="space-y-4">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Araç</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Dorse *" htmlFor="dorse">{plate(dorse, setDorse, "dorse")}</Field>
          <Field label="Getiren çekici *" htmlFor="getiren">{plate(getiren, setGetiren, "getiren")}</Field>
          <Field label="Götüren çekici" htmlFor="goturen">{plate(goturen, setGoturen, "goturen")}</Field>
          <Field label="Firma" htmlFor="firma" className="sm:col-span-2">
            <Input id="firma" value={firma} onChange={(e) => setFirma(e.target.value)} />
          </Field>
          <Field label="Yükü" htmlFor="mal">
            <Input id="mal" value={mal} onChange={(e) => setMal(e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="space-y-4 border-t pt-5">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Tarihler</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Giriş tarihi" htmlFor="giris">
            <Input id="giris" type="datetime-local" value={toDateTimeLocal(girisTarihi)} onChange={(e) => setGirisTarihi(fromDateTimeLocal(e.target.value))} />
          </Field>
          <Field label="Çıkış tarihi" htmlFor="cikis">
            <Input id="cikis" type="datetime-local" value={toDateTimeLocal(cikisTarihi)} onChange={(e) => setCikisTarihi(fromDateTimeLocal(e.target.value))} />
          </Field>
        </div>
      </section>

      <section className="space-y-4 border-t pt-5">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Gümrük</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Gümrük bilgisi" htmlFor="gumruk" className="sm:col-span-2">
            <Textarea id="gumruk" rows={3} value={gumrukBilgi} onChange={(e) => setGumrukBilgi(e.target.value)} />
          </Field>
          <Field label="Gümrük tarihi" htmlFor="gumrukTarihi">
            <Input id="gumrukTarihi" type="datetime-local" value={toDateTimeLocal(gumrukBilgiTarihi)} onChange={(e) => setGumrukBilgiTarihi(fromDateTimeLocal(e.target.value))} />
          </Field>
        </div>
      </section>
    </FormCard>
  );
};
