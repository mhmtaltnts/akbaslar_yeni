import { notesQuery, useGumruk } from "@/api/notes";
import type { Note } from "@/api/types";
import { FormCard } from "@/components/app/form-card";
import { NoteGate } from "@/components/app/note-gate";
import { NoteSummary } from "@/components/app/note-summary";
import { ErrorAlert, Field } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiErrorMessage } from "@/lib/format";
import useAuth from "@/utils/hooks/useAuth";
import useTitle from "@/utils/hooks/useTitle";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/notes/$noteId/gumruk")({
  loader: ({ context }) => context.queryClient.prefetchQuery(notesQuery),
  component: RouteComponent,
});

function RouteComponent() {
  useTitle("Gümrük Bilgisi");
  const { noteId } = Route.useParams();
  return <NoteGate id={noteId}>{(note) => <GumrukForm note={note} />}</NoteGate>;
}

function GumrukForm({ note }: { note: Note }) {
  const navigate = useNavigate();
  const { isOfficer } = useAuth();
  const gumruk = useGumruk();
  const [gumrukBilgi, setGumrukBilgi] = useState(note.gumrukBilgi ?? "");

  const canSave = gumrukBilgi.trim() !== "" && !gumruk.isPending;

  const onSave = () => {
    if (!canSave) return;
    gumruk.mutate(
      { id: note.id, gumrukBilgi, gumrukBilgiTarihi: Date.now() },
      {
        onSuccess: () => {
          toast.success("Gümrük bilgisi kaydedildi");
          navigate({ to: "/dashboard/notes" });
        },
      },
    );
  };

  return (
    <FormCard
      title="Gümrük Bilgisi"
      description="Araçla ilgili gümrük işlem bilgisini girin."
      backTo="/dashboard/notes"
      backLabel="Parktaki araçlar"
      onSubmit={onSave}
      footer={
        <>
          <Button variant="outline" asChild>
            <Link to="/dashboard/notes">Vazgeç</Link>
          </Button>
          <Button type="submit" disabled={!canSave}>
            {gumruk.isPending ? <Loader2 className="animate-spin" /> : <Save />} Kaydet
          </Button>
        </>
      }
    >
      {gumruk.isError && <ErrorAlert message={apiErrorMessage(gumruk.error)} />}
      <NoteSummary note={note} showPark={isOfficer} />
      <Field label="Gümrük kaydı *" htmlFor="gumrukBilgi">
        <Textarea
          id="gumrukBilgi"
          rows={4}
          placeholder="Beyanname no, işlem durumu vb."
          value={gumrukBilgi}
          onChange={(e) => setGumrukBilgi(e.target.value)}
          autoFocus
        />
      </Field>
    </FormCard>
  );
}
