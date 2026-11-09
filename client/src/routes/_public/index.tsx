import Slider from "@/components/Slider/Slider";
import { Button } from "@/components/ui/button";
import { useSiteBrand } from "@/utils/hooks/useSite";
import useTitle from "@/utils/hooks/useTitle";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock, FileCheck2, ShieldCheck, Truck } from "lucide-react";

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
  const { name } = useSiteBrand();
  useTitle(name);

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

          <Slider className="aspect-[4/3] w-full shadow-2xl ring-1 ring-black/5" />
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
    </>
  );
}
