import { apiSlice } from "./apiSlice";

export type Tenant = {
  _id: string;
  name: string;
  slug: string;
  address?: string | null;
  active: boolean;
};

// Otopark (tenant) yönetimi -- sadece SüperAdmin.
export const tenantsApiSlice = apiSlice
  .enhanceEndpoints({ addTagTypes: ["Tenant"] })
  .injectEndpoints({
    endpoints: (builder) => ({
      getTenants: builder.query<Tenant[], void>({
        query: () => "/tenants",
        providesTags: [{ type: "Tenant", id: "LIST" }],
      }),
      addNewTenant: builder.mutation({
        query: (body) => ({ url: "/tenants", method: "POST", body }),
        invalidatesTags: [{ type: "Tenant", id: "LIST" }],
      }),
      updateTenant: builder.mutation({
        query: (body) => ({ url: "/tenants", method: "PATCH", body }),
        invalidatesTags: [{ type: "Tenant", id: "LIST" }],
      }),
    }),
  });

export const {
  useGetTenantsQuery,
  useAddNewTenantMutation,
  useUpdateTenantMutation,
} = tenantsApiSlice;
