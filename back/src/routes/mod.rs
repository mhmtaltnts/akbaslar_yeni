mod auth;
mod cikis;
mod gumruk;
mod notes;
mod public;
mod rapor;
mod tenants;
mod users;

pub use auth::auth_routes;
pub use cikis::cikis_routes;
pub use gumruk::gumruk_routes;
pub use notes::note_routes;
pub use public::public_routes;
pub use rapor::rapor_routes;
pub use tenants::tenant_routes;
pub use users::user_routes;
