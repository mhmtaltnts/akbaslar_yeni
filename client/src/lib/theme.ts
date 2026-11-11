import { useSyncExternalStore } from "react";

// Tema durumu: tek kaynak `<html class="dark">`. index.html'deki küçük script
// ilk boyamadan önce kayıtlı tercihi/sistem temasını uygular; burada sadece
// okuyup değiştiriyoruz. Redux'a gerek yok: birkaç bileşenin paylaştığı tek
// bir boolean, `useSyncExternalStore` ile hepsi senkron kalıyor.
const listeners = new Set<() => void>();

const isDark = () => document.documentElement.classList.contains("dark");

export function setDark(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem("theme", dark ? "dark" : "light");
  } catch {
    /* gizli sekme vb. -- tercih kaydedilemezse sorun değil */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDarkMode() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  return { dark, toggle: () => setDark(!dark) };
}
