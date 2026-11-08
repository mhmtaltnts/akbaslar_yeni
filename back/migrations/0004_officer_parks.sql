-- Gümrük memurlarının (rol: "Memur") erişebildiği EK otoparklar.
--
-- Memur kendi otoparkına (users.tenant_id) her zaman erişir; buradaki
-- satırlar SüperAdmin'in ayrıca izin verdiği diğer otoparklardır. Memur bu
-- parklarda sadece araçları görür ve gümrük bilgisi girer: araç giriş/çıkışı,
-- rapor ve kullanıcı yönetimi kapalıdır (bkz. AuthUser::require_not_officer).
CREATE TABLE officer_parks (
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, tenant_id)
);
