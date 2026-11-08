import { useGetNotesQuery, useGumrukBilgiMutation } from "@/api/notesApiSlice";
import { FormCard } from "@/components/app/form-card";
import { NoteSummary } from "@/components/app/note-summary";
import { ErrorAlert, Field, PageLoader } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiErrorMessage } from "@/lib/format";
import useAuth from "@/utils/hooks/useAuth";
import useTitle from "@/utils/hooks/useTitle";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/notes/$noteId/gumruk")({
  component: RouteComponent,
});

function RouteComponent() {
  useTitle("Gümrük Bilgisi");
  const id = useParams({
    from: "/dashboard/notes/$noteId/gumruk",
    select: (params) => params.noteId,
  });
  const { note } = useGetNotesQuery("notesList", {
    selectFromResult: ({ data }) => ({ note: data?.entities[id] }),
  });

  if (!note) return <PageLoader />;
  return <EditGumrukForm note={note} />;
}

const EditGumrukForm = ({ note }) => {
  const { username } = useAuth();
  const navigate = useNavigate();
  const [gumrukBilgi, setGumrukBilgi] = useState(note.gumrukBilgi ?? "");
  const [save, { isLoading, isSuccess, isError, error }] = useGumrukBilgiMutation();

  useEffect(() => {
    if (isSuccess) {
      toast.success("Gümrük bilgisi kaydedildi");
      navigate({ to: "/dashboard/notes" });
    }
  }, [isSuccess, navigate]);

  const canSave = gumrukBilgi.trim() !== "" && !isLoading;

  const onSave = async () => {
    if (canSave) {
      await save({ id: note.id, user: username, gumrukBilgi, gumrukBilgiTarihi: Date.now() });
    }
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
            {isLoading ? <Loader2 className="animate-spin" /> : <Save />} Kaydet
          </Button>
        </>
      }
    >
      {isError && <ErrorAlert message={apiErrorMessage(error)} />}
      <NoteSummary note={note} />
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
};
