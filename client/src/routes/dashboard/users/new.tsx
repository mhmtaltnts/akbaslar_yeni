import { useAddNewUserMutation } from "@/api/usersApiSlice";
import { FormCard } from "@/components/app/form-card";
import { ErrorAlert, Field } from "@/components/app/page";
import { RolePicker } from "@/components/app/role-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiErrorMessage } from "@/lib/format";
import { ROLES } from "@/utils/config/roles";
import useTitle from "@/utils/hooks/useTitle";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/users/new")({
  component: RouteComponent,
});

function RouteComponent() {
  useTitle("Yeni Kullanıcı");
  const [addNewUser, { isLoading, isSuccess, isError, error }] = useAddNewUserMutation();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<string[]>([ROLES.Employee]);

  useEffect(() => {
    if (isSuccess) {
      toast.success(`${username} oluşturuldu`);
      navigate({ to: "/dashboard/users" });
    }
    // eslint-disable-next-line
  }, [isSuccess, navigate]);

  const canSave = Boolean(username && password && roles.length) && !isLoading;

  return (
    <FormCard
      title="Yeni Kullanıcı"
      description="Kullanıcı bu otoparka eklenir ve hemen giriş yapabilir."
      backTo="/dashboard/users"
      backLabel="Kullanıcılar"
      onSubmit={async () => {
        if (canSave) await addNewUser({ fullName, username, password, roles });
      }}
      footer={
        <>
          <Button variant="outline" asChild>
            <Link to="/dashboard/users">Vazgeç</Link>
          </Button>
          <Button type="submit" disabled={!canSave}>
            {isLoading ? <Loader2 className="animate-spin" /> : <UserPlus />} Kullanıcı Oluştur
          </Button>
        </>
      }
    >
      {isError && <ErrorAlert message={apiErrorMessage(error)} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Adı soyadı" htmlFor="fullname" className="sm:col-span-2">
          <Input id="fullname" value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
        </Field>
        <Field label="Kullanıcı adı *" htmlFor="username">
          <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </Field>
        <Field label="Şifre *" htmlFor="password">
          <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
      </div>
      <Field label="Roller *">
        <RolePicker value={roles} onChange={setRoles} />
      </Field>
    </FormCard>
  );
}
