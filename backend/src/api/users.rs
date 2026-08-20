use axum::{
    extract::{Path, Query, State},
    http::{header, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::Claims;
use crate::db::models;
use crate::AppState;

#[derive(Deserialize)]
pub struct SearchQuery {
    q: String,
}

#[derive(Serialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub username: String,
    pub display_name: String,
    pub bio: String,
    pub avatar_url: Option<String>,
    pub is_online: bool,
    pub phone: Option<String>,
}

impl From<models::User> for UserResponse {
    fn from(u: models::User) -> Self {
        Self {
            id: u.id,
            username: u.username,
            display_name: u.display_name,
            bio: u.bio.unwrap_or_default(),
            avatar_url: u.avatar_url,
            is_online: u.is_online,
            phone: u.phone,
        }
    }
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/search", get(search_users))
        .route("/me", get(get_me))
        .route("/me/stats", get(get_my_stats))
        .route("/:id", get(get_user_by_id))
        .route("/me/profile", post(update_profile))
}

pub async fn search_users(
    State(state): State<AppState>,
    claims: Claims,
    Query(q): Query<SearchQuery>,
) -> Result<Json<Vec<UserResponse>>, (StatusCode, String)> {
    let pattern = format!("%{}%", q.q);
    let users = sqlx::query_as::<_, models::User>(
        "SELECT * FROM users WHERE (username ILIKE $1 OR display_name ILIKE $1) AND id != $2 LIMIT 20",
    )
    .bind(&pattern)
    .bind(claims.sub)
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let resp: Vec<UserResponse> = users.into_iter().map(|u| u.into()).collect();
    Ok(Json(resp))
}

pub async fn get_me(
    State(state): State<AppState>,
    claims: Claims,
) -> Result<Json<UserResponse>, (StatusCode, String)> {
    let user = sqlx::query_as::<_, models::User>("SELECT * FROM users WHERE id = $1")
        .bind(claims.sub)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "User not found".to_string()))?;

    Ok(Json(UserResponse::from(user)))
}

pub async fn get_user_by_id(
    State(state): State<AppState>,
    claims: Claims,
    Path(id): Path<Uuid>,
) -> Result<Json<UserResponse>, (StatusCode, String)> {
    let _ = claims;
    let user = sqlx::query_as::<_, models::User>("SELECT * FROM users WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "User not found".to_string()))?;

    Ok(Json(UserResponse::from(user)))
}

#[derive(Serialize)]
pub struct StatsResponse {
    pub friends: i64,
    pub conversations: i64,
    pub messages: i64,
}

pub async fn get_my_stats(
    State(state): State<AppState>,
    claims: Claims,
) -> Result<Json<StatsResponse>, (StatusCode, String)> {
    let friends: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM friendships
         WHERE status = 'accepted' AND user_id = $1",
    )
    .bind(claims.sub)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let conversations: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM conversation_participants WHERE user_id = $1",
    )
    .bind(claims.sub)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let messages: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM messages WHERE sender_id = $1",
    )
    .bind(claims.sub)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(StatsResponse { friends, conversations, messages }))
}

#[derive(Deserialize)]
pub struct UpdateProfileRequest {
    pub display_name: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub phone: Option<String>,
}

pub async fn update_profile(
    State(state): State<AppState>,
    claims: Claims,
    Json(req): Json<UpdateProfileRequest>,
) -> Result<Json<UserResponse>, (StatusCode, String)> {
    let user = sqlx::query_as::<_, models::User>(
        "UPDATE users SET
            display_name = COALESCE($1, display_name),
            bio = COALESCE($2, bio),
            avatar_url = COALESCE($3, avatar_url),
            phone = COALESCE($4, phone)
         WHERE id = $5 RETURNING *",
    )
    .bind(req.display_name)
    .bind(req.bio)
    .bind(req.avatar_url)
    .bind(req.phone)
    .bind(claims.sub)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(UserResponse::from(user)))
}
