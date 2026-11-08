use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    error::AppError, extractors::AuthUser, models::Tenant, response::MessageBody, roles,
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
        sqlx::query_scalar("SELECT id FROM tenants WHERE lower(slug) = $1")
            .bind(&slug)
            .fetch_optional(&state.db)
            .await?;
    if slug_taken.is_some() {
        return Err(AppError::Conflict("Bu otopark kodu kullanılıyor".to_string()));
    }

    let username_taken: Option<Uuid> =
        sqlx::query_scalar("SELECT id FROM users WHERE lower(username) = lower($1)")
            .bind(admin.username.trim())
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

    let tenant_id: Uuid = sqlx::query_scalar(
        "INSERT INTO tenants (name, slug, address) VALUES ($1, $2, $3) RETURNING id",
    )
    .bind(payload.name.trim())
    .bind(&slug)
    .bind(payload.address.as_deref().map(str::trim).filter(|a| !a.is_empty()))
    .fetch_one(&mut *tx)
    .await?;

    sqlx::query(
        "INSERT INTO users (fullname, username, password, roles, tenant_id)
         VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(admin.fullname.trim())
    .bind(admin.username.trim())
    .bind(&hashed)
    .bind(vec![roles::ADMIN.to_string()])
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
    if !payload.active && payload.id == user.tenant_id {
        return Err(AppError::BadRequest(
            "Kendi otoparkınızı askıya alamazsınız".to_string(),
        ));
    }

    let slug_owner: Option<Uuid> =
        sqlx::query_scalar("SELECT id FROM tenants WHERE lower(slug) = $1")
            .bind(&slug)
            .fetch_optional(&state.db)
            .await?;
    if slug_owner.is_some_and(|id| id != payload.id) {
        return Err(AppError::Conflict("Bu otopark kodu kullanılıyor".to_string()));
    }

    let result = sqlx::query(
        "UPDATE tenants SET name = $1, slug = $2, address = $3, active = $4 WHERE id = $5",
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
