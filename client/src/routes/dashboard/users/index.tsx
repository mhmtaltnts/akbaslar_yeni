import { useDeleteUser, usersQuery } from "@/api/users";
import type { User } from "@/api/types";
import { useQuery } from "@tanstack/react-query";
import { EmptyState, ErrorAlert, PageHeader, PageLoader, SearchInput } from "@/components/app/page";
import { RoleBadges } from "@/components/app/role-picker";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiErrorMessage, matchesSearch } from "@/lib/format";
import { cn } from "@/lib/utils";
import useMediaQuery from "@/utils/hooks/useMediaQuery";
import useTitle from "@/utils/hooks/useTitle";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/users/")({
  loader: ({ context }) => context.queryClient.prefetchQuery(usersQuery),
  component: RouteComponent,
});

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toLocaleUpperCase("tr-TR"))
    .join("");
}

function RouteComponent() {
  useTitle("Kullanıcılar");
  const [search, setSearch] = useState("");

  const { data: users = [], isLoading, isSuccess, isError, error } = useQuery({
    ...usersQuery,
    refetchInterval: 60000,
  });
  const filtered = search.trim()
    ? users.filter((u) => matchesSearch(u.fullname, search) || matchesSearch(u.username, search))
    : users;
  const pending = users.filter((u) => !u.active).length;
  // Mobilde tablo sığmıyordu (Sil düğmesi kartın dışında kalıyordu): kart düzeni.
  const isDesktop = useMediaQuery("(min-width: 640px)"); // Tailwind sm

  return (
    <>
      <PageHeader
        title="Kullanıcılar"
        description={
          isSuccess
            ? `${users.length} kullanıcı${pending ? ` · ${pending} onay bekliyor` : ""}`
            : "Personel ve yetkileri"
        }
        actions={
          <Button asChild>
            <Link to="/dashboard/users/new">
              <UserPlus /> Yeni Kullanıcı
            </Link>
          </Button>
        }
      />

      <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
        <div className="border-b p-4">
          <SearchInput value={search} onChange={setSearch} placeholder="İsim veya kullanıcı adı ara..." />
        </div>

        {isLoading && <PageLoader />}
        {isError && (
          <div className="p-4">
            <ErrorAlert message={apiErrorMessage(error)} />
          </div>
        )}
        {isSuccess && filtered.length === 0 && <EmptyState icon={Users} title="Kullanıcı bulunamadı" />}

        {filtered.length > 0 && !isDesktop && (
          <ul className="divide-y">
            {filtered.map((u) => (
              <UserCard key={u.id} user={u} />
            ))}
          </ul>
        )}

        {filtered.length > 0 && isDesktop && (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">Kullanıcı</TableHead>
                <TableHead>Roller</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="pr-4 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <UserRow key={u.id} user={u} />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}

function UserIdentity({ user }: { user: User }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
        {initials(user.fullname || user.username)}
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium">{user.fullname}</p>
        <p className="text-muted-foreground truncate text-xs">@{user.username}</p>
      </div>
    </div>
  );
}

function UserStatus({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap">
      <span className={cn("size-2 rounded-full", active ? "bg-success" : "bg-warning")} />
      {active ? "Aktif" : "Onay bekliyor"}
    </span>
  );
}

function UserActions({ user }: { user: User }) {
  const deleteUser = useDeleteUser();

  const onDelete = () => {
    if (window.confirm(`${user.fullname} kullanıcısını silmek istiyor musunuz?`)) {
      deleteUser.mutate(user.id, {
        onSuccess: (res) => toast.success(res?.reply ?? "Kullanıcı silindi"),
        onError: (err) => toast.error(apiErrorMessage(err)),
      });
    }
  };

  return (
    <div className="flex shrink-0 justify-end gap-1">
      <Button asChild variant="ghost" size="icon-sm" title="Düzenle" aria-label="Düzenle">
        <Link to="/dashboard/users/$userId/edit" params={{ userId: user.id }}>
          <Pencil />
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Sil"
        aria-label="Sil"
        className="text-muted-foreground hover:text-destructive"
        onClick={onDelete}
        disabled={deleteUser.isPending}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

function UserCard({ user }: { user: User }) {
  return (
    <li className={cn("space-y-3 p-4", !user.active && "opacity-70")}>
      <div className="flex items-start justify-between gap-3">
        <UserIdentity user={user} />
        <UserActions user={user} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <RoleBadges roles={user.roles} />
        <UserStatus active={user.active} />
      </div>
    </li>
  );
}

function UserRow({ user }: { user: User }) {
  return (
    <TableRow className={cn(!user.active && "opacity-70")}>
      <TableCell className="max-w-64 pl-4">
        <UserIdentity user={user} />
      </TableCell>
      <TableCell>
        <RoleBadges roles={user.roles} />
      </TableCell>
      <TableCell>
        <UserStatus active={user.active} />
      </TableCell>
      <TableCell className="pr-4">
        <UserActions user={user} />
      </TableCell>
    </TableRow>
  );
}
