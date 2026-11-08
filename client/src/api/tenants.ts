import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { type Message, type Officer, type Tenant, withId } from "./types";

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

// Gümrük memurları ve izinli oldukları otoparklar -- sadece SüperAdmin.
export const officersQuery = queryOptions({
  queryKey: ["officers"],
  queryFn: async () =>
    (await apiFetch<(Omit<Officer, "id"> & { _id: string })[]>("/tenants/officers")).map(
      (o) => withId(o) as Officer,
    ),
});

export const useSetOfficerParks = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { userId: string; parkIds: string[] }) =>
      apiFetch<Message>("/tenants/officers", { method: "PUT", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["officers"] }),
  });
};

export type TenantUpdate = { id: string; name: string; slug: string; address?: string | null; active: boolean };
export const useUpdateTenant = () =>
  useTenantMutation((body: TenantUpdate) => apiFetch<Message>("/tenants", { method: "PATCH", body }));
