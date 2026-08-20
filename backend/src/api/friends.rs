use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::Claims;
use crate::db::models;
use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_friends))
        .route("/request", post(send_friend_request))
        .route("/accept", post(accept_friend_request))
        .route("/decline", post(decline_friend_request))
        .route("/requests", get(get_incoming_requests))
        .route("/outgoing", get(get_outgoing_requests))
        .route("/status/:id", get(get_friend_status))
}

#[derive(Serialize)]
pub struct FriendResponse {
    pub id: Uuid,
    pub username: String,
    pub display_name: String,
    pub bio: String,
    pub avatar_url: Option<String>,
    pub is_online: bool,
}

impl From<models::User> for FriendResponse {
    fn from(u: models::User) -> Self {
        Self {
            id: u.id,
            username: u.username,
            display_name: u.display_name,
            bio: u.bio.unwrap_or_default(),
            avatar_url: u.avatar_url,
            is_online: u.is_online,
        }
    }
}

#[derive(Deserialize)]
pub struct UserIdRequest {
    pub user_id: Uuid,
}

#[derive(Serialize)]
pub struct FriendStatusResponse {
    pub status: String, // "none" | "outgoing" | "incoming" | "friends"
}

pub async fn get_friends(
    State(state): State<AppState>,
    claims: Claims,
) -> Result<Json<Vec<FriendResponse>>, (StatusCode, String)> {
    let users = sqlx::query_as::<_, models::User>(
        "SELECT u.* FROM users u
         WHERE u.id IN (
             SELECT friend_id FROM friendships WHERE user_id = $1 AND status = 'accepted'
             UNION
             SELECT user_id FROM friendships WHERE friend_id = $1 AND status = 'accepted'
         )
         ORDER BY u.display_name",
    )
    .bind(claims.sub)
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let resp: Vec<FriendResponse> = users.into_iter().map(|u| u.into()).collect();
    Ok(Json(resp))
}

pub async fn send_friend_request(
    State(state): State<AppState>,
    claims: Claims,
    Json(req): Json<UserIdRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if req.user_id == claims.sub {
        return Err((StatusCode::BAD_REQUEST, "You cannot add yourself as a friend".to_string()));
    }

    // Already friends in either direction?
    let accepted = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(
            SELECT 1 FROM friendships
            WHERE status = 'accepted'
              AND ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))
        )",
    )
    .bind(claims.sub)
    .bind(req.user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if accepted {
        return Err((StatusCode::CONFLICT, "You are already friends".to_string()));
    }

    // Did the other user already send me a request? If so, auto-accept.
    let incoming = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(
            SELECT 1 FROM friendships
            WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'
        )",
    )
    .bind(req.user_id)
    .bind(claims.sub)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if incoming {
        sqlx::query("UPDATE friendships SET status = 'accepted', updated_at = NOW() WHERE user_id = $1 AND friend_id = $2")
            .bind(req.user_id)
            .bind(claims.sub)
            .execute(&state.db)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        sqlx::query(
            "INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, 'accepted')
             ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted', updated_at = NOW()",
        )
        .bind(claims.sub)
        .bind(req.user_id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        return Ok(Json(serde_json::json!({ "status": "friends" })));
    }

    // Existing outgoing request?
    let existing = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM friendships WHERE user_id = $1 AND friend_id = $2 AND status = 'pending')",
    )
    .bind(claims.sub)
    .bind(req.user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if existing {
        return Err((StatusCode::CONFLICT, "Friend request already sent".to_string()));
    }

    sqlx::query("INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, 'pending')")
        .bind(claims.sub)
        .bind(req.user_id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(serde_json::json!({ "status": "outgoing" })))
}

pub async fn accept_friend_request(
    State(state): State<AppState>,
    claims: Claims,
    Json(req): Json<UserIdRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let updated = sqlx::query(
        "UPDATE friendships SET status = 'accepted', updated_at = NOW()
         WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'",
    )
    .bind(req.user_id)
    .bind(claims.sub)
    .execute(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .rows_affected();

    if updated == 0 {
        return Err((StatusCode::NOT_FOUND, "No pending friend request from this user".to_string()));
    }

    // Mirror the friendship for the current user.
    sqlx::query(
        "INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, 'accepted')
         ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted', updated_at = NOW()",
    )
    .bind(claims.sub)
    .bind(req.user_id)
    .execute(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(serde_json::json!({ "status": "friends" })))
}

pub async fn decline_friend_request(
    State(state): State<AppState>,
    claims: Claims,
    Json(req): Json<UserIdRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    sqlx::query("DELETE FROM friendships WHERE user_id = $1 AND friend_id = $2")
        .bind(req.user_id)
        .bind(claims.sub)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(serde_json::json!({ "status": "none" })))
}

pub async fn get_incoming_requests(
    State(state): State<AppState>,
    claims: Claims,
) -> Result<Json<Vec<FriendResponse>>, (StatusCode, String)> {
    let users = sqlx::query_as::<_, models::User>(
        "SELECT u.* FROM users u
         JOIN friendships f ON f.user_id = u.id
         WHERE f.friend_id = $1 AND f.status = 'pending'
         ORDER BY f.created_at DESC",
    )
    .bind(claims.sub)
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let resp: Vec<FriendResponse> = users.into_iter().map(|u| u.into()).collect();
    Ok(Json(resp))
}

pub async fn get_outgoing_requests(
    State(state): State<AppState>,
    claims: Claims,
) -> Result<Json<Vec<FriendResponse>>, (StatusCode, String)> {
    let users = sqlx::query_as::<_, models::User>(
        "SELECT u.* FROM users u
         JOIN friendships f ON f.friend_id = u.id
         WHERE f.user_id = $1 AND f.status = 'pending'
         ORDER BY f.created_at DESC",
    )
    .bind(claims.sub)
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let resp: Vec<FriendResponse> = users.into_iter().map(|u| u.into()).collect();
    Ok(Json(resp))
}

pub async fn get_friend_status(
    State(state): State<AppState>,
    claims: Claims,
    Path(id): Path<Uuid>,
) -> Result<Json<FriendStatusResponse>, (StatusCode, String)> {
    if id == claims.sub {
        return Ok(Json(FriendStatusResponse { status: "self".to_string() }));
    }

    let status: Option<String> = sqlx::query_scalar(
        "SELECT status FROM friendships
         WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
         LIMIT 1",
    )
    .bind(claims.sub)
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = match status.as_deref() {
        Some("accepted") => "friends".to_string(),
        Some("pending") => {
            // Determine direction: did I send it or did they?
            let sent_by_me = sqlx::query_scalar::<_, bool>(
                "SELECT EXISTS(SELECT 1 FROM friendships WHERE user_id = $1 AND friend_id = $2 AND status = 'pending')",
            )
            .bind(claims.sub)
            .bind(id)
            .fetch_one(&state.db)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if sent_by_me {
                "outgoing".to_string()
            } else {
                "incoming".to_string()
            }
        }
        _ => "none".to_string(),
    };

    Ok(Json(FriendStatusResponse { status }))
}