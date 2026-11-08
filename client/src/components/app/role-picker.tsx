import { Check } from "lucide-react";
import { ROLES } from "@/utils/config/roles";
import { cn } from "@/lib/utils";

const DESCRIPTIONS: Record<string, string> = {
  [ROLES.Admin]: "Tüm yetkiler, kullanıcı yönetimi",
  [ROLES.Manager]: "Kayıtları ve raporları yönetir",
  [ROLES.Officer]: "Gümrük bilgisi girer",
  [ROLES.Employee]: "Araç giriş ve çıkışı yapar",
};

// Çoklu rol seçimi: her rol açıklamalı, tıklanabilir bir kart.
export function RolePicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (roles: string[]) => void;
}) {
  const toggle = (role: string) =>
    onChange(value.includes(role) ? value.filter((r) => r !== role) : [...value, role]);

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {Object.values(ROLES).map((role) => {
        const selected = value.includes(role);
        return (
          <button
            key={role}
            type="button"
            role="checkbox"
            aria-checked={selected}
            onClick={() => toggle(role)}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
              selected
                ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                : "hover:bg-muted/50",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                selected ? "border-primary bg-primary text-primary-foreground" : "border-input",
              )}
            >
              {selected && <Check className="size-3" strokeWidth={3} />}
            </span>
            <span>
              <span className="block text-sm font-medium">{role}</span>
              <span className="text-muted-foreground block text-xs">{DESCRIPTIONS[role]}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function RoleBadges({ roles }: { roles: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((r) => (
        <span
          key={r}
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            r === "SüperAdmin"
              ? "bg-violet-500/15 text-violet-700 dark:text-violet-300"
              : r === ROLES.Admin
                ? "bg-primary/10 text-primary"
                : "bg-secondary text-secondary-foreground",
          )}
        >
          {r}
        </span>
      ))}
    </div>
  );
}
