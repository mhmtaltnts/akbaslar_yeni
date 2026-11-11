import { meQuery } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { ScanLine } from "lucide-react";
import { lazy, Suspense, useState } from "react";

// Kamera ekranı ve okuma motoru (~22 MB model + WASM) sadece düğmeye
// basılınca yüklenir; özellik kapalı otoparklarda hiç indirilmez.
const PlateScanner = lazy(() => import("./plate-scanner"));

// Plaka alanının yanındaki "tara" düğmesi. Sadece bu otoparkta SüperAdmin
// telefonda plaka okumayı açtıysa görünür (GET /auth/me -> plateScan).
export function PlateScanButton({ label, onResult }: { label: string; onResult: (plate: string) => void }) {
  const { data: me } = useQuery(meQuery);
  const [open, setOpen] = useState(false);
  if (!me?.plateScan) return null;
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
