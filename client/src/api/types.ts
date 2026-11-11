// Backend'in döndürdüğü kayıtlar. Backend `_id` gönderir; istemcide `id`
// olarak normalize ediyoruz (eski `note.id = note._id` dönüşümünün tipli hali).

export type Note = {
  id: string;
  getiren: string;
  dorse: string;
  firma?: string | null;
  mal?: string | null;
  gumrukBilgi?: string | null;
  goturen?: string | null;
  girisYapan?: string | null;
  gumrukYapan?: string | null;
  cikisYapan?: string | null;
  guncellemeYapan?: string | null;
  girisTarihi?: number | null;
  gumrukBilgiTarihi?: number | null;
  cikisTarihi?: number | null;
  guncellemeTarihi?: number | null;
  // Aracın bulunduğu otopark; sadece parktaki araçlar listesinde gelir.
  parkName?: string | null;
};

export type User = {
  id: string;
  fullname: string;
  username: string;
  roles: string[];
  active: boolean;
};

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  address?: string | null;
  // Otoparkın sitesinin alan adı ("www." olmadan).
  domain?: string | null;
  active: boolean;
  // Telefonda plaka okuma açık mı (deneme özelliği, SüperAdmin açar).
  plateScan: boolean;
};

// GET /auth/me: bu istekte üzerinde çalışılan otopark (alan adı kuralı ve
// SüperAdmin seçimi uygulanmış hali).
export type CurrentPark = { tenantId: string; tenantName: string; isHome: boolean; plateScan?: boolean };

// Gümrük memuru ve SüperAdmin'in ona verdiği ek otopark izinleri.
export type Officer = {
  id: string;
  fullname: string;
  username: string;
  homeParkId: string;
  homeParkName: string;
  parkIds: string[];
};

export type PublicPark = { name: string; slug: string; address?: string | null };

export type PublicNote = {
  id: string;
  getiren: string;
  dorse: string;
  firma?: string | null;
  girisTarihi?: number | null;
};

export type Message = { message: string };

export const withId = <T extends { _id: string }>({ _id, ...rest }: T) =>
  ({ id: _id, ...rest }) as Omit<T, "_id"> & { id: string };
