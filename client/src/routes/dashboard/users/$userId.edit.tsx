import { usersQuery, useUpdateUser } from "@/api/users";
import type { User } from "@/api/types";
import { useQuery } from "@tanstack/react-query";
import { FormCard } from "@/components/app/form-card";
import { EmptyState, ErrorAlert, Field, PageLoader } from "@/components/app/page";
import { RolePicker } from "@/components/app/role-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiErrorMessage } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SUPER_ADMIN } from "@/utils/config/roles";
import useTitle from "@/utils/hooks/useTitle";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Save, UserX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/users/$userId/edit")({
  loader: ({ context }) => context.queryClient.prefetchQuery(usersQuery),
  component: RouteComponent,
});

function RouteComponent() {
  useTitle("Kullanıcıyı Düzenle");
  const { userId } = Route.useParams();
  const { data: user, isPending } = useQuery({
    ...usersQuery,
    select: (users) => users.find((u) => u.id === userId) ?? null,
  });

  if (isPending) return <PageLoader />;
  if (!user) return <EmptyState icon={UserX} title="Kullanıcı bulunamadı" />;
  return <EditUserForm user={user} />;
}

const EditUserForm = ({ user }: { user: User }) => {
  const updateUser = useUpdateUser();
  const { isPending: isLoading, isError, error } = updateUser;
  const navigate = useNavigate();

  const [username, setUsername] = useState(user.username);
  const [password, setPassword] = useState("");
  // SüperAdmin rolü seçicide gösterilmez; backend zaten korur.
  const [roles, setRoles] = useState<string[]>(user.roles.filter((r: string) => r !== SUPER_ADMIN));
  const [active, setActive] = useState<boolean>(user.active);

  const canSave = roles.length > 0 && Boolean(username) && !isLoading;

  const onSave = () => {
    if (!canSave) return;
    const body = { id: user.id, fullName: user.fullname, username, roles, active };
    updateUser.mutate(password ? { ...body, password } : body, {
      onSuccess: () => {
        toast.success(`${username} güncellendi`);
        navigate({ to: "/dashboard/users" });
      },
    });
  };

  return (
    <FormCard
      title={user.fullname || user.username}
      description="Kullanıcı bilgilerini, rollerini ve hesap durumunu güncelleyin."
      backTo="/dashboard/users"
      backLabel="Kullanıcılar"
      onSubmit={onSave}
      footer={
        <>
          <Button variant="outline" asChild>
            <Link to="/dashboard/users">Vazgeç</Link>
          </Button>
          <Button type="submit" disabled={!canSave}>
            {isLoading ? <Loader2 className="animate-spin" /> : <Save />} Kaydet
          </Button>
        </>
      }
    >
      {isError && <ErrorAlert message={apiErrorMessage(error)} />}

      <label
        className={cn(
          "flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-4",
          !active && "border-warning/50 bg-warning/10",
        )}
      >
        <span>
          <span className="block text-sm font-medium">Hesap aktif</span>
          <span className="text-muted-foreground block text-xs">
            {active ? "Kullanıcı giriş yapabilir." : "Kullanıcı giriş yapamaz (onay bekliyor / pasif)."}
          </span>
        </span>
        <Switch checked={active} onChange={setActive} />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Kullanıcı adı *" htmlFor="username">
          <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </Field>
        <Field label="Yeni şifre" htmlFor="password" hint="Değiştirmek istemiyorsanız boş bırakın.">
          <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
      </div>
      <Field label="Roller *">
        <RolePicker value={roles} onChange={setRoles} />
      </Field>
    </FormCard>
  );
};

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        className={cn(
          "bg-background inline-block size-5 rounded-full shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
