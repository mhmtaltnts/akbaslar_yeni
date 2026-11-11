import { useAddUser } from "@/api/users";
import { FormCard } from "@/components/app/form-card";
import { ErrorAlert, Field } from "@/components/app/page";
import { RolePicker } from "@/components/app/role-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiErrorMessage } from "@/lib/format";
import { ROLES } from "@/utils/config/roles";
import useAuth from "@/utils/hooks/useAuth";
import useTitle from "@/utils/hooks/useTitle";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/users/new")({
  component: RouteComponent,
});

function RouteComponent() {
  useTitle("Yeni Kullanıcı");
  const addUser = useAddUser();
  const { isPending: isLoading, isError, error } = addUser;
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<string[]>([ROLES.Employee]);

  const canSave = Boolean(username && password && roles.length) && !isLoading;

  return (
    <FormCard
      title="Yeni Kullanıcı"
      description="Kullanıcı bu otoparka eklenir ve hemen giriş yapabilir."
      backTo="/dashboard/users"
      backLabel="Kullanıcılar"
      onSubmit={() => {
        if (!canSave) return;
        addUser.mutate(
          { fullName, username, password, roles },
          {
            onSuccess: () => {
              toast.success(`${username} oluşturuldu`);
              navigate({ to: "/dashboard/users" });
            },
          },
        );
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
        <RolePicker value={roles} onChange={setRoles} superAdmin={isSuperAdmin} />
      </Field>
    </FormCard>
  );
}
