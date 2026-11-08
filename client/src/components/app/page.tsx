import type { ReactNode } from "react";
import { AlertCircle, Inbox, Loader2, Search, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageLoader({ label = "Yükleniyor..." }: { label?: string }) {
  return (
    <div className="text-muted-foreground flex min-h-48 items-center justify-center gap-2 text-sm">
      <Loader2 className="size-4 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorAlert({ message }: { message?: ReactNode }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: typeof Inbox;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <Icon className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Ara...",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full sm:max-w-xs", className)}>
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-input bg-card placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-9 w-full rounded-md border pr-3 pl-9 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
      />
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

// Salt okunur bilgi listesi (detay sayfaları, çıkış/gümrük özetleri).
export function DetailList({
  items,
  className,
}: {
  items: { label: ReactNode; value: ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn("grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2", className)}>
      {items.map((item, i) => (
        <div key={i} className="space-y-1">
          <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {item.label}
          </dt>
          <dd className="text-sm font-medium">{item.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon: typeof Inbox;
  tone?: "primary" | "success" | "warning" | "muted";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground dark:text-warning",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <div className="bg-card rounded-xl border p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm font-medium">{label}</p>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">
            {value}
          </p>
        </div>
        <div className={cn("flex size-10 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="size-5" />
        </div>
      </div>
      {hint && <p className="text-muted-foreground mt-3 text-xs">{hint}</p>}
    </div>
  );
}

export function Brand({ name, className }: { name?: ReactNode; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5 font-semibold", className)}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#4f7cff] to-[#1d3fc4] text-white shadow-sm">
        <Truck className="size-[18px]" strokeWidth={2.25} aria-hidden="true" />
      </span>
      <span className="truncate">{name}</span>
    </span>
  );
}
