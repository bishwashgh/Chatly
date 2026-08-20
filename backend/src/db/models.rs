use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, FromRow, Clone)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub phone: Option<String>,
    pub password_hash: String,
    pub display_name: String,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub is_online: bool,
    pub last_seen: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub email_verified: bool,
    pub google_id: Option<String>,
    pub auth_provider: Option<String>,
}

#[derive(Debug, FromRow, Clone)]
pub struct OtpCode {
    pub id: Uuid,
    pub email: String,
    pub code: String,
    pub purpose: String,
    pub expires_at: DateTime<Utc>,
    pub used: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Clone)]
pub struct Conversation {
    pub id: Uuid,
    pub name: Option<String>,
    pub is_group: Option<bool>,
    pub avatar_url: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Clone)]
pub struct Message {
    pub id: Uuid,
    pub conversation_id: Uuid,
    pub sender_id: Uuid,
    pub content: Option<String>,
    pub message_type: Option<String>,
    pub media_url: Option<String>,
    pub media_duration: Option<i32>,
    pub file_name: Option<String>,
    pub file_size: Option<i64>,
    pub reply_to: Option<Uuid>,
    pub status: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Clone)]
pub struct Call {
    pub id: Uuid,
    pub conversation_id: Uuid,
    pub caller_id: Uuid,
    pub callee_id: Uuid,
    pub call_type: Option<String>,
    pub status: Option<String>,
    pub started_at: Option<DateTime<Utc>>,
    pub ended_at: Option<DateTime<Utc>>,
    pub duration: Option<i32>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Clone)]
pub struct Story {
    pub id: Uuid,
    pub user_id: Uuid,
    pub media_url: String,
    pub media_type: Option<String>,
    pub file_name: Option<String>,
    pub caption: Option<String>,
    pub created_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
}
