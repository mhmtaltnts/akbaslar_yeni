mod auth;
mod cikis;
mod gumruk;
mod notes;
mod rapor;
mod users;

pub use auth::auth_routes;
pub use cikis::cikis_routes;
pub use gumruk::gumruk_routes;
pub use notes::note_routes;
pub use rapor::rapor_routes;
pub use users::user_routes;
