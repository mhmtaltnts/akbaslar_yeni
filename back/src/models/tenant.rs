use serde::Serialize;
use uuid::Uuid;

// Bir otopark işletmesi (tenant). Bkz. migration 0003.
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Tenant {
    #[serde(rename = "_id")]
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub address: Option<String>,
    pub active: bool,
}
