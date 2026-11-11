import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { type Message, type Officer, type Tenant, withId } from "./types";

// Otopark (tenant) yönetimi -- sadece SüperAdmin. Uygulama iki sabit
// otoparklı: otopark oluşturma ve askıya alma yok, sadece düzenleme.
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
      // Otopark ayarları (örn. plaka okuma) /auth/me ile de geliyor.
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

// Gümrük memurları ve izinli oldukları otoparklar -- sadece SüperAdmin.
export const officersQuery = queryOptions({
  queryKey: ["officers"],
  queryFn: async () =>
    (await apiFetch<(Omit<Officer, "id"> & { _id: string })[]>("/tenants/officers")).map(
      (o) => withId(o) as Officer,
    ),
});

// Memur ve SüperAdmin dışındaki personel ve ek otopark izinleri: izin
// verilen otoparkın alan adından girince o otoparkta çalışırlar.
export const staffQuery = queryOptions({
  queryKey: ["staff"],
  queryFn: async () =>
    (await apiFetch<(Omit<Officer, "id"> & { _id: string })[]>("/tenants/staff")).map(
      (o) => withId(o) as Officer,
    ),
});

// Memur veya personelin ek otopark izinlerini değiştirir.
export const useSetOfficerParks = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { userId: string; parkIds: string[] }) =>
      apiFetch<Message>("/tenants/officers", { method: "PUT", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["officers"] });
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
  });
};

// `domain`: boş metin alan adını kaldırır; gönderilmezse değişmez.
export type TenantUpdate = {
  id: string;
  name: string;
  slug: string;
  address?: string | null;
  domain?: string;
  // Gönderilmezse değişmez.
  plateScan?: boolean;
};
export const useUpdateTenant = () =>
  useTenantMutation((body: TenantUpdate) => apiFetch<Message>("/tenants", { method: "PATCH", body }));
