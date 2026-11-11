import { parkPhotosQuery, useDeletePhoto, useUploadPhoto } from "@/api/photos";
import { EmptyState, ErrorAlert, PageHeader, PageLoader } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/format";
import useAuth from "@/utils/hooks/useAuth";
import { useCurrentParkName } from "@/utils/hooks/useSite";
import useTitle from "@/utils/hooks/useTitle";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ImagePlus, Images, Loader2, ShieldX, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

// Otoparkın fotoğrafları: sitenin ana sayfa slaytında döner. Kurucu kendi
// otoparkına, SüperAdmin seçtiği otoparka ekler/siler. Backend de ayrıca
// kontrol ediyor (require_admin); buradaki kontrol arayüz için.
export const Route = createFileRoute("/dashboard/photos/")({
  component: PhotosPage,
});

const MAX_PHOTOS = 20;

function PhotosPage() {
  useTitle("Fotoğraflar");
  const { isAdmin, isSuperAdmin } = useAuth();
  const parkName = useCurrentParkName();
  const allowed = isAdmin || isSuperAdmin;
  const { data: photos, isLoading, isError, error } = useQuery({ ...parkPhotosQuery, enabled: allowed });
  const upload = useUploadPhoto();
  const remove = useDeletePhoto();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  if (!allowed) return <EmptyState icon={ShieldX} title="Bu sayfa için yetkiniz yok" />;

  const count = photos?.length ?? 0;
  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])].slice(0, Math.max(0, MAX_PHOTOS - count));
    e.target.value = "";
    if (!files.length) return;
    setProgress({ done: 0, total: files.length });
    let ok = 0;
    // Sırayla: telefonda aynı anda birçok fotoğrafı küçültmek belleği zorlar.
    for (const [i, file] of files.entries()) {
      try {
        await upload.mutateAsync(file);
        ok++;
      } catch (err) {
        toast.error(`${file.name}: ${apiErrorMessage(err)}`);
      }
      setProgress({ done: i + 1, total: files.length });
    }
    setProgress(null);
    if (ok) toast.success(`${ok} fotoğraf eklendi`);
  };

  const onDelete = (id: string) => {
    if (!window.confirm("Bu fotoğraf silinsin mi?")) return;
    remove.mutate(id, {
      onSuccess: () => toast.success("Fotoğraf silindi"),
      onError: (err) => toast.error(apiErrorMessage(err)),
    });
  };

  return (
    <>
      <PageHeader
        title="Fotoğraflar"
        description={`${parkName ?? "Otopark"} · ana sayfadaki slaytta gösterilir (${count}/${MAX_PHOTOS})`}
        actions={
          <>
            <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
            <Button onClick={() => input.current?.click()} disabled={Boolean(progress) || count >= MAX_PHOTOS}>
              {progress ? <Loader2 className="animate-spin" /> : <ImagePlus />}
              {progress ? `Yükleniyor ${progress.done}/${progress.total}` : "Fotoğraf Ekle"}
            </Button>
          </>
        }
      />

      {isLoading && <PageLoader />}
      {isError && <ErrorAlert message={apiErrorMessage(error)} />}
      {photos?.length === 0 && (
        <EmptyState
          icon={Images}
          title="Henüz fotoğraf yok"
          description="Eklediğiniz fotoğraflar sitenizin ana sayfasındaki slaytta döner. Fotoğraf yoksa varsayılan görseller gösterilir."
        />
      )}
      {photos && photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p, i) => (
            <div key={p.id} className="bg-muted group relative aspect-[4/3] overflow-hidden rounded-xl border">
              <img src={p.url} alt={`Fotoğraf ${i + 1}`} loading="lazy" className="size-full object-cover" />
              <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">{i + 1}</span>
              <Button
                size="icon-sm"
                variant="destructive"
                className="absolute top-2 right-2"
                onClick={() => onDelete(p.id)}
                disabled={remove.isPending}
                aria-label={`Fotoğraf ${i + 1}'i sil`}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      )}
      <p className="text-muted-foreground mt-4 text-xs">
        Fotoğraflar yüklenmeden önce küçültülür (en uzun kenar 1600 piksel) ve içlerindeki konum bilgisi silinir.
      </p>
    </>
  );
}
