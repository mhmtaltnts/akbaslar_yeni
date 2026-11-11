import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { setActivePark, setToken } from "@/lib/auth";
import type { CurrentPark, Message } from "./types";

// Bu oturumda üzerinde çalışılan otopark: kendi otoparkı, ya da sitenin alan
// adının otoparkı (orada çalışma izni varsa). SüperAdmin seçim yapınca
// otoparka bağlı önbellekle birlikte sıfırlanır.
export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: () => apiFetch<CurrentPark>("/auth/me"),
  staleTime: 5 * 60_000,
  // Kullanıcı hiçbir şey yapmadan beklerken de rol değişikliği gelsin: bu
  // istek yanıtındaki `X-Auth-Stale` token'ı yeniler (bkz. lib/api.ts).
  // Sekme arka plandayken durur, sekmeye dönünce hemen tekrar sorulur.
  refetchInterval: 15_000,
  refetchOnWindowFocus: "always",
});

export const useLogin = () =>
  useMutation({
    mutationFn: (body: { username: string; password: string }) =>
      apiFetch<{ accessToken: string }>("/auth/login", { method: "POST", body, auth: false }),
    onSuccess: ({ accessToken }) => {
      setActivePark(null); // önceki SüperAdmin oturumunun park seçimi taşınmasın
      setToken(accessToken);
    },
  });

export const useSignup = () =>
  useMutation({
    mutationFn: (body: { fullname: string; username: string; password: string; park: string }) =>
      apiFetch<Message>("/auth/signup", { method: "POST", body, auth: false }),
  });

// Çıkış sırası önemli:
//  1. Sunucuda çıkış -- refresh cookie silinir. Bunu BEKLEMEZSEK, kullanıcı
//     hemen panele dönerse cookie hâlâ geçerli olur ve oturum geri gelir.
//  2. Çağıran taraf panelden çıkar (navigate).
//  3. `clearSession`: token ve önbellek temizlenir -- aynı tarayıcıda başka
//     bir otoparkın kullanıcısı giriş yaparsa eski veriyi görmemeli. Panelden
//     çıkmadan temizlersek dashboard "oturum düştü" sanıp girişe yönlendirir.
export const useLogout = () => {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<Message | undefined>("/auth/logout", { method: "POST", auth: false }).catch(
        () => undefined, // sunucuya ulaşılamasa da yerelde çıkış yapılmalı
      ),
  });
  const clearSession = () => {
    setToken(null);
    setActivePark(null);
    qc.clear();
  };
  return { ...mutation, clearSession };
};
