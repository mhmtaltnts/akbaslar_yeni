import { tenantsQuery, useAddTenant, useUpdateTenant } from "@/api/tenants";
import type { Tenant } from "@/api/types";
import { useQuery } from "@tanstack/react-query";
import { EmptyState, ErrorAlert, Field, PageHeader, PageLoader } from "@/components/app/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiErrorMessage } from "@/lib/format";
import { cn } from "@/lib/utils";
import useAuth from "@/utils/hooks/useAuth";
import useTitle from "@/utils/hooks/useTitle";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, ExternalLink, Loader2, MapPin, Pencil, Plus, ShieldX, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// Otopark (tenant) yönetimi: sadece SüperAdmin. Backend de ayrıca kontrol
// ediyor; buradaki kontrol sadece arayüz için.
export const Route = createFileRoute("/dashboard/parks/")({
  component: ParksPage,
});

function ParksPage() {
  useTitle("Otoparklar");
  const { isSuperAdmin, tenantId } = useAuth();
  const [creating, setCreating] = useState(false);
  const { data: tenants, isLoading, isError, error } = useQuery({
    ...tenantsQuery,
    enabled: isSuperAdmin,
  });

  if (!isSuperAdmin) {
    return <EmptyState icon={ShieldX} title="Bu sayfa için yetkiniz yok" />;
  }

  return (
    <>
      <PageHeader
        title="Otoparklar"
        description="Platformdaki tüm otopark işletmeleri"
        actions={
          !creating && (
            <Button onClick={() => setCreating(true)}>
              <Plus /> Yeni Otopark
            </Button>
          )
        }
      />

      {creating && <NewTenantForm onClose={() => setCreating(false)} />}

      {isLoading && <PageLoader />}
      {isError && <ErrorAlert message={apiErrorMessage(error)} />}

      {tenants && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tenants.map((t) => (
            <TenantCard key={t.id} tenant={t} isOwn={t.id === tenantId} />
          ))}
        </div>
      )}
    </>
  );
}

function TenantCard({ tenant, isOwn }: { tenant: Tenant; isOwn: boolean }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tenant.name);
  const [slug, setSlug] = useState(tenant.slug);
  const [address, setAddress] = useState(tenant.address ?? "");
  const updateTenant = useUpdateTenant();
  const isLoading = updateTenant.isPending;

  const save = (changes: Partial<Tenant> = {}) =>
    updateTenant.mutate(
      { id: tenant.id, name, slug, address, active: tenant.active, ...changes },
      {
        onSuccess: (res) => {
          toast.success(res.message);
          setEditing(false);
        },
        onError: (err) => toast.error(apiErrorMessage(err)),
      },
    );

  return (
    <div
      className={cn(
        "bg-card flex flex-col rounded-xl border shadow-xs",
        !tenant.active && "border-dashed opacity-80",
      )}
    >
      <div className="flex items-start gap-3 p-5">
        <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Building2 className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-3">
              <Field label="Ad" htmlFor={`n-${tenant.id}`}>
                <Input id={`n-${tenant.id}`} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Kod" htmlFor={`s-${tenant.id}`}>
                <Input id={`s-${tenant.id}`} className="font-mono" value={slug} onChange={(e) => setSlug(e.target.value)} />
              </Field>
              <Field label="Adres" htmlFor={`a-${tenant.id}`}>
                <Input id={`a-${tenant.id}`} value={address} onChange={(e) => setAddress(e.target.value)} />
              </Field>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-semibold">{tenant.name}</h3>
                {isOwn && <Badge variant="outline">Sizin</Badge>}
              </div>
              <p className="text-muted-foreground font-mono text-xs">{tenant.slug}</p>
              {tenant.address && (
                <p className="text-muted-foreground mt-2 flex items-start gap-1.5 text-sm">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" /> {tenant.address}
                </p>
              )}
            </>
          )}
        </div>
        {!editing && (
          <Badge
            className={
              tenant.active
                ? "bg-success/15 text-success"
                : "bg-destructive/15 text-destructive"
            }
          >
            {tenant.active ? "Aktif" : "Askıda"}
          </Badge>
        )}
      </div>

      <div className="bg-muted/30 mt-auto flex items-center gap-2 border-t px-4 py-3">
        {editing ? (
          <>
            <Button size="sm" onClick={() => save()} disabled={isLoading}>
              {isLoading && <Loader2 className="animate-spin" />} Kaydet
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Vazgeç
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil /> Düzenle
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <a href={`/notes-list?park=${tenant.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink /> Misafir sayfası
              </a>
            </Button>
            {!isOwn && (
              <Button
                size="sm"
                variant="ghost"
                className={cn("ml-auto", tenant.active ? "text-destructive hover:text-destructive" : "text-success")}
                disabled={isLoading}
                onClick={() => save({ active: !tenant.active })}
              >
                {tenant.active ? "Askıya Al" : "Aktif Et"}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const emptyForm = { name: "", slug: "", address: "", fullname: "", username: "", password: "" };

function NewTenantForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState(emptyForm);
  const addTenant = useAddTenant();
  const { isPending: isLoading, error, isError } = addTenant;

  const set = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTenant.mutate(
      {
        name: form.name,
        slug: form.slug,
        address: form.address,
        admin: { fullname: form.fullname, username: form.username, password: form.password },
      },
      {
        onSuccess: (res) => {
          toast.success(res.message);
          setForm(emptyForm);
          onClose();
        },
      },
    );
  };

  const input = (key: keyof typeof emptyForm, label: string, opts: { type?: string; mono?: boolean; required?: boolean; hint?: string } = {}) => (
    <Field label={label} htmlFor={`park-${key}`} hint={opts.hint}>
      <Input
        id={`park-${key}`}
        type={opts.type ?? "text"}
        className={opts.mono ? "font-mono" : undefined}
        autoComplete="off"
        value={form[key]}
        onChange={set(key)}
        required={opts.required ?? true}
      />
    </Field>
  );

  return (
    <form onSubmit={onSubmit} className="bg-card mb-6 overflow-hidden rounded-xl border shadow-xs">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h2 className="font-semibold">Yeni Otopark</h2>
          <p className="text-muted-foreground text-sm">Otopark ve ilk kurucu kullanıcısı birlikte oluşturulur.</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Kapat">
          <X />
        </Button>
      </div>
      <div className="grid gap-6 p-6 lg:grid-cols-2">
        <div className="space-y-4">
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Otopark</p>
          {input("name", "Otopark adı")}
          {input("slug", "Otopark kodu", { mono: true, hint: "Küçük harf, rakam ve tire. Kayıt ve misafir linkinde kullanılır." })}
          {input("address", "Adres", { required: false })}
        </div>
        <div className="space-y-4">
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Kurucu kullanıcı</p>
          {input("fullname", "Adı soyadı")}
          {input("username", "Kullanıcı adı")}
          {input("password", "Şifre", { type: "password" })}
        </div>
      </div>
      {isError && (
        <div className="px-6 pb-4">
          <ErrorAlert message={apiErrorMessage(error)} />
        </div>
      )}
      <div className="bg-muted/30 flex justify-end gap-2 border-t px-6 py-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin" /> : <Plus />} Otopark Oluştur
        </Button>
      </div>
    </form>
  );
}
