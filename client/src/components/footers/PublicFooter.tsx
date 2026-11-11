import { MapPin } from "lucide-react";
import { mapsSearchUrl } from "@/lib/maps";
import { useSiteBrand } from "@/utils/hooks/useSite";

// Adres ve ad sitenin açıldığı alan adının otoparkından gelir (useSiteBrand).
// Harita bağlantısı adresle Google Haritalar'da arama yapar.
const PublicFooter = () => {
  const { name, address } = useSiteBrand();
  const mapsUrl = address ? mapsSearchUrl(name, address) : null;

  return (
    <footer className="border-t">
      <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm sm:flex-row sm:px-6">
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground flex items-center gap-2 transition-colors"
          >
            <MapPin className="size-4 shrink-0" />
            <address className="not-italic">{address}</address>
          </a>
        ) : (
          <span />
        )}
        <p>
          © {new Date().getFullYear()} {name}
        </p>
      </div>
    </footer>
  );
};

export default PublicFooter;
