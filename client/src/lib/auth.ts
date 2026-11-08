import { useSyncExternalStore } from "react";

// Access token sadece bellekte tutulur (XSS'e karşı localStorage'a yazılmaz);
// sayfa yenilenince httpOnly refresh cookie ile yeniden alınır.
// Eskiden Redux'taki `authSlice` buydu: tek bir string için store gerekmiyor.
let token: string | null = null;
const listeners = new Set<() => void>();

export const getToken = () => token;

export function setToken(next: string | null) {
  token = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useToken() {
  return useSyncExternalStore(subscribe, getToken, getToken);
}

// "Beni hatırla": açıksa sayfa yenilendiğinde refresh cookie ile oturum
// sürdürülür (usePersist hook'u ile aynı localStorage anahtarı).
export function getPersist(): boolean {
  try {
    return JSON.parse(localStorage.getItem("persist") ?? "false") === true;
  } catch {
    return false;
  }
}
