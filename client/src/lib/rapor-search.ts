// Rapor sayfalarının (`/dashboard/rapor`, detay, düzenleme) ortak URL
// arama parametreleri: sayfa, arama metni ve çıkış tarihi aralığı. URL'de
// durdukları için sayfa yenilenince, detaya gidip dönünce ya da link
// paylaşılınca filtre kaybolmaz. Varsayılanlar (1. sayfa, boş arama, tarih
// yok) URL'de görünmez. Arama ve tarih filtresi backend'de, tüm rapor
// geçmişinde uygulanır (GET /rapor, GET /rapor/export).
export type RaporSearch = { page?: number; q?: string; from?: string; to?: string };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const day = (v: unknown) => (typeof v === "string" && DAY.test(v) ? v : undefined);

export function validateRaporSearch(search: Record<string, unknown>): RaporSearch {
  const page = Number(search.page);
  const q = typeof search.q === "string" ? search.q.trim().slice(0, 100) : "";
  let from = day(search.from);
  let to = day(search.to);
  if (from && to && from > to) [from, to] = [to, from];
  return {
    page: Number.isInteger(page) && page > 1 ? page : undefined,
    q: q || undefined,
    from,
    to,
  };
}

// Aynı filtrede başka bir sayfa.
export const withPage = (search: RaporSearch, page: number): RaporSearch => ({
  ...search,
  page: page > 1 ? page : undefined,
});

// Seçilen günler kullanıcının KENDİ saat diliminde: başlangıç gününün
// 00:00'ı ile bitiş gününün 23:59:59.999'u (iki gün de dahil).
const dayStart = (d: string) => new Date(`${d}T00:00:00`).getTime();
const dayEnd = (d: string) => new Date(`${d}T23:59:59.999`).getTime();

// Backend'e giden filtre parametreleri (sayfa hariç).
export function raporFilterParams(search: RaporSearch): URLSearchParams {
  const p = new URLSearchParams();
  if (search.q) p.set("q", search.q);
  if (search.from) p.set("from", String(dayStart(search.from)));
  if (search.to) p.set("to", String(dayEnd(search.to)));
  return p;
}
