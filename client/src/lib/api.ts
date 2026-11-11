import { getActivePark, getToken, setToken } from "./auth";

const BASE_URL = import.meta.env.VITE_API_URL as string;

// Hata şekli eski RTK Query hatalarıyla aynı ({ status, data: { message } }),
// böylece `apiErrorMessage` ve 404 kontrolleri değişmeden çalışır.
export class ApiError extends Error {
  status: number | "FETCH_ERROR";
  data?: { message?: string };
  constructor(status: number | "FETCH_ERROR", data?: { message?: string }) {
    super(data?.message ?? `HTTP ${status}`);
    this.status = status;
    this.data = data;
  }
}

type Options = { method?: string; body?: unknown; auth?: boolean };

async function rawFetch(path: string, { method = "GET", body }: Options) {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  // SüperAdmin'in park seçimi (bkz. lib/auth.ts); diğer rollerde backend yok sayar.
  const park = getActivePark();
  if (park) headers["X-Park-Id"] = park.id;
  try {
    return await fetch(BASE_URL + path, {
      method,
      headers,
      credentials: "include", // refresh cookie
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("FETCH_ERROR", { message: "Sunucuya ulaşılamıyor" });
  }
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

// Aynı anda birden çok istek 403 alırsa tek bir refresh isteği yapılsın.
let refreshing: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  refreshing ??= (async () => {
    try {
      const res = await rawFetch("/auth/refresh", {});
      const { accessToken } = await parse<{ accessToken: string }>(res);
      setToken(accessToken);
      return accessToken;
    } catch {
      setToken(null);
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

// Rol değişikliği anında yansısın: backend, token'daki rol/otopark bilgisi
// DB'deki güncel halinden farklıysa yanıta `X-Auth-Stale` ekler. Görünce
// token'ı arka planda yenileriz (yeni token DB'den imzalanır); `useAuth`
// token'a abone olduğu için menüler hemen yeni rollere göre çizilir.
// `onAuthChanged` dinleyicileri (bkz. router.tsx) önbelleği tazeler.
const authChangeListeners = new Set<() => void>();
export function onAuthChanged(listener: () => void) {
  authChangeListeners.add(listener);
  return () => authChangeListeners.delete(listener);
}

let staleRefresh: Promise<void> | null = null;
function checkStale(res: Response, sentWith: string | null) {
  if (!res.headers.get("X-Auth-Stale") || !sentWith || getToken() !== sentWith) return;
  staleRefresh ??= refreshAccessToken()
    .then((fresh) => {
      if (fresh) authChangeListeners.forEach((l) => l());
    })
    .finally(() => {
      staleRefresh = null;
    });
}

// Backend süresi dolmuş/geçersiz access token'da 403 döner: bir kez yenileyip
// isteği tekrarla (eski `baseQueryWithReauth` karşılığı).
export async function apiFetch<T>(path: string, options: Options = {}): Promise<T> {
  const sentWith = getToken();
  let res = await rawFetch(path, options);
  if (res.status === 403 && options.auth !== false && sentWith) {
    // İstek uçuştayken başka bir istek token'ı zaten yenilediyse ikinci bir
    // refresh yapma, yeni token'la tekrar dene. (`refreshing` birleştirmesi
    // sadece AYNI ANDA devam eden refresh'leri yakalar; ilki bittikten sonra
    // gelen 403'leri değil.)
    const fresh = getToken() !== sentWith ? getToken() : await refreshAccessToken();
    if (fresh) res = await rawFetch(path, options);
  }
  checkStale(res, getToken());
  return parse<T>(res);
}

// Dosya indirme (örn. Excel): `apiFetch` gibi 403'te token'ı yenileyip bir
// kez tekrar dener, ama yanıtı JSON yerine Blob olarak döner. Dosya adı
// `Content-Disposition` başlığından (UTF-8 `filename*` öncelikli) okunur.
export async function apiDownload(path: string): Promise<{ blob: Blob; filename?: string }> {
  const sentWith = getToken();
  let res = await rawFetch(path, {});
  if (res.status === 403 && sentWith) {
    const fresh = getToken() !== sentWith ? getToken() : await refreshAccessToken();
    if (fresh) res = await rawFetch(path, {});
  }
  checkStale(res, getToken());
  if (!res.ok) await parse(res); // hata mesajını ApiError olarak fırlatır
  const cd = res.headers.get("Content-Disposition") ?? "";
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(cd)?.[1];
  const plain = /filename="([^"]+)"/i.exec(cd)?.[1];
  return { blob: await res.blob(), filename: utf8 ? decodeURIComponent(utf8) : plain };
}
