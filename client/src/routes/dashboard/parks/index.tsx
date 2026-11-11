import { officersQuery, staffQuery, tenantsQuery, useSetOfficerParks, useUpdateTenant } from "@/api/tenants";
import type { Officer, Tenant } from "@/api/types";
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
import { BadgeCheck, Building2, Check, ExternalLink, Globe, Loader2, MapPin, Pencil, ShieldX, Users } from "lucide-react";
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
        description="Platformdaki otopark işletmeleri"
      />

      {isLoading && <PageLoader />}
      {isError && <ErrorAlert message={apiErrorMessage(error)} />}

      {tenants && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tenants.map((t) => (
            <TenantCard key={t.id} tenant={t} isOwn={t.id === tenantId} />
          ))}
        </div>
      )}

      {tenants && <StaffSection tenants={tenants} />}
      {tenants && <OfficersSection tenants={tenants} />}
    </>
  );
}

// Birden çok otoparkta çalışan personel: SüperAdmin izin verdiği otoparkın
// alan adından giren personel o otoparkta (kendi rolüyle) çalışır; izin
// verilmeyen otoparkın adresinden girse bile kendi otoparkında kalır.
function StaffSection({ tenants }: { tenants: Tenant[] }) {
  const { data: staff, isLoading, isError, error } = useQuery(staffQuery);

  return (
    <section className="mt-10">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Birden Çok Otoparkta Çalışan Personel</h2>
        <p className="text-muted-foreground text-sm">
          Personel, izin verdiğiniz otoparkın alan adından (örn. akbaslartirparki.com) giriş
          yaptığında o otoparkta kendi rolüyle çalışır. İzni olmayan bir otoparkın adresinden
          girse bile kendi otoparkında çalışmaya devam eder.
        </p>
      </div>
      {isLoading && <PageLoader />}
      {isError && <ErrorAlert message={apiErrorMessage(error)} />}
      {staff?.length === 0 && <EmptyState icon={Users} title="Personel yok" />}
      {staff && staff.length > 0 && (
        <div className="space-y-4">
          {staff.map((o) => (
            <OfficerCard key={o.id} officer={o} tenants={tenants} />
          ))}
        </div>
      )}
    </section>
  );
}

// Gümrük memurlarının erişebileceği otoparklar. Memur kendi otoparkına her
// zaman erişir; burada SüperAdmin ek otoparkları açar. Memur bu parklarda
// sadece araçları görür ve gümrük bilgisi girer.
function OfficersSection({ tenants }: { tenants: Tenant[] }) {
  const { data: officers, isLoading, isError, error } = useQuery(officersQuery);

  return (
    <section className="mt-10">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Gümrük Memurları</h2>
        <p className="text-muted-foreground text-sm">
          Memurlar seçili otoparklardaki araçları görür ve sadece gümrük bilgisi girer. Araç
          giriş/çıkışı, rapor ve kullanıcı yönetimine erişemezler.
        </p>
      </div>
      {isLoading && <PageLoader />}
      {isError && <ErrorAlert message={apiErrorMessage(error)} />}
      {officers?.length === 0 && (
        <EmptyState
          icon={BadgeCheck}
          title="Henüz gümrük memuru yok"
          description="Bir otoparkın Kullanıcılar sayfasından “Memur” rolüyle kullanıcı ekleyin."
        />
      )}
      {officers && officers.length > 0 && (
        <div className="space-y-4">
          {officers.map((o) => (
            <OfficerCard key={o.id} officer={o} tenants={tenants} />
          ))}
        </div>
      )}
    </section>
  );
}

function OfficerCard({ officer, tenants }: { officer: Officer; tenants: Tenant[] }) {
  const [selected, setSelected] = useState<string[]>(officer.parkIds);
  const setParks = useSetOfficerParks();
  const dirty =
    selected.length !== officer.parkIds.length || selected.some((id) => !officer.parkIds.includes(id));

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const save = () =>
    setParks.mutate(
      { userId: officer.id, parkIds: selected },
      {
        onSuccess: (res) => toast.success(res.message),
        onError: (err) => toast.error(apiErrorMessage(err)),
      },
    );

  return (
    <div className="bg-card rounded-xl border shadow-xs">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-5 py-3">
        <p className="font-medium">{officer.fullname}</p>
        <p className="text-muted-foreground font-mono text-xs">{officer.username}</p>
        <p className="text-muted-foreground ml-auto text-xs">
          {selected.length + 1} otoparka erişim
        </p>
      </div>
      <div className="flex flex-wrap gap-2 p-4">
        {tenants.map((t) => {
          const isHome = t.id === officer.homeParkId;
          const on = isHome || selected.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              disabled={isHome}
              title={isHome ? "Kayıtlı olduğu otopark: her zaman erişebilir" : undefined}
              onClick={() => toggle(t.id)}
              className={cn(
                "flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-left text-sm transition-colors",
                on ? "border-primary bg-primary/5 text-foreground" : "text-muted-foreground hover:bg-muted/50",
                isHome && "cursor-default opacity-80",
              )}
            >
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-full border",
                  on ? "border-primary bg-primary text-primary-foreground" : "border-input",
                )}
              >
                {on && <Check className="size-3" strokeWidth={3} />}
              </span>
              <span className="min-w-0 truncate">{t.name}</span>
              {isHome && <span className="text-muted-foreground shrink-0 text-xs whitespace-nowrap">(kendi otoparkı)</span>}
            </button>
          );
        })}
      </div>
      {dirty && (
        <div className="bg-muted/30 flex justify-end gap-2 border-t px-4 py-3">
          <Button size="sm" variant="ghost" onClick={() => setSelected(officer.parkIds)}>
            Vazgeç
          </Button>
          <Button size="sm" onClick={save} disabled={setParks.isPending}>
            {setParks.isPending && <Loader2 className="animate-spin" />} Kaydet
          </Button>
        </div>
      )}
    </div>
  );
}

function TenantCard({ tenant, isOwn }: { tenant: Tenant; isOwn: boolean }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tenant.name);
  const [slug, setSlug] = useState(tenant.slug);
  const [address, setAddress] = useState(tenant.address ?? "");
  const [domain, setDomain] = useState(tenant.domain ?? "");
  const updateTenant = useUpdateTenant();
  const isLoading = updateTenant.isPending;

  const save = () =>
    updateTenant.mutate(
      { id: tenant.id, name, slug, address, domain },
      {
        onSuccess: (res) => {
          toast.success(res.message);
          setEditing(false);
        },
        onError: (err) => toast.error(apiErrorMessage(err)),
      },
    );

  return (
    <div className="bg-card flex min-w-0 flex-col rounded-xl border shadow-xs">
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
              <Field label="Alan adı" htmlFor={`d-${tenant.id}`} hint="Örn. otoparkim.com (www olmadan). Boş bırakılabilir.">
                <Input
                  id={`d-${tenant.id}`}
                  className="font-mono"
                  placeholder="otoparkim.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                />
              </Field>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="min-w-0 font-semibold break-words">{tenant.name}</h3>
                {isOwn && <Badge variant="outline">Sizin</Badge>}
              </div>
              <p className="text-muted-foreground font-mono text-xs">{tenant.slug}</p>
              {tenant.domain && (
                <a
                  href={`https://${tenant.domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary mt-2 flex min-w-0 items-center gap-1.5 text-sm hover:underline"
                >
                  <Globe className="size-3.5 shrink-0" /> <span className="truncate">{tenant.domain}</span>
                </a>
              )}
              {tenant.address && (
                <p className="text-muted-foreground mt-2 flex items-start gap-1.5 text-sm">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" /> {tenant.address}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* flex-wrap: dar telefonda düğmeler tek satıra sığmayıp kartı taşırıyordu. */}
      <div className="bg-muted/30 mt-auto flex flex-wrap items-center gap-2 border-t px-4 py-3">
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
              <a
                href={tenant.domain ? `https://${tenant.domain}/notes-list` : `/notes-list?park=${tenant.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink /> Misafir sayfası
              </a>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
