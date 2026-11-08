import { getToken, setToken } from "./auth";

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
  return parse<T>(res);
}
