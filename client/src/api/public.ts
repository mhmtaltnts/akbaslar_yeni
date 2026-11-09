import { queryOptions } from "@tanstack/react-query";
import { ApiError, apiFetch } from "@/lib/api";
import { type PublicNote, type PublicPark, withId } from "./types";

// Giriş gerektirmeyen, otopark bazlı endpoint'ler.

// Sitenin açıldığı alan adının otoparkı (yoksa null): marka, adres ve
// misafir sayfasının varsayılan otoparkı buradan gelir.
export const publicSiteQuery = queryOptions({
  queryKey: ["public", "site"],
  queryFn: () => apiFetch<PublicPark | null>("/public/site", { auth: false }),
  staleTime: Infinity,
});
export const publicParksQuery = queryOptions({
  queryKey: ["public", "parks"],
  queryFn: () => apiFetch<PublicPark[]>("/public/parks", { auth: false }),
});

export const publicNotesQuery = (slug: string) =>
  queryOptions({
    queryKey: ["public", "notes", slug],
    queryFn: async () => {
      try {
        const raw = await apiFetch<(Omit<PublicNote, "id"> & { _id: string })[]>(
          `/public/parks/${encodeURIComponent(slug)}/notes`,
          { auth: false },
        );
        return raw.map((n) => withId(n) as PublicNote);
      } catch (e) {
        // "Parkta araç yok" 404'ü boş liste demek.
        if (e instanceof ApiError && e.status === 404 && e.data?.message?.includes("Araç")) return [];
        throw e;
      }
    },
  });
