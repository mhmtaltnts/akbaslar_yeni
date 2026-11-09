import { useCallback, useSyncExternalStore } from "react";

// CSS media query eşleşiyor mu? Aynı veriyi hem masaüstü hem mobil düzende
// (biri CSS ile gizli) iki kez çizmek yerine yalnızca görünen düzeni çizmek için.
export default function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}
