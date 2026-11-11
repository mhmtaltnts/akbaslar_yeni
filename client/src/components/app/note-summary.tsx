import { DetailList } from "./page";
import { Plate } from "./plate";
import { formatDateTime, stayLabel } from "@/lib/format";

type Note = {
  dorse: string;
  getiren: string;
  firma?: string | null;
  mal?: string | null;
  girisTarihi?: number | null;
  parkName?: string | null;
};

// Çıkış/gümrük formlarının üstünde aracın salt okunur özeti.
export function NoteSummary({ note, showPark = false }: { note: Note; showPark?: boolean }) {
  return (
    <div className="bg-muted/40 rounded-lg border p-4">
      <DetailList
        items={[
          // Gümrük memuru birden çok otoparkla çalıştığı için hangi parkta
          // olduğunu da gösteriyoruz (diğer kullanıcılarda zaten kendi parkı).
          ...(showPark && note.parkName ? [{ label: "Otopark", value: note.parkName }] : []),
          { label: "Dorse", value: <Plate value={note.dorse} /> },
          { label: "Getiren çekici", value: <Plate value={note.getiren} /> },
          { label: "Firma", value: note.firma },
          { label: "Yükü", value: note.mal },
          { label: "Giriş", value: formatDateTime(note.girisTarihi) },
          { label: "Parkta", value: stayLabel(note.girisTarihi) },
        ]}
      />
    </div>
  );
}
