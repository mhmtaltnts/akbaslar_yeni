import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { type Message, type User, withId } from "./types";

export const usersQuery = queryOptions({
  queryKey: ["users"],
  queryFn: async () =>
    (await apiFetch<(Omit<User, "id"> & { _id: string })[]>("/users")).map((u) => withId(u) as User),
});

function useUserMutation<V, R = Message>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export type NewUser = { fullName: string; username: string; password: string; roles: string[] };
export const useAddUser = () =>
  useUserMutation((body: NewUser) => apiFetch<Message>("/users", { method: "POST", body }));

export type UserUpdate = {
  id: string;
  fullName?: string;
  username: string;
  roles: string[];
  active: boolean;
  password?: string;
};
export const useUpdateUser = () =>
  useUserMutation((body: UserUpdate) => apiFetch<Message>("/users", { method: "PATCH", body }));

export const useDeleteUser = () =>
  useUserMutation((id: string) =>
    apiFetch<{ reply: string }>("/users", { method: "DELETE", body: { id } }),
  );
