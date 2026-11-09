import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { setActivePark, setToken } from "@/lib/auth";
import type { Message } from "./types";

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
