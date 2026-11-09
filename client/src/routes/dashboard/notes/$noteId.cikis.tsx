import { notesQuery, useCikis } from "@/api/notes";
import type { Note } from "@/api/types";
import { FormCard, plateInputClass } from "@/components/app/form-card";
import { NoteGate } from "@/components/app/note-gate";
import { NoteSummary } from "@/components/app/note-summary";
import { Field } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useTitle from "@/utils/hooks/useTitle";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/notes/$noteId/cikis")({
  // Önbellekte varsa beklemeden aç (yenileme arkada); bayat veriyi engelleyici
  // biçimde yeniden çekmek, optimistik güncellemeyle yarışırdı.
  loader: ({ context }) => context.queryClient.prefetchQuery({ ...notesQuery, staleTime: Infinity }),
  component: RouteComponent,
});

function RouteComponent() {
  useTitle("Araç Çıkışı");
  const { noteId } = Route.useParams();
  return <NoteGate id={noteId}>{(note) => <CikisForm note={note} />}</NoteGate>;
}

function CikisForm({ note }: { note: Note }) {
  const cikis = useCikis();
  const navigate = useNavigate();
  const [goturen, setGoturen] = useState("");

  const canSave = Boolean(goturen) && !cikis.isPending;

  const onSave = () => {
    if (!canSave) return;
    // Optimistik: araç listeden hemen kalkar; hata olursa hook geri alır.
    cikis.mutate({ id: note.id, goturen, cikisTarihi: Date.now() });
    toast.success(`${note.dorse} parktan çıkış yaptı`);
    navigate({ to: "/dashboard/notes" });
  };

  return (
    <FormCard
      title="Araç Çıkışı"
      description="Aracı götüren çekicinin plakasını girin. Çıkış zamanı otomatik kaydedilir."
      backTo="/dashboard/notes"
      backLabel="Parktaki araçlar"
      onSubmit={onSave}
      footer={
        <>
          <Button variant="outline" asChild>
            <Link to="/dashboard/notes">Vazgeç</Link>
          </Button>
          <Button type="submit" disabled={!canSave}>
            {cikis.isPending ? <Loader2 className="animate-spin" /> : <LogOut />} Çıkışı Onayla
          </Button>
        </>
      }
    >
      <NoteSummary note={note} />
      <Field label="Götüren çekici plakası *" htmlFor="goturen">
        <Input
          id="goturen"
          className={plateInputClass}
          placeholder="34 XYZ 456"
          value={goturen}
          onChange={(e) => setGoturen(e.target.value.toLocaleUpperCase("tr-TR"))}
          autoFocus
          required
        />
      </Field>
    </FormCard>
  );
}
