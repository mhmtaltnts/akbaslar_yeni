import { Check } from "lucide-react";
import { ROLES, SUPER_ADMIN } from "@/utils/config/roles";
import { cn } from "@/lib/utils";

const DESCRIPTIONS: Record<string, string> = {
  [ROLES.Admin]: "Tüm yetkiler, kullanıcı yönetimi",
  [ROLES.Manager]: "Kayıtları ve raporları yönetir",
  [ROLES.Officer]: "Gümrük bilgisi girer",
  [ROLES.Employee]: "Araç giriş ve çıkışı yapar",
  [SUPER_ADMIN]: "Tüm otoparklar, otopark ve izin yönetimi",
};

// Çoklu rol seçimi: her rol açıklamalı, tıklanabilir bir kart.
// `superAdmin`: SüperAdmin rolünü de seçenek olarak göster (sadece SüperAdmin
// kullanıcıya). `locked`: değiştirilemeyen roller (örn. kendi SüperAdmin rolü).
export function RolePicker({
  value,
  onChange,
  superAdmin = false,
  locked = [],
}: {
  value: string[];
  onChange: (roles: string[]) => void;
  superAdmin?: boolean;
  locked?: string[];
}) {
  const options: string[] = [...Object.values(ROLES), ...(superAdmin ? [SUPER_ADMIN] : [])];
  const toggle = (role: string) =>
    onChange(value.includes(role) ? value.filter((r) => r !== role) : [...value, role]);

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((role) => {
        const selected = value.includes(role);
        const isLocked = locked.includes(role);
        return (
          <button
            key={role}
            type="button"
            role="checkbox"
            aria-checked={selected}
            disabled={isLocked}
            title={isLocked ? "Kendi SüperAdmin yetkinizi kaldıramazsınız" : undefined}
            onClick={() => toggle(role)}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
              selected
                ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                : "hover:bg-muted/50",
              isLocked && "cursor-default opacity-80",
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
            r === SUPER_ADMIN
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
