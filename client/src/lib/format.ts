// Tarih/süre biçimlendirme yardımcıları (epoch ms alır; null/undefined güvenli).

export function formatDateTime(ms?: number | null) {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatDate(ms?: number | null) {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
  });
}

export function formatTime(ms?: number | null) {
  if (!ms) return "";
  return new Date(ms).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Parkta kalınan gün: takvim günü olarak, giriş günü dahil (eski
// `calculateDaysBetweenDates` ile aynı kural).
export function stayDays(from?: number | null, to?: number | null) {
  if (!from) return null;
  const a = new Date(from);
  const b = new Date(to ?? Date.now());
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.round(Math.abs(b.getTime() - a.getTime()) / 86_400_000) + 1;
}

// "4. gün" -- giriş tarihi yoksa boş.
export function stayLabel(from?: number | null, to?: number | null) {
  const d = stayDays(from, to);
  return d ? `${d}. gün` : "";
}

// "3 saat önce", "2 gün önce" gibi kısa göreli süre.
export function timeAgo(ms?: number | null) {
  if (!ms) return "";
  const diff = Math.max(0, Date.now() - ms);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "az önce";
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat önce`;
  const d = Math.floor(h / 24);
  return `${d} gün önce`;
}

// datetime-local input'u için "YYYY-MM-DDTHH:mm" (yerel saat).
export function toDateTimeLocal(ms?: number | null) {
  if (!ms) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDateTimeLocal(value: string) {
  return value ? new Date(value).getTime() : null;
}

// RTK Query hatasından kullanıcıya gösterilecek mesaj.
export function apiErrorMessage(err: unknown, fallback = "Bir hata oluştu") {
  const e = err as { data?: { message?: string }; status?: unknown };
  if (e?.data?.message) return e.data.message;
  if (e?.status === "FETCH_ERROR") return "Sunucuya ulaşılamıyor";
  return fallback;
}
