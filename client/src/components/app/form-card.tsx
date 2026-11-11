import type { ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// Form sayfaları için ortak kart: geri linki, başlık, gövde, alt eylem çubuğu.
export function FormCard({
  title,
  description,
  backTo,
  backLabel = "Geri",
  backSearch,
  children,
  footer,
  onSubmit,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  backTo?: LinkProps["to"];
  backSearch?: Record<string, unknown>;
  backLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-2xl", className)}>
      {backTo && (
        <Link
          to={backTo}
          search={backSearch as never}
          className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm font-medium"
        >
          <ArrowLeft className="size-4" /> {backLabel}
        </Link>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.(e);
        }}
        autoComplete="off"
        className="bg-card overflow-hidden rounded-xl border shadow-xs"
      >
        <div className="border-b px-6 py-5">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
        </div>
        <div className="space-y-5 px-6 py-6">{children}</div>
        {footer && (
          <div className="bg-muted/30 flex flex-col-reverse gap-2 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
            {footer}
          </div>
        )}
      </form>
    </div>
  );
}

// Plaka girişleri: büyük harf + monospace.
export const plateInputClass = "font-mono text-base tracking-wider uppercase md:text-base";
