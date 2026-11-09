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

// SüperAdmin'in çalıştığı otopark (park seçici). Seçiliyse her istekte
// `X-Park-Id` başlığıyla gönderilir; backend bunu SADECE SüperAdmin için
// dikkate alır, diğer roller her zaman kendi otoparkında kalır. Seçim bu
// tarayıcıda hatırlanır; null = kullanıcının kendi otoparkı.
export type ActivePark = { id: string; name: string };

const PARK_KEY = "activePark";
const parkListeners = new Set<() => void>();

function readPark(): ActivePark | null {
  try {
    const v = JSON.parse(localStorage.getItem(PARK_KEY) ?? "null");
    return v && typeof v.id === "string" && typeof v.name === "string" ? v : null;
  } catch {
    return null;
  }
}

let activePark: ActivePark | null = readPark();

export const getActivePark = () => activePark;

export function setActivePark(next: ActivePark | null) {
  activePark = next;
  try {
    if (next) localStorage.setItem(PARK_KEY, JSON.stringify(next));
    else localStorage.removeItem(PARK_KEY);
  } catch {
    // depolama kapalıysa seçim sadece bu sekmede geçerli olur
  }
  parkListeners.forEach((l) => l());
}

function subscribePark(listener: () => void) {
  parkListeners.add(listener);
  return () => parkListeners.delete(listener);
}

export function useActivePark() {
  return useSyncExternalStore(subscribePark, getActivePark, getActivePark);
}
