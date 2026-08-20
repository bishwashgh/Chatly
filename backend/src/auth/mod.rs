use axum::{
    extract::State,
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
    Argon2,
};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::db::models;
use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
        .route("/verify", get(verify_token))
        .route("/send-otp", post(send_otp))
        .route("/reset-password", post(reset_password))
        .route("/google", post(google_login))
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub email: String,
    pub password: String,
    pub display_name: String,
    pub phone: Option<String>,
    pub avatar_url: Option<String>,
    pub otp_code: Option<String>,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct SendOtpRequest {
    pub email: String,
    pub purpose: String, // "signup" | "password_reset"
}

#[derive(Deserialize)]
pub struct ResetPasswordRequest {
    pub email: String,
    pub code: String,
    pub new_password: String,
}

#[derive(Deserialize)]
pub struct GoogleLoginRequest {
    pub id_token: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserResponse,
}

#[derive(Serialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub phone: Option<String>,
    pub bio: String,
    pub is_online: bool,
    pub email_verified: bool,
    pub auth_provider: String,
}

impl From<models::User> for UserResponse {
    fn from(u: models::User) -> Self {
        Self {
            id: u.id,
            username: u.username,
            email: u.email,
            display_name: u.display_name,
            avatar_url: u.avatar_url,
            phone: u.phone,
            bio: u.bio.unwrap_or_default(),
            is_online: u.is_online,
            email_verified: u.email_verified,
            auth_provider: u.auth_provider.unwrap_or_else(|| "email".to_string()),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,
    pub exp: usize,
    pub iat: usize,
}

pub async fn register(
    State(state): State<AppState>,
    Json(req): Json<RegisterRequest>,
) -> Result<(StatusCode, Json<AuthResponse>), (StatusCode, String)> {
    let email = req.email.trim().to_lowercase();

    // Verify OTP if provided
    let mut email_verified = false;
    if let Some(code) = req.otp_code.as_deref() {
        verify_otp_code(&state.db, &email, code, "signup").await?;
        email_verified = true;
    }

    // Check if user already exists
    let existing = sqlx::query_as::<_, models::User>(
        "SELECT * FROM users WHERE email = $1 OR username = $2",
    )
    .bind(&email)
    .bind(&req.username)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if existing.is_some() {
        return Err((StatusCode::CONFLICT, "User already exists".to_string()));
    }

    // Hash password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(req.password.as_bytes(), &salt)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .to_string();

    // Create user
    let user = sqlx::query_as::<_, models::User>(
        "INSERT INTO users (username, email, phone, password_hash, display_name, avatar_url, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
    )
    .bind(&req.username)
    .bind(&email)
    .bind(req.phone)
    .bind(&password_hash)
    .bind(&req.display_name)
    .bind(&req.avatar_url)
    .bind(email_verified)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let token = create_token(user.id)?;

    Ok((StatusCode::CREATED, Json(AuthResponse {
        token,
        user: UserResponse::from(user),
    })))
}

pub async fn login(
    State(state): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {
    let email = req.email.trim().to_lowercase();
    let user = sqlx::query_as::<_, models::User>(
        "SELECT * FROM users WHERE email = $1",
    )
    .bind(&email)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::UNAUTHORIZED, "Invalid credentials".to_string()))?;

    // Verify password
    let parsed_hash = argon2::PasswordHash::new(&user.password_hash)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    argon2::PasswordVerifier::verify_password(
        &Argon2::default(),
        req.password.as_bytes(),
        &parsed_hash,
    )
    .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid credentials".to_string()))?;

    // Update online status
    sqlx::query("UPDATE users SET is_online = true, last_seen = NOW() WHERE id = $1")
        .bind(user.id)
        .execute(&state.db)
        .await
        .ok();

    let token = create_token(user.id)?;

    Ok(Json(AuthResponse {
        token,
        user: UserResponse::from(user),
    }))
}

pub async fn send_otp(
    State(state): State<AppState>,
    Json(req): Json<SendOtpRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let email = req.email.trim().to_lowercase();
    if !email.contains('@') || !email.contains('.') {
        return Err((StatusCode::BAD_REQUEST, "Invalid email address".to_string()));
    }

    let valid_purposes = ["signup", "password_reset"];
    if !valid_purposes.contains(&req.purpose.as_str()) {
        return Err((StatusCode::BAD_REQUEST, "Invalid purpose".to_string()));
    }

    // Check account state for the requested purpose
    let exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)",
    )
    .bind(&email)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    match req.purpose.as_str() {
        "signup" if exists => {
            return Err((StatusCode::CONFLICT, "An account with this email already exists".to_string()));
        }
        "password_reset" if !exists => {
            return Err((StatusCode::NOT_FOUND, "No account found with this email".to_string()));
        }
        _ => {}
    }

    let code = generate_otp();
    let expires_at = Utc::now() + Duration::minutes(10);

    sqlx::query("DELETE FROM otp_codes WHERE email = $1 AND purpose = $2")
        .bind(&email)
        .bind(&req.purpose)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    sqlx::query(
        "INSERT INTO otp_codes (email, code, purpose, expires_at) VALUES ($1, $2, $3, $4)",
    )
    .bind(&email)
    .bind(&code)
    .bind(&req.purpose)
    .bind(expires_at)
    .execute(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let purpose_label = if req.purpose == "signup" {
        "verify your email"
    } else {
        "reset your password"
    };
    let html = format!(
        "<div style='font-family:Arial,sans-serif;text-align:center;padding:32px;'>\
         <div style='font-size:28px;font-weight:bold;color:#0084ff;'>Chatly</div>\
         <p style='font-size:16px;color:#333;'>Your one-time code to {purpose_label} is:</p>\
         <div style='font-size:36px;font-weight:bold;letter-spacing:10px;color:#0084ff;margin:16px 0;'>{code}</div>\
         <p style='font-size:13px;color:#888;'>This code expires in 10 minutes.<br/>If you didn't request this, you can safely ignore this email.</p>\
         </div>"
    );

    match send_email(&email, "Your Chatly verification code", &html).await {
        Ok(()) => Ok(Json(serde_json::json!({
            "message": "Verification code sent to your email",
            "expires_in": 600,
        }))),
        Err(e) => {
            // If the email can't be sent (missing/invalid Resend key), fall back
            // to returning the code so the flow is never blocked in development.
            tracing::warn!("Email send failed ({}); echoing OTP for development", e);
            Ok(Json(serde_json::json!({
                "message": "Verification code (development mode)",
                "expires_in": 600,
                "dev_code": code,
            })))
        }
    }
}

pub async fn reset_password(
    State(state): State<AppState>,
    Json(req): Json<ResetPasswordRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let email = req.email.trim().to_lowercase();
    verify_otp_code(&state.db, &email, &req.code, "password_reset").await?;

    if req.new_password.len() < 6 {
        return Err((StatusCode::BAD_REQUEST, "Password must be at least 6 characters".to_string()));
    }

    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(req.new_password.as_bytes(), &salt)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .to_string();

    sqlx::query("UPDATE users SET password_hash = $1 WHERE email = $2")
        .bind(&password_hash)
        .bind(&email)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(serde_json::json!({ "message": "Password updated successfully. You can now sign in." })))
}

pub async fn google_login(
    State(state): State<AppState>,
    Json(req): Json<GoogleLoginRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {
    let client = reqwest::Client::new();
    let resp = client
        .get("https://oauth2.googleapis.com/tokeninfo")
        .query(&[("id_token", &req.id_token)])
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("Failed to reach Google: {}", e)))?;

    let info: serde_json::Value = resp
        .json()
        .await
        .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid Google token".to_string()))?;

    let email = info
        .get("email")
        .and_then(|e| e.as_str())
        .ok_or((StatusCode::UNAUTHORIZED, "Google account has no email".to_string()))?
        .to_lowercase();
    let sub = info
        .get("sub")
        .and_then(|s| s.as_str())
        .ok_or((StatusCode::UNAUTHORIZED, "Invalid Google token".to_string()))?;
    let name = info.get("name").and_then(|n| n.as_str()).unwrap_or("User").to_string();
    let picture = info.get("picture").and_then(|p| p.as_str()).map(|s| s.to_string());

    // Existing user linked to this Google account
    let user = sqlx::query_as::<_, models::User>("SELECT * FROM users WHERE google_id = $1")
        .bind(sub)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let user = if let Some(u) = user {
        u
    } else {
        // Existing account with same email - link the Google id
        let existing = sqlx::query_as::<_, models::User>("SELECT * FROM users WHERE email = $1")
            .bind(&email)
            .fetch_optional(&state.db)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        if let Some(mut u) = existing {
            sqlx::query("UPDATE users SET google_id = $1, email_verified = TRUE WHERE id = $2")
                .bind(sub)
                .bind(u.id)
                .execute(&state.db)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            u.google_id = Some(sub.to_string());
            u.email_verified = true;
            u
        } else {
            // Create a brand new account
            let base = email.split('@').next().unwrap_or("user").to_string();
            let username = unique_username(&state.db, &base).await?;
            let salt = SaltString::generate(&mut OsRng);
            let argon2 = Argon2::default();
            let password_hash = argon2
                .hash_password(Uuid::new_v4().to_string().as_bytes(), &salt)
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
                .to_string();

            sqlx::query_as::<_, models::User>(
                "INSERT INTO users (username, email, password_hash, display_name, avatar_url, email_verified, google_id, auth_provider)
                 VALUES ($1, $2, $3, $4, $5, TRUE, $6, 'google') RETURNING *",
            )
            .bind(&username)
            .bind(&email)
            .bind(&password_hash)
            .bind(&name)
            .bind(picture)
            .bind(sub)
            .fetch_one(&state.db)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        }
    };

    sqlx::query("UPDATE users SET is_online = true, last_seen = NOW() WHERE id = $1")
        .bind(user.id)
        .execute(&state.db)
        .await
        .ok();

    let token = create_token(user.id)?;

    Ok(Json(AuthResponse {
        token,
        user: UserResponse::from(user),
    }))
}

async fn unique_username(pool: &sqlx::PgPool, base: &str) -> Result<String, (StatusCode, String)> {
    let candidate = base.chars().take(20).collect::<String>();
    for i in 0..100 {
        let name = if i == 0 {
            candidate.clone()
        } else {
            format!("{}{}", candidate, i)
        };
        let exists = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)",
        )
        .bind(&name)
        .fetch_one(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if !exists {
            return Ok(name);
        }
    }
    Err((StatusCode::INTERNAL_SERVER_ERROR, "Could not generate a unique username".to_string()))
}

async fn verify_otp_code(
    pool: &sqlx::PgPool,
    email: &str,
    code: &str,
    purpose: &str,
) -> Result<(), (StatusCode, String)> {
    let otp = sqlx::query_as::<_, models::OtpCode>(
        "SELECT * FROM otp_codes WHERE email = $1 AND purpose = $2 AND used = FALSE
         ORDER BY created_at DESC LIMIT 1",
    )
    .bind(email)
    .bind(purpose)
    .fetch_optional(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::BAD_REQUEST, "No verification code found. Request a new one.".to_string()))?;

    if otp.expires_at < Utc::now() {
        return Err((StatusCode::BAD_REQUEST, "Code has expired. Request a new one.".to_string()));
    }
    if otp.code != code {
        return Err((StatusCode::BAD_REQUEST, "Invalid code".to_string()));
    }

    sqlx::query("UPDATE otp_codes SET used = TRUE WHERE id = $1")
        .bind(otp.id)
        .execute(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(())
}

fn generate_otp() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    format!("{:06}", rng.gen_range(0..1_000_000))
}

async fn send_email(to: &str, subject: &str, html: &str) -> Result<(), String> {
    let api_key = std::env::var("RESEND_API_KEY")
        .map_err(|_| "Resend API key not configured".to_string())?;
    let from = std::env::var("RESEND_FROM_EMAIL")
        .unwrap_or_else(|_| "Chatly <onboarding@resend.dev>".to_string());

    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "from": from,
        "to": [to],
        "subject": subject,
        "html": html,
    });

    let resp = client
        .post("https://api.resend.com/emails")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to send email: {}", e))?;

    if !resp.status().is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("Resend error: {}", text));
    }

    Ok(())
}

pub async fn verify_token(
    State(state): State<AppState>,
    claims: Claims,
) -> Result<Json<UserResponse>, (StatusCode, String)> {
    let user = sqlx::query_as::<_, models::User>("SELECT * FROM users WHERE id = $1")
        .bind(claims.sub)
        .fetch_one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(UserResponse::from(user)))
}

pub fn create_token(user_id: Uuid) -> Result<String, (StatusCode, String)> {
    let now = Utc::now();
    let claims = Claims {
        sub: user_id,
        iat: now.timestamp() as usize,
        exp: (now + Duration::days(30)).timestamp() as usize,
    };

    let secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "fallback-secret".to_string());

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}

pub fn verify_jwt(token: &str) -> Result<Claims, ()> {
    let secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "fallback-secret".to_string());

    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .map_err(|_| ())
}

#[axum::async_trait]
impl axum::extract::FromRequestParts<AppState> for Claims {
    type Rejection = (StatusCode, String);

    async fn from_request_parts(
        parts: &mut axum::http::request::Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let header = parts
            .headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok());

        let token = header
            .and_then(|h| h.strip_prefix("Bearer "))
            .ok_or((StatusCode::UNAUTHORIZED, "Missing auth token".to_string()))?;

        verify_jwt(token)
            .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid token".to_string()))
    }
}