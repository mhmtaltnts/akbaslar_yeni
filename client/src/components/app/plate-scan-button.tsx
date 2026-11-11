import { meQuery } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { ScanLine } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";

// Kamera ekranı ve okuma motoru (~21 MB model + WASM). Özellik kapalı
// otoparklarda hiç indirilmez.
const loadScanner = () => import("./plate-scanner");
const PlateScanner = lazy(loadScanner);

// Özellik açıksa form açılınca motor arka planda hazırlanır (indirme, WASM
// derleme, modelleri açma): çalışan formu doldururken biter, tarama düğmesine
// basınca okuma hemen başlar. Sayfa başına bir kez (loadPlateReader zaten
// tek sefer yükler). Veri tasarrufu açıksa yapılmaz; o zaman ilk taramada
// yüklenir. Hata olursa sessiz: kamera ekranı tekrar dener ve hatayı gösterir.
let warmed = false;
function warmUp() {
  if (warmed) return;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return;
  warmed = true;
  const run = () => {
    void loadScanner().catch(() => {});
    void import("@/lib/plate/reader")
      .then((m) => m.loadPlateReader())
      .catch(() => {
        warmed = false;
      });
  };
  // Sayfanın kendi yüklemesi bitsin, sonra başla.
  if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: 2000 });
  else setTimeout(run, 500);
}

// Plaka alanının yanındaki "tara" düğmesi. Sadece bu otoparkta SüperAdmin
// telefonda plaka okumayı açtıysa görünür (GET /auth/me -> plateScan).
export function PlateScanButton({ label, onResult }: { label: string; onResult: (plate: string) => void }) {
  const { data: me } = useQuery(meQuery);
  const [open, setOpen] = useState(false);
  const enabled = Boolean(me?.plateScan);
  useEffect(() => {
    if (enabled) warmUp();
  }, [enabled]);
  if (!enabled) return null;
  return (
    <>
      <Button type="button" variant="outline" size="icon" onClick={() => setOpen(true)} aria-label={`${label} — kamerayla oku`} title="Kamerayla oku">
        <ScanLine />
      </Button>
      {open && (
        <Suspense fallback={null}>
          <PlateScanner title={label} onResult={onResult} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
