import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      // 4xx hataları tekrar denemenin anlamı yok (yetki, bulunamadı vb.).
      retry: (count, err) =>
        !(err instanceof ApiError && typeof err.status === "number" && err.status < 500) &&
        count < 2,
    },
  },
});
