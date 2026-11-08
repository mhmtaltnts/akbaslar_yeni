import { useCikisMutation, useGetNotesQuery } from "@/api/notesApiSlice";
import { FormCard, plateInputClass } from "@/components/app/form-card";
import { NoteSummary } from "@/components/app/note-summary";
import { ErrorAlert, Field, PageLoader } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiErrorMessage } from "@/lib/format";
import useAuth from "@/utils/hooks/useAuth";
import useTitle from "@/utils/hooks/useTitle";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { Loader2, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/notes/$noteId/cikis")({
  component: RouteComponent,
});

function RouteComponent() {
  useTitle("Araç Çıkışı");
  const id = useParams({
    from: "/dashboard/notes/$noteId/cikis",
    select: (params) => params.noteId,
  });
  const { note } = useGetNotesQuery("notesList", {
    selectFromResult: ({ data }) => ({ note: data?.entities[id] }),
  });

  if (!note) return <PageLoader />;
  return <CikisForm note={note} />;
}

const CikisForm = ({ note }) => {
  const { username } = useAuth();
  const [cikisNote, { isLoading, isSuccess, isError, error }] = useCikisMutation();
  const navigate = useNavigate();
  const [goturen, setGoturen] = useState("");

  useEffect(() => {
    if (isSuccess) {
      toast.success(`${note.dorse} parktan çıkış yaptı`);
      navigate({ to: "/dashboard/notes" });
    }
    // eslint-disable-next-line
  }, [isSuccess, navigate]);

  const canSave = Boolean(goturen) && !isLoading;

  const onSave = async () => {
    if (canSave) {
      await cikisNote({ id: note.id, user: username, goturen, cikisTarihi: Date.now() });
    }
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
            {isLoading ? <Loader2 className="animate-spin" /> : <LogOut />} Çıkışı Onayla
          </Button>
        </>
      }
    >
      {isError && <ErrorAlert message={apiErrorMessage(error)} />}
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
};
