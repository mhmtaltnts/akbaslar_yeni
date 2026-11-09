import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileQuestion } from "lucide-react";
import { noteByIdQuery, raporQuery } from "@/api/notes";
import type { Note } from "@/api/types";
import type { RaporSearch } from "@/lib/rapor-search";
import { apiErrorMessage } from "@/lib/format";
import { EmptyState, ErrorAlert, PageLoader } from "./page";

// Parktaki tek bir aracı yükler; yükleniyor / hata / bulunamadı durumlarını
// tek yerde ele alır (çıkış, gümrük, düzenleme sayfaları).
export function NoteGate({ id, children }: { id: string; children: (note: Note) => ReactNode }) {
  const { data: note, isPending, isError, error } = useQuery(noteByIdQuery(id));
  if (isPending) return <PageLoader />;
  if (isError) return <ErrorAlert message={apiErrorMessage(error)} />;
  if (!note)
    return (
      <EmptyState
        icon={FileQuestion}
        title="Kayıt bulunamadı"
        description="Araç parktan çıkmış ya da kayıt silinmiş olabilir."
      />
    );
  return <>{children(note)}</>;
}

// Rapordaki (çıkışı yapılmış) tek bir kayıt: ilgili rapor sayfasının
// önbelleğinden seçilir.
export function RaporNoteGate({
  id,
  search,
  children,
}: {
  id: string;
  search: RaporSearch;
  children: (note: Note) => ReactNode;
}) {
  const { data: note, isPending, isError, error } = useQuery({
    ...raporQuery(search),
    select: (d) => d.notes.find((n) => n.id === id) ?? null,
  });
  if (isPending) return <PageLoader />;
  if (isError) return <ErrorAlert message={apiErrorMessage(error)} />;
  if (!note)
    return (
      <EmptyState
        icon={FileQuestion}
        title="Kayıt bulunamadı"
        description="Kayıt silinmiş ya da başka bir rapor sayfasında olabilir."
      />
    );
  return <>{children(note)}</>;
}
