import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiDownload, apiFetch } from "@/lib/api";
import { type Message, type Note, withId } from "./types";
import { raporFilterParams, type RaporSearch } from "@/lib/rapor-search";

function withPageParam(search: RaporSearch) {
  const p = raporFilterParams(search);
  p.set("page", String(search.page ?? 1));
  return p.toString();
}

// Rapor filtresindeki TÜM kayıtları (sayfalama olmadan) Excel olarak indirir.
export async function downloadRaporExcel(search: RaporSearch) {
  const p = raporFilterParams(search);
  // Tarih hücreleri kullanıcının saat diliminde yazılsın (dakika, UTC'den fark).
  p.set("tz", String(-new Date().getTimezoneOffset()));
  const { blob, filename } = await apiDownload(`/rapor/export?${p}`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? "rapor.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type RawNote = Omit<Note, "id"> & { _id: string };

// Backend park boşken 404 + mesaj döner; istemci için bu sadece boş liste.
async function emptyOn404<T>(p: Promise<T>, empty: T): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return empty;
    throw e;
  }
}

// Parktaki (çıkışı yapılmamış) araçlar, en yeni giriş üstte.
export const notesQuery = queryOptions({
  queryKey: ["notes"],
  queryFn: async () => {
    const raw = await emptyOn404(apiFetch<RawNote[]>("/notes"), []);
    return raw
      .map((n) => withId(n) as Note)
      .sort((a, b) => (b.girisTarihi ?? 0) - (a.girisTarihi ?? 0));
  },
});

// Parktaki tek bir araç: liste önbelleğinden seçilir (ayrı istek yok).
export const noteByIdQuery = (id: string) =>
  queryOptions({ ...notesQuery, select: (notes: Note[]) => notes.find((n) => n.id === id) ?? null });

export type RaporPage = { notes: Note[]; count: number; pageCount: number };

// Rapor filtresi (sayfa, arama, çıkış tarihi aralığı) backend'de uygulanır.
export const raporQuery = (search: RaporSearch) =>
  queryOptions({
    queryKey: ["rapor", search.page ?? 1, search.q ?? "", search.from ?? "", search.to ?? ""],
    queryFn: async (): Promise<RaporPage> => {
      const res = await apiFetch<{
        pagination: { count: number; pageCount: number };
        notes: RawNote[];
      }>(`/rapor?${withPageParam(search)}`);
      return {
        notes: res.notes.map((n) => withId(n) as Note),
        count: res.pagination.count,
        pageCount: res.pagination.pageCount,
      };
    },
  });

// Bir araç kaydına dokunan her mutation hem parktaki listeyi hem raporu
// yeniler: hangi listenin etkilendiğini elle takip etmek (eski tag'ler)
// hataya açıktı.
function useNoteMutation<V>(fn: (v: V) => Promise<Message>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    // Yenilemeyi BEKLEMİYORUZ (promise döndürmüyoruz): sayfa hemen yönlensin;
    // aksi halde örn. çıkış yapılan araç listeden kalkınca form bir anlığına
    // "kayıt yok" durumuna düşerdi.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["rapor"] });
    },
  });
}

export type NewNote = { getiren: string; dorse: string; firma?: string; mal?: string; girisTarihi: number };
export const useAddNote = () =>
  useNoteMutation((body: NewNote) => apiFetch<Message>("/notes", { method: "POST", body }));

export type NoteUpdate = {
  id: string;
  getiren: string;
  dorse: string;
  firma?: string | null;
  mal?: string | null;
  girisTarihi?: number | null;
  guncellemeTarihi: number;
};
export const useUpdateNote = () =>
  useNoteMutation((body: NoteUpdate) => apiFetch<Message>("/notes", { method: "PATCH", body }));

export const useCikis = () =>
  useNoteMutation((body: { id: string; goturen: string; cikisTarihi: number }) =>
    apiFetch<Message>("/cikis", { method: "PATCH", body }),
  );

export const useGumruk = () =>
  useNoteMutation((body: { id: string; gumrukBilgi: string; gumrukBilgiTarihi: number }) =>
    apiFetch<Message>("/gumruk", { method: "PATCH", body }),
  );

export type RaporUpdate = NoteUpdate & {
  goturen?: string | null;
  cikisTarihi?: number | null;
  gumrukBilgi?: string | null;
  gumrukBilgiTarihi?: number | null;
};
export const useUpdateRapor = () =>
  useNoteMutation((body: RaporUpdate) => apiFetch<Message>("/rapor", { method: "PATCH", body }));

export const useDeleteNote = () =>
  useNoteMutation((id: string) =>
    apiFetch<{ reply: string }>("/notes", { method: "DELETE", body: { id } }).then((r) => ({
      message: r.reply,
    })),
  );
