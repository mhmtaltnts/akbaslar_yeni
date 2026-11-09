import { useQuery } from "@tanstack/react-query";
import { meQuery } from "@/api/auth";
import { publicSiteQuery } from "@/api/public";
import { useActivePark, useToken } from "@/lib/auth";
import useAuth from "./useAuth";

const FALLBACK = "Tır Parkı";

// Sitenin markası: açıldığı alan adının otoparkı (akbaslartirparki.com ->
// Gebze Konak, muallimkoykonak.com -> Muallimköy). Alan adı bir otoparka
// bağlı değilse (IP ile erişim, yerel geliştirme) derleme ayarındaki ad.
// Yüklenirken nötr ad: yanlış otoparkın adı bir an bile görünmesin.
export function useSiteBrand() {
  const { data: site, isPending } = useQuery(publicSiteQuery);
  const envName = (import.meta.env.VITE_APP_TITLE as string | undefined) || FALLBACK;
  return {
    site: site ?? null,
    name: site?.name ?? (isPending ? FALLBACK : envName),
    address: site ? site.address : isPending ? null : (import.meta.env.VITE_APP_ADDRESS as string | undefined),
    isPending,
  };
}

// Panelde üzerinde çalışılan otoparkın adı: SüperAdmin'in seçimi, yoksa
// sunucunun bu oturum için belirlediği otopark (alan adı kuralı), o da
// yüklenmediyse token'daki kendi otoparkı.
export function useCurrentParkName() {
  const token = useToken();
  const active = useActivePark();
  const { isSuperAdmin, tenantName } = useAuth();
  const { data: me } = useQuery({ ...meQuery, enabled: Boolean(token) });
  if (isSuperAdmin && active) return active.name;
  return me?.tenantName ?? tenantName;
}
