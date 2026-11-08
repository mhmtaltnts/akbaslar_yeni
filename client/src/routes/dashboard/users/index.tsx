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
import { apiErrorMessage } from "@/lib/format";
import { cn } from "@/lib/utils";
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
  const q = search.toLocaleLowerCase("tr-TR");
  const filtered = q
    ? users.filter(
        (u) =>
          u.fullname?.toLocaleLowerCase("tr-TR").includes(q) ||
          u.username.toLocaleLowerCase("tr-TR").includes(q),
      )
    : users;
  const pending = users.filter((u) => !u.active).length;

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

        {filtered.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">Kullanıcı</TableHead>
                <TableHead>Roller</TableHead>
                <TableHead className="hidden sm:table-cell">Durum</TableHead>
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

function UserRow({ user }: { user: User }) {
  const deleteUser = useDeleteUser();
  const isLoading = deleteUser.isPending;

  const onDelete = () => {
    if (window.confirm(`${user.fullname} kullanıcısını silmek istiyor musunuz?`)) {
      deleteUser.mutate(user.id, {
        onSuccess: (res) => toast.success(res?.reply ?? "Kullanıcı silindi"),
        onError: (err) => toast.error(apiErrorMessage(err)),
      });
    }
  };

  return (
    <TableRow className={cn(!user.active && "opacity-70")}>
      <TableCell className="pl-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {initials(user.fullname || user.username)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{user.fullname}</p>
            <p className="text-muted-foreground truncate text-xs">@{user.username}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <RoleBadges roles={user.roles} />
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <span className="inline-flex items-center gap-1.5 text-sm">
          <span className={cn("size-2 rounded-full", user.active ? "bg-success" : "bg-warning")} />
          {user.active ? "Aktif" : "Onay bekliyor"}
        </span>
      </TableCell>
      <TableCell className="pr-4">
        <div className="flex justify-end gap-1">
          <Button asChild variant="ghost" size="icon-sm" title="Düzenle">
            <Link to="/dashboard/users/$userId/edit" params={{ userId: user.id }}>
              <Pencil />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Sil"
            className="text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            disabled={isLoading}
          >
            <Trash2 />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
