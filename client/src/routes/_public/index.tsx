import { publicPhotosQuery } from "@/api/photos";
import Slider from "@/components/Slider/Slider";
import { Button } from "@/components/ui/button";
import { mapsDirectionsUrl, mapsSearchUrl } from "@/lib/maps";
import { useSiteBrand } from "@/utils/hooks/useSite";
import useTitle from "@/utils/hooks/useTitle";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock, FileCheck2, MapPin, Navigation, ShieldCheck, Truck } from "lucide-react";

export const Route = createFileRoute("/_public/")({
  component: Public,
});

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "7/24 güvenlik",
    desc: "Kamera ve personel ile kesintisiz gözetim altında güvenli park alanı.",
  },
  {
    icon: FileCheck2,
    title: "Gümrük takibi",
    desc: "Araçlarınızın gümrük işlemleri kayıt altında, durumu her an takip edilebilir.",
  },
  {
    icon: Clock,
    title: "Anlık giriş-çıkış",
    desc: "Her giriş ve çıkış anında sisteme işlenir; dorsenizin parkta olup olmadığını görün.",
  },
];

function Public() {
  const { name, site } = useSiteBrand();
  useTitle(name);
  // Slayt: alan adının otoparkının fotoğrafları (Kurucu panelden ekler);
  // yoksa varsayılan görseller.
  const { data: photos } = useQuery({ ...publicPhotosQuery(site?.slug ?? ""), enabled: Boolean(site) });

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="from-primary/10 pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b to-transparent" />
        <div className="bg-primary/20 pointer-events-none absolute -top-40 -right-40 -z-10 size-[28rem] rounded-full blur-3xl" />

        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div className="space-y-6">
            <span className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold">
              <span className="bg-primary size-1.5 animate-pulse rounded-full" />
              7/24 açık · Güvenli tır parkı
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              Dorseniz güvende,
              <span className="text-primary"> her an takipte.</span>
            </h1>
            <p className="text-muted-foreground max-w-lg text-lg text-pretty">
              {name}, tır ve dorseleriniz için güvenli park alanı ve
              gümrük süreçlerinin anlık takibini sunar.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/notes-list">
                  <Truck /> Parktaki araçları gör
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/login">
                  Personel girişi <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>

          <Slider className="aspect-[4/3] w-full shadow-2xl ring-1 ring-black/5" images={photos?.map((p) => p.url)} />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-card rounded-xl border p-6 shadow-xs">
              <div className="bg-primary/10 text-primary mb-4 flex size-11 items-center justify-center rounded-lg">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-muted-foreground mt-1.5 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <ParkLocation />
    </>
  );
}

// Sitenin açıldığı alan adının otoparkının adresi ve Google Haritalar
// bağlantıları (akbaslartirparki.com -> Gebze Konak, muallimkoykonak.com ->
// Muallimköy). Alan adı bir otoparka bağlı değilse (IP ile erişim) ya da
// otoparkın adresi girilmemişse bölüm görünmez.
function ParkLocation() {
  const { site } = useSiteBrand();
  const address = site?.address?.trim();
  if (!site || !address) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
      <h2 className="mb-4 text-xl font-semibold">Konum</h2>
      <div className="bg-card flex max-w-xl flex-col gap-4 rounded-xl border p-6 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-lg">
            <MapPin className="size-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold">{site.name}</h3>
            <address className="text-muted-foreground mt-1 text-sm not-italic">{address}</address>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href={mapsDirectionsUrl(site.name, address)} target="_blank" rel="noopener noreferrer">
              <Navigation /> Yol tarifi
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={mapsSearchUrl(site.name, address)} target="_blank" rel="noopener noreferrer">
              <MapPin /> Haritada gör
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
