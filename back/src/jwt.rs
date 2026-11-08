use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{error::AppError, models::User};

// controllers/authController.js'teki `UserInfo: { id, fullname, roles }`
// payload'ının karşılığı. `#[serde(rename = "UserInfo")]` ÖNEMLİ: frontend
// bu token'ı çözüp `UserInfo` anahtarını okuyor olabilir, bu yüzden alan
// adını Rust'ın normal camelCase/snake_case kurallarına değil, Node'un
// bıraktığı TAM isme sabitliyoruz.
//
// Bu dosya Ders 7'de `handlers/auth.rs` içine yazılmıştı; Ders 8'de JWT'yi
// hem İMZALAYAN (login/refresh) hem ÇÖZEN (yeni extractor) tarafın aynı
// struct'ları paylaşması gerektiği için buraya, ortak bir yere taşıdık.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub id: Uuid,
    pub fullname: String,
    pub roles: Vec<String>,
}

#[derive(Serialize, Deserialize)]
pub struct AccessClaims {
    #[serde(rename = "UserInfo")]
    pub user_info: UserInfo,
    pub exp: usize,
}

// Refresh token payload'ı: `{ username, fullname }`.
#[derive(Serialize, Deserialize)]
pub struct RefreshClaims {
    pub username: String,
    pub fullname: String,
    pub exp: usize,
}

// Node'daki `jwt.sign(payload, secret, { expiresIn: '15m' })` tek satırda
// hem imzalıyor hem `exp` ekliyordu. jsonwebtoken crate'inde bu kısayol yok
// -- `exp`'i KENDİMİZ hesaplayıp claims'e koymamız gerekiyor. Daha fazla
// satır ama ne olduğu daha açık: "exp" sihirli bir string değil, gerçek bir
// Unix timestamp.
pub fn sign_access_token(secret: &str, user: &User) -> Result<String, AppError> {
    let exp = (chrono::Utc::now() + chrono::Duration::minutes(15)).timestamp() as usize;
    let claims = AccessClaims {
        user_info: UserInfo {
            id: user.id,
            fullname: user.fullname.clone(),
            roles: user.roles.clone(),
        },
        exp,
    };

    encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_bytes()))
        .map_err(|err| AppError::Internal(format!("access token imzalanamadı: {err}")))
}

pub fn sign_refresh_token(secret: &str, user: &User) -> Result<String, AppError> {
    let exp = (chrono::Utc::now() + chrono::Duration::days(7)).timestamp() as usize;
    let claims = RefreshClaims {
        username: user.username.clone(),
        fullname: user.fullname.clone(),
        exp,
    };

    encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_bytes()))
        .map_err(|err| AppError::Internal(format!("refresh token imzalanamadı: {err}")))
}

// verifyJWT.js'teki `jwt.verify(token, ACCESS_TOKEN_SECRET, cb)` karşılığı.
// Hata türünü KASITLI OLARAK AppError'a çevirmiyoruz (ham
// `jsonwebtoken::errors::Error` döndürüyoruz) -- çağıran taraf bağlama göre
// farklı mesaj/statü seçebilsin istiyoruz (extractor'da 403 "Erişim Engeli
// Var", refresh'te 403 "İmza sırasında bir hata oluştu" gibi).
pub fn decode_access_token(
    token: &str,
    secret: &str,
) -> Result<AccessClaims, jsonwebtoken::errors::Error> {
    decode::<AccessClaims>(token, &DecodingKey::from_secret(secret.as_bytes()), &Validation::default())
        .map(|data| data.claims)
}

pub fn decode_refresh_token(
    token: &str,
    secret: &str,
) -> Result<RefreshClaims, jsonwebtoken::errors::Error> {
    decode::<RefreshClaims>(token, &DecodingKey::from_secret(secret.as_bytes()), &Validation::default())
        .map(|data| data.claims)
}

// Ders 14: imzala -> çöz "round-trip" testleri. DB/ağ gerekmiyor, saf
// fonksiyonlar -- `cargo test` bunları milisaniyeler içinde çalıştırır.
#[cfg(test)]
mod tests {
    use super::*;

    fn test_user() -> User {
        User {
            id: Uuid::new_v4(),
            fullname: "Test Kullanıcı".to_string(),
            username: "test_user".to_string(),
            password: "hashlenmis-sifre".to_string(),
            roles: vec!["Çalışan".to_string()],
            active: true,
        }
    }

    #[test]
    fn access_token_imzala_coz_round_trip() {
        let user = test_user();
        let token = sign_access_token("gizli-anahtar", &user).expect("imzalanamadı");

        let claims = decode_access_token(&token, "gizli-anahtar").expect("çözülemedi");

        assert_eq!(claims.user_info.id, user.id);
        assert_eq!(claims.user_info.fullname, user.fullname);
        assert_eq!(claims.user_info.roles, user.roles);
    }

    #[test]
    fn refresh_token_imzala_coz_round_trip() {
        let user = test_user();
        let token = sign_refresh_token("gizli-anahtar", &user).expect("imzalanamadı");

        let claims = decode_refresh_token(&token, "gizli-anahtar").expect("çözülemedi");

        assert_eq!(claims.username, user.username);
        assert_eq!(claims.fullname, user.fullname);
    }

    #[test]
    fn yanlis_secret_ile_cozme_basarisiz_olur() {
        let user = test_user();
        let token = sign_access_token("dogru-anahtar", &user).expect("imzalanamadı");

        // Node'daki `jwt.verify(token, YANLIS_SECRET)` gibi: imza
        // uyuşmadığında `Err` dönmeli, panik değil.
        let result = decode_access_token(&token, "yanlis-anahtar");
        assert!(result.is_err());
    }
}
