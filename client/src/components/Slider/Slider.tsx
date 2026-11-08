import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const IMAGES = [
  "/img/konak-park-1.jpg",
  "/img/konak-park-2.jpg",
  "/img/konak-park-3.jpg",
  "/img/konak-park-4.jpg",
  "/img/konak-park-5.jpg",
];

// Otomatik ilerleyen, yumuşak geçişli görsel galeri.
const Slider = ({ className }: { className?: string }) => {
  const [slide, setSlide] = useState(0);
  const go = (i: number) => setSlide((i + IMAGES.length) % IMAGES.length);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % IMAGES.length), 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className={cn("group relative overflow-hidden rounded-2xl", className)}>
      {IMAGES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
            i === slide ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

      <button
        onClick={() => go(slide - 1)}
        aria-label="Önceki görsel"
        className="absolute top-1/2 left-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-zinc-900 opacity-0 shadow transition-opacity group-hover:opacity-100 hover:bg-white"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        onClick={() => go(slide + 1)}
        aria-label="Sonraki görsel"
        className="absolute top-1/2 right-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-zinc-900 opacity-0 shadow transition-opacity group-hover:opacity-100 hover:bg-white"
      >
        <ChevronRight className="size-5" />
      </button>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
        {IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            aria-label={`Görsel ${i + 1}`}
            className={cn(
              "h-1.5 rounded-full bg-white transition-all",
              i === slide ? "w-6" : "w-1.5 opacity-60 hover:opacity-100",
            )}
          />
        ))}
      </div>
    </div>
  );
};

export default Slider;
