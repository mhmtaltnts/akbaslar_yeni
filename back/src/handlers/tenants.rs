use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use std::collections::HashMap;

use sqlx::types::Json as SqlJson;

use crate::{
    error::AppError,
    extractors::AuthUser,
    models::{username_key, Tenant},
    response::MessageBody,
    roles,
    state::SharedState,
};

// Otopark kodu URL'de kullanıldığı için sadece küçük harf, rakam ve tire.
fn normalize_slug(slug: &str) -> Result<String, AppError> {
    let slug = slug.trim().to_lowercase();
    let valid = !slug.is_empty()
        && slug.len() <= 50
        && slug.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-');
    if valid {
        Ok(slug)
    } else {
        Err(AppError::BadRequest(
            "Otopark kodu sadece küçük harf (a-z), rakam ve tire içerebilir".to_string(),
        ))
    }
}

// @route GET /tenants  (SüperAdmin)
pub async fn get_all_tenants(
    user: AuthUser,
    State(state): State<SharedState>,
) -> Result<Json<Vec<Tenant>>, AppError> {
    user.require_super_admin()?;

    let tenants: Vec<Tenant> = sqlx::query_as(
        "SELECT id, name, slug, address, active FROM tenants ORDER BY created_at",
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(tenants))
}

#[derive(Deserialize)]
pub struct AdminPayload {
    pub fullname: String,
    pub username: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct CreateTenantPayload {
    pub name: String,
    pub slug: String,
    pub address: Option<String>,
    // Yeni otoparkın ilk kullanıcısı ("Kurucu" rolüyle). Bu olmadan yeni
    // otoparka kimse giriş yapıp personel ekleyemezdi.
    pub admin: AdminPayload,
}

// @route POST /tenants  (SüperAdmin)
// Otoparkı ve kurucusunu TEK bir transaction içinde oluşturur: kullanıcı
// eklenemezse (örn. kullanıcı adı alınmışsa) kurucusuz bir otopark kalmaz.
pub async fn create_tenant(
    user: AuthUser,
    State(state): State<SharedState>,
    Json(payload): Json<CreateTenantPayload>,
) -> Result<impl IntoResponse, AppError> {
    user.require_super_admin()?;

    let slug = normalize_slug(&payload.slug)?;
    let admin = &payload.admin;
    if payload.name.trim().is_empty()
        || admin.fullname.trim().is_empty()
        || admin.username.trim().is_empty()
        || admin.password.is_empty()
    {
        return Err(AppError::BadRequest("Tüm alanları doldurun".to_string()));
    }

    let slug_taken: Option<Uuid> =
        sqlx::query_scalar("SELECT id FROM tenants WHERE lower(slug) = ?1")
            .bind(&slug)
            .fetch_optional(&state.db)
            .await?;
    if slug_taken.is_some() {
        return Err(AppError::Conflict("Bu otopark kodu kullanılıyor".to_string()));
    }

    let username_taken: Option<Uuid> =
        sqlx::query_scalar("SELECT id FROM users WHERE username_key = ?1")
            .bind(username_key(admin.username.trim()))
            .fetch_optional(&state.db)
            .await?;
    if username_taken.is_some() {
        return Err(AppError::Conflict("Kurucu kullanıcı adı kullanılıyor".to_string()));
    }

    let hashed = bcrypt::hash(&admin.password, bcrypt::DEFAULT_COST)
        .map_err(|err| AppError::Internal(format!("şifre hashlenemedi: {err}")))?;

    // `tx` drop edildiğinde commit edilmemişse otomatik ROLLBACK olur --
    // aradaki herhangi bir `?` erken dönüşü transaction'ı güvenle geri alır.
    let mut tx = state.db.begin().await?;

    let tenant_id = Uuid::new_v4();
    sqlx::query("INSERT INTO tenants (id, name, slug, address) VALUES (?1, ?2, ?3, ?4)")
    .bind(tenant_id)
    .bind(payload.name.trim())
    .bind(&slug)
    .bind(payload.address.as_deref().map(str::trim).filter(|a| !a.is_empty()))
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        "INSERT INTO users (id, fullname, username, username_key, password, roles, tenant_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    )
    .bind(Uuid::new_v4())
    .bind(admin.fullname.trim())
    .bind(admin.username.trim())
    .bind(username_key(admin.username.trim()))
    .bind(&hashed)
    .bind(SqlJson(vec![roles::ADMIN]))
    .bind(tenant_id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok((
        StatusCode::CREATED,
        Json(MessageBody::new(format!("{} otoparkı oluşturuldu", payload.name.trim()))),
    ))
}

#[derive(Deserialize)]
pub struct UpdateTenantPayload {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub address: Option<String>,
    pub active: bool,
}

// @route PATCH /tenants  (SüperAdmin)
// `active = false` otoparkı askıya alır: kullanıcıları giriş yapamaz,
// refresh token'ları yeni access token alamaz, herkese açık listede görünmez.
pub async fn update_tenant(
    user: AuthUser,
    State(state): State<SharedState>,
    Json(payload): Json<UpdateTenantPayload>,
) -> Result<Json<MessageBody>, AppError> {
    user.require_super_admin()?;

    let slug = normalize_slug(&payload.slug)?;
    if payload.name.trim().is_empty() {
        return Err(AppError::BadRequest("Otopark adı boş olamaz".to_string()));
    }

    // SüperAdmin'in kendi otoparkını askıya alması kendini sistemden kilitler.
    if !payload.active && payload.id == user.home_tenant_id {
        return Err(AppError::BadRequest(
            "Kendi otoparkınızı askıya alamazsınız".to_string(),
        ));
    }

    let slug_owner: Option<Uuid> =
        sqlx::query_scalar("SELECT id FROM tenants WHERE lower(slug) = ?1")
            .bind(&slug)
            .fetch_optional(&state.db)
            .await?;
    if slug_owner.is_some_and(|id| id != payload.id) {
        return Err(AppError::Conflict("Bu otopark kodu kullanılıyor".to_string()));
    }

    let result = sqlx::query(
        "UPDATE tenants SET name = ?1, slug = ?2, address = ?3, active = ?4 WHERE id = ?5",
    )
    .bind(payload.name.trim())
    .bind(&slug)
    .bind(payload.address.as_deref().map(str::trim).filter(|a| !a.is_empty()))
    .bind(payload.active)
    .bind(payload.id)
    .execute(&state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::BadRequest("Otopark bulunamadı".to_string()));
    }

    Ok(Json(MessageBody::new(format!("{} güncellendi", payload.name.trim()))))
}

#[derive(sqlx::FromRow)]
struct OfficerRow {
    id: Uuid,
    fullname: String,
    username: String,
    #[sqlx(json)]
    roles: Vec<String>,
    tenant_id: Uuid,
    tenant_name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Officer {
    #[serde(rename = "_id")]
    id: Uuid,
    fullname: String,
    username: String,
    // Memurun kayıtlı olduğu otopark: buna her zaman erişir.
    home_park_id: Uuid,
    home_park_name: String,
    // SüperAdmin'in ayrıca izin verdiği otoparklar.
    park_ids: Vec<Uuid>,
}

// @route GET /tenants/officers  (SüperAdmin)
// Tüm otoparklardaki gümrük memurları ve izinli oldukları otoparklar.
pub async fn get_officers(
    user: AuthUser,
    State(state): State<SharedState>,
) -> Result<Json<Vec<Officer>>, AppError> {
    user.require_super_admin()?;

    // `roles` JSON dizisi: SQLite'ta `= ANY(dizi)` yerine `json_each` ile
    // dizinin elemanlarını satır gibi tarıyoruz.
    let rows: Vec<OfficerRow> = sqlx::query_as(
        "SELECT u.id, u.fullname, u.username, u.roles, u.tenant_id, t.name AS tenant_name
         FROM users u
         JOIN tenants t ON t.id = u.tenant_id
         WHERE EXISTS (SELECT 1 FROM json_each(u.roles) WHERE value = ?1)
         ORDER BY u.username",
    )
    .bind(roles::OFFICER)
    .fetch_all(&state.db)
    .await?;

    // Postgres'teki `array_agg` yerine izinleri ayrı çekip Rust'ta grupluyoruz.
    let grants: Vec<(Uuid, Uuid)> =
        sqlx::query_as("SELECT user_id, tenant_id FROM officer_parks")
            .fetch_all(&state.db)
            .await?;
    let mut park_ids: HashMap<Uuid, Vec<Uuid>> = HashMap::new();
    for (user_id, tenant_id) in grants {
        park_ids.entry(user_id).or_default().push(tenant_id);
    }

    // Memur rolüyle birlikte Kurucu/Yönetici olanlar zaten kısıtsız; onları
    // listelemiyoruz (bkz. `roles::is_officer`).
    let officers = rows
        .into_iter()
        .filter(|r| roles::is_officer(&r.roles))
        .map(|r| Officer {
            id: r.id,
            fullname: r.fullname,
            username: r.username,
            home_park_id: r.tenant_id,
            home_park_name: r.tenant_name,
            park_ids: park_ids.remove(&r.id).unwrap_or_default(),
        })
        .collect();

    Ok(Json(officers))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OfficerParksPayload {
    pub user_id: Uuid,
    pub park_ids: Vec<Uuid>,
}

// @route PUT /tenants/officers  (SüperAdmin)
// Memurun ek otopark izinlerini verilen listeyle DEĞİŞTİRİR.
pub async fn set_officer_parks(
    user: AuthUser,
    State(state): State<SharedState>,
    Json(payload): Json<OfficerParksPayload>,
) -> Result<Json<MessageBody>, AppError> {
    user.require_super_admin()?;

    let target: Option<(String, SqlJson<Vec<String>>, Uuid)> =
        sqlx::query_as("SELECT username, roles, tenant_id FROM users WHERE id = ?1")
            .bind(payload.user_id)
            .fetch_optional(&state.db)
            .await?;
    let (username, SqlJson(target_roles), home_park) =
        target.ok_or_else(|| AppError::BadRequest("Kullanıcı bulunamadı".to_string()))?;
    if !roles::is_officer(&target_roles) {
        return Err(AppError::BadRequest("Kullanıcı gümrük memuru değil".to_string()));
    }

    let mut tx = state.db.begin().await?;
    sqlx::query("DELETE FROM officer_parks WHERE user_id = ?1")
        .bind(payload.user_id)
        .execute(&mut *tx)
        .await?;
    // `FROM tenants` üzerinden ekleyerek var olmayan otopark id'lerini
    // sessizce eliyoruz; memurun kendi otoparkı zaten her zaman açık.
    // (SQLite'ta dizi parametresi yok: her otopark için ayrı INSERT; hepsi
    // aynı transaction içinde.)
    for park_id in &payload.park_ids {
        sqlx::query(
            "INSERT OR IGNORE INTO officer_parks (user_id, tenant_id)
             SELECT ?1, id FROM tenants WHERE id = ?2 AND id <> ?3",
        )
        .bind(payload.user_id)
        .bind(park_id)
        .bind(home_park)
        .execute(&mut *tx)
        .await?;
    }
    tx.commit().await?;

    Ok(Json(MessageBody::new(format!("{username} için otopark izinleri güncellendi"))))
}

#[cfg(test)]
mod tests {
    use super::normalize_slug;

    #[test]
    fn slug_kucuk_harfe_cevrilir() {
        assert_eq!(normalize_slug("  Gebze-2 ").unwrap(), "gebze-2");
    }

    #[test]
    fn gecersiz_slug_reddedilir() {
        assert!(normalize_slug("").is_err());
        assert!(normalize_slug("gebze park").is_err());
        assert!(normalize_slug("muallimköy").is_err());
    }
}
