import { useAddNewNoteMutation } from "@/api/notesApiSlice";
import { FormCard, plateInputClass } from "@/components/app/form-card";
import { ErrorAlert, Field } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiErrorMessage } from "@/lib/format";
import useAuth from "@/utils/hooks/useAuth";
import useTitle from "@/utils/hooks/useTitle";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/notes/new")({
  component: RouteComponent,
});

function RouteComponent() {
  useTitle("Araç Girişi");
  const { username } = useAuth();
  const [addNewNote, { isLoading, isSuccess, isError, error }] = useAddNewNoteMutation();
  const navigate = useNavigate();

  const [getiren, setGetiren] = useState("");
  const [dorse, setDorse] = useState("");
  const [firma, setFirma] = useState("");
  const [mal, setMal] = useState("");

  useEffect(() => {
    if (isSuccess) {
      toast.success(`${dorse} parka giriş yaptı`);
      navigate({ to: "/dashboard/notes" });
    }
    // eslint-disable-next-line
  }, [isSuccess, navigate]);

  const canSave = [getiren, dorse].every(Boolean) && !isLoading;

  const onSave = async () => {
    if (canSave) {
      await addNewNote({
        user: username,
        getiren,
        dorse,
        firma,
        mal,
        girisTarihi: Date.now(),
      });
    }
  };

  return (
    <FormCard
      title="Yeni Araç Girişi"
      description="Parka giren aracın bilgilerini girin. Giriş zamanı otomatik kaydedilir."
      backTo="/dashboard/notes"
      backLabel="Parktaki araçlar"
      onSubmit={onSave}
      footer={
        <>
          <Button variant="outline" asChild>
            <Link to="/dashboard/notes">Vazgeç</Link>
          </Button>
          <Button type="submit" disabled={!canSave}>
            {isLoading ? <Loader2 className="animate-spin" /> : <Save />} Girişi Kaydet
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
            placeholder="34 ABC 123"
            value={dorse}
            onChange={(e) => setDorse(e.target.value.toLocaleUpperCase("tr-TR"))}
            autoFocus
            required
          />
        </Field>
        <Field label="Getiren çekici plakası *" htmlFor="getiren">
          <Input
            id="getiren"
            className={plateInputClass}
            placeholder="34 XYZ 456"
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
      </div>
    </FormCard>
  );
}
