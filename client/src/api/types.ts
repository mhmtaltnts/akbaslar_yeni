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
  active: boolean;
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
