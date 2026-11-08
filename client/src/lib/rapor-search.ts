// Rapor sayfaları (`/dashboard/rapor`, detay, düzenleme) ortak `?page=` arama
// parametresi taşır: sayfa numarası Redux yerine URL'de durur, böylece sayfa
// yenilenince ya da link paylaşılınca kaybolmaz. 1. sayfa URL'de görünmez.
export type RaporSearch = { page?: number };

export function validateRaporSearch(search: Record<string, unknown>): RaporSearch {
  const page = Number(search.page);
  return { page: Number.isInteger(page) && page > 1 ? page : undefined };
}

export const pageSearch = (page: number): RaporSearch => ({
  page: page > 1 ? page : undefined,
});
