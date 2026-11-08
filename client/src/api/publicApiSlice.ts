import { apiSlice } from "./apiSlice";

export type PublicPark = { name: string; slug: string; address?: string | null };

export type PublicNote = {
  _id: string;
  getiren: string;
  dorse: string;
  firma?: string | null;
  girisTarihi?: number | null;
};

// Giriş gerektirmeyen, otopark bazlı endpoint'ler.
export const publicApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPublicParks: builder.query<PublicPark[], void>({
      query: () => "/public/parks",
    }),
    getPublicNotes: builder.query<PublicNote[], string>({
      query: (slug) => `/public/parks/${encodeURIComponent(slug)}/notes`,
    }),
  }),
});

export const { useGetPublicParksQuery, useGetPublicNotesQuery } =
  publicApiSlice;
