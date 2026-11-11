import { cn } from "@/lib/utils";

// Türk plakası görünümünde rozet: solda mavi "TR" şeridi, monospace yazı.
//
// `truncate`: eski kayıtlarda plaka alanlarına not da yazılmış
// ("38AFM 748 NAKİT 1700TL HAV 600TL ..."); tablolarda bu metin satırı
// genişletip tabloyu taşırıyordu. Açıkken rozet bulunduğu alanın genişliğini
// aşmaz, fazlası "…" ile kısalır ve tamamı üzerine gelince görünür.
export function Plate({
  value,
  className,
  size = "md",
  truncate = false,
}: {
  value?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
  truncate?: boolean;
}) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      title={truncate ? value : undefined}
      className={cn(
        "inline-flex items-stretch overflow-hidden rounded-[5px] border border-zinc-800/80 bg-white font-mono font-bold tracking-wider whitespace-nowrap text-zinc-900 shadow-xs dark:border-zinc-300/40",
        size === "sm" && "text-[11px]",
        size === "md" && "text-xs",
        size === "lg" && "text-base",
        truncate && "max-w-full",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-end bg-blue-700 font-sans font-semibold text-white",
          size === "lg" ? "px-1.5 pb-0.5 text-[10px]" : "px-1 pb-px text-[8px]",
        )}
      >
        TR
      </span>
      <span className={cn(size === "lg" ? "px-2.5 py-1" : "px-1.5 py-0.5", truncate && "min-w-0 truncate")}>
        {value}
      </span>
    </span>
  );
}
