import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { type Message, type Tenant, withId } from "./types";

// Otopark (tenant) yönetimi -- sadece SüperAdmin.
export const tenantsQuery = queryOptions({
  queryKey: ["tenants"],
  queryFn: async () =>
    (await apiFetch<(Omit<Tenant, "id"> & { _id: string })[]>("/tenants")).map(
      (t) => withId(t) as Tenant,
    ),
});

function useTenantMutation<V>(fn: (v: V) => Promise<Message>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

export type NewTenant = {
  name: string;
  slug: string;
  address?: string;
  admin: { fullname: string; username: string; password: string };
};
export const useAddTenant = () =>
  useTenantMutation((body: NewTenant) => apiFetch<Message>("/tenants", { method: "POST", body }));

export type TenantUpdate = { id: string; name: string; slug: string; address?: string | null; active: boolean };
export const useUpdateTenant = () =>
  useTenantMutation((body: TenantUpdate) => apiFetch<Message>("/tenants", { method: "PATCH", body }));
