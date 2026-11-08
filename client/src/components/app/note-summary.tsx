import { DetailList } from "./page";
import { Plate } from "./plate";
import { formatDateTime, stayLabel } from "@/lib/format";

type Note = {
  dorse: string;
  getiren: string;
  firma?: string | null;
  mal?: string | null;
  girisTarihi?: number | null;
};

// Çıkış/gümrük formlarının üstünde aracın salt okunur özeti.
export function NoteSummary({ note }: { note: Note }) {
  return (
    <div className="bg-muted/40 rounded-lg border p-4">
      <DetailList
        items={[
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
