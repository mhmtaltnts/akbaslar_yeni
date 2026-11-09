import { useState } from "react";
import { raporQuery, useDeleteNote, useUpdateRapor } from "@/api/notes";
import type { Note } from "@/api/types";
import { RaporNoteGate } from "@/components/app/note-gate";
import { FormCard, plateInputClass } from "@/components/app/form-card";
import { Field } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fromDateTimeLocal, toDateTimeLocal } from "@/lib/format";
import { type RaporSearch, validateRaporSearch } from "@/lib/rapor-search";
import useAuth from "@/utils/hooks/useAuth";
import useTitle from "@/utils/hooks/useTitle";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/rapor/$noteId/edit")({
  validateSearch: validateRaporSearch,
  loaderDeps: ({ search }) => search,
  // Beklemiyoruz: önbellekteki veriyle sayfa hemen açılır (RaporNoteGate yükleniyor durumunu gösterir).
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(raporQuery(deps));
  },
  component: EditRapor,
});

function EditRapor() {
  useTitle("Kaydı Düzenle");
  const { noteId } = Route.useParams();
  const search = Route.useSearch();
  return (
    <RaporNoteGate id={noteId} search={search}>
      {(note) => <EditNoteForm note={note} search={search} />}
    </RaporNoteGate>
  );
}

const EditNoteForm = ({ note, search }: { note: Note; search: RaporSearch }) => {
  const { isManager, isAdmin } = useAuth();
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

  const update = useUpdateRapor();
  const remove = useDeleteNote();
  const isLoading = update.isPending;
  const isDeleting = remove.isPending;

  // Optimistik: rapor önbelleği hemen güncellenir, sayfa sunucuyu beklemeden
  // döner; hata olursa hook değişikliği geri alıp bildirir.
  const done = (msg: string) => {
    toast.success(msg);
    navigate({ to: "/dashboard/rapor", search: search });
  };

  const onSave = () => {
    update.mutate({
      id: note.id,
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
    done("Kayıt güncellendi");
  };

  const onDelete = () => {
    if (window.confirm(`${note.dorse} kaydını silmek istediğinizden emin misiniz?`)) {
      remove.mutate(note.id);
      done("Kayıt silindi");
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
      backSearch={search}
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
            <Link to="/dashboard/rapor" search={search}>Vazgeç</Link>
          </Button>
          <Button type="submit" disabled={isLoading || !dorse || !getiren}>
            {isLoading ? <Loader2 className="animate-spin" /> : <Save />} Kaydet
          </Button>
        </>
      }
    >
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
