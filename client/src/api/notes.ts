import { type QueryClient, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, apiDownload, apiFetch } from "@/lib/api";
import { type Message, type Note, withId } from "./types";
import { raporFilterParams, type RaporSearch } from "@/lib/rapor-search";
import { apiErrorMessage } from "@/lib/format";
import useAuth from "@/utils/hooks/useAuth";

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

// Bir araç kaydına dokunan her mutation OPTİMİSTİK çalışır: önbellek
// (parktaki araçlar + açık rapor sayfaları) istek gitmeden güncellenir, ekran
// sunucuyu beklemez. Hata olursa önbellek eski haline döner ve kullanıcıya
// bildirilir. İş bitince her iki liste de sunucudan yenilenir (hangi listenin
// etkilendiğini elle takip etmek hataya açıktı; optimistik yama sadece
// aradaki boşluğu doldurur).
const NOTE_MUTATION = ["note"];

type Patch<V> = (qc: QueryClient, v: V) => void;

function useNoteMutation<V>(fn: (v: V) => Promise<Message>, patch: Patch<V>) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationKey: NOTE_MUTATION,
    mutationFn: fn,
    onMutate: async (v) => {
      // Yoldaki yenilemeler optimistik yamayı eski veriyle ezmesin.
      await Promise.all([
        qc.cancelQueries({ queryKey: ["notes"] }),
        qc.cancelQueries({ queryKey: ["rapor"] }),
      ]);
      const snapshot = [
        ...qc.getQueriesData({ queryKey: ["notes"] }),
        ...qc.getQueriesData({ queryKey: ["rapor"] }),
      ];
      // Yama sadece görüntü içindir: içinde bir hata olursa asıl istek yine
      // gitsin (onMutate hata fırlatırsa mutationFn hiç çalışmaz).
      try {
        patch(qc, v);
      } catch (e) {
        console.error("Optimistik güncelleme uygulanamadı", e);
      }
      return { snapshot };
    },
    onError: (err, v, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
      // Form çoktan kapandığı için girilen bilgiyi kaybetmemek adına aynı
      // isteği tekrar gönderme imkânı veriyoruz. Tekrar deneme de optimistik
      // çalışır; yine başarısız olursa bu bildirim yeniden çıkar.
      toast.error(`İşlem kaydedilemedi, değişiklik geri alındı: ${apiErrorMessage(err)}`, {
        duration: 15_000,
        action: {
          label: "Tekrar dene",
          // mutateAsync: formun bileşeni kaldırılmış olsa da sonuç promise'i
          // gelir (mutate'e verilen callback'ler bu durumda çalışmazdı).
          onClick: () =>
            mutation
              .mutateAsync(v)
              .then(() => toast.success("İşlem kaydedildi"))
              .catch(() => {}), // hata bildirimi yukarıda zaten gösteriliyor
        },
      });
    },
    // Yenilemeyi BEKLEMİYORUZ. Art arda birden çok işlem varsa sadece sonuncusu
    // bitince yenile; yoksa ilk yanıt diğerlerinin optimistik yamasını ezer.
    onSettled: () => {
      if (qc.isMutating({ mutationKey: NOTE_MUTATION }) > 1) return;
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["rapor"] });
    },
  });
  return mutation;
}

// --- Önbellek yamaları ---------------------------------------------------

const patchNotes = (qc: QueryClient, fn: (notes: Note[]) => Note[]) =>
  qc.setQueryData<Note[]>(notesQuery.queryKey, (old) => (old ? fn(old) : old));

const patchRapor = (qc: QueryClient, fn: (page: RaporPage) => RaporPage) =>
  qc.setQueriesData<RaporPage>({ queryKey: ["rapor"] }, (old) => (old ? fn(old) : old));

const mergeNote = (id: string, fields: Partial<Note>) => (n: Note) =>
  n.id === id ? { ...n, ...fields } : n;

// Sunucuya henüz ulaşmamış yeni kayıtların geçici kimliği. Bu satırlarda
// işlem (çıkış, düzenleme...) yapılamaz; yenilemeyle gerçek kayıt gelir.
export const TEMP_ID_PREFIX = "temp-";
export const isPendingNote = (n: Pick<Note, "id">) => n.id.startsWith(TEMP_ID_PREFIX);
// crypto.randomUUID KULLANMIYORUZ: tarayıcılar onu sadece HTTPS'te (güvenli
// bağlamda) sunar; site HTTP'den açıldığında hata verip kaydı engelliyordu.
// Geçici kimliğin sadece bu sekmede benzersiz olması yeterli.
let tempSeq = 0;
const tempId = () => `${TEMP_ID_PREFIX}${Date.now()}-${++tempSeq}`;

export type NewNote = { getiren: string; dorse: string; firma?: string; mal?: string; girisTarihi: number };
export const useAddNote = () => {
  const { username } = useAuth();
  return useNoteMutation(
    (body: NewNote) => apiFetch<Message>("/notes", { method: "POST", body }),
    (qc, v) =>
      patchNotes(qc, (notes) => [
        { ...v, id: tempId(), girisYapan: username ?? null },
        ...notes,
      ]),
  );
};

export type NoteUpdate = {
  id: string;
  getiren: string;
  dorse: string;
  firma?: string | null;
  mal?: string | null;
  girisTarihi?: number | null;
  guncellemeTarihi: number;
};
export const useUpdateNote = () => {
  const { username } = useAuth();
  return useNoteMutation(
    (body: NoteUpdate) => apiFetch<Message>("/notes", { method: "PATCH", body }),
    (qc, { id, ...fields }) =>
      patchNotes(qc, (notes) => notes.map(mergeNote(id, { ...fields, guncellemeYapan: username }))),
  );
};

// Çıkış yapan araç parktan kalkar. Rapora eklemiyoruz: hangi rapor sayfasına
// / filtreye düşeceğini sunucu belirler, yenilemeyle gelir.
export const useCikis = () =>
  useNoteMutation(
    (body: { id: string; goturen: string; cikisTarihi: number }) =>
      apiFetch<Message>("/cikis", { method: "PATCH", body }),
    (qc, { id }) => patchNotes(qc, (notes) => notes.filter((n) => n.id !== id)),
  );

export const useGumruk = () => {
  const { username } = useAuth();
  return useNoteMutation(
    (body: { id: string; gumrukBilgi: string; gumrukBilgiTarihi: number }) =>
      apiFetch<Message>("/gumruk", { method: "PATCH", body }),
    (qc, { id, ...fields }) =>
      patchNotes(qc, (notes) => notes.map(mergeNote(id, { ...fields, gumrukYapan: username }))),
  );
};

export type RaporUpdate = NoteUpdate & {
  goturen?: string | null;
  cikisTarihi?: number | null;
  gumrukBilgi?: string | null;
  gumrukBilgiTarihi?: number | null;
};
export const useUpdateRapor = () => {
  const { username } = useAuth();
  return useNoteMutation(
    (body: RaporUpdate) => apiFetch<Message>("/rapor", { method: "PATCH", body }),
    (qc, { id, ...fields }) =>
      patchRapor(qc, (page) => ({
        ...page,
        notes: page.notes.map(mergeNote(id, { ...fields, guncellemeYapan: username })),
      })),
  );
};

export const useDeleteNote = () =>
  useNoteMutation(
    (id: string) =>
      apiFetch<{ reply: string }>("/notes", { method: "DELETE", body: { id } }).then((r) => ({
        message: r.reply,
      })),
    (qc, id) => {
      patchNotes(qc, (notes) => notes.filter((n) => n.id !== id));
      patchRapor(qc, (page) =>
        page.notes.some((n) => n.id === id)
          ? { ...page, notes: page.notes.filter((n) => n.id !== id), count: Math.max(0, page.count - 1) }
          : page,
      );
    },
  );
