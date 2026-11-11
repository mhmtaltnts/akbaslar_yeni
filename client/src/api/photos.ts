import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiUrl } from "@/lib/api";
import { shrinkImage } from "@/lib/image";
import type { Message } from "./types";

// Otopark fotoğrafları: ana sayfa slaytı. Kurucu/SüperAdmin çalıştığı
// otoparkın fotoğraflarını ekler ve siler.
export type Photo = { id: string; url: string };
const toPhoto = (p: { _id: string }): Photo => ({ id: p._id, url: apiUrl(`/public/photos/${p._id}`) });

export const parkPhotosQuery = queryOptions({
  queryKey: ["photos"],
  queryFn: async () => (await apiFetch<{ _id: string }[]>("/photos")).map(toPhoto),
});

// Ana sayfa: sitenin alan adının otoparkının fotoğrafları (giriş gerekmez).
export const publicPhotosQuery = (slug: string) =>
  queryOptions({
    queryKey: ["public", "photos", slug],
    queryFn: async () =>
      (await apiFetch<{ _id: string }[]>(`/public/parks/${encodeURIComponent(slug)}/photos`, { auth: false })).map(toPhoto),
    staleTime: 5 * 60_000,
  });

function useInvalidatePhotos() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["photos"] });
    qc.invalidateQueries({ queryKey: ["public", "photos"] });
  };
}

// Fotoğrafı küçültüp (EXIF silinir) yükler.
export const useUploadPhoto = () => {
  const invalidate = useInvalidatePhotos();
  return useMutation({
    mutationFn: async (file: File) =>
      apiFetch<{ _id: string }>("/photos", { method: "POST", body: await shrinkImage(file) }),
    onSuccess: invalidate,
  });
};

export const useDeletePhoto = () => {
  const invalidate = useInvalidatePhotos();
  return useMutation({
    mutationFn: (id: string) => apiFetch<Message>(`/photos/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
};
