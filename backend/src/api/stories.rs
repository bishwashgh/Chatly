use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{delete, get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::auth::Claims;
use crate::db::models;
use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", post(create_story))
        .route("/", get(list_stories))
        .route("/:id", delete(delete_story))
}

#[derive(Serialize)]
pub struct StoryResponse {
    pub id: Uuid,
    pub user_id: Uuid,
    pub media_url: String,
    pub media_type: String,
    pub file_name: Option<String>,
    pub caption: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Serialize)]
pub struct StoryGroup {
    pub user: StoryUser,
    pub stories: Vec<StoryResponse>,
}

#[derive(Serialize)]
pub struct StoryUser {
    pub id: Uuid,
    pub username: String,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub is_online: bool,
}

#[derive(Deserialize)]
pub struct CreateStoryRequest {
    pub media_url: String,
    pub media_type: Option<String>,
    pub file_name: Option<String>,
    pub caption: Option<String>,
}

pub async fn create_story(
    State(state): State<AppState>,
    claims: Claims,
    Json(req): Json<CreateStoryRequest>,
) -> Result<(StatusCode, Json<StoryResponse>), (StatusCode, String)> {
    let media_type = req.media_type.unwrap_or_else(|| "image".to_string());

    let story = sqlx::query_as::<_, models::Story>(
        "INSERT INTO stories (user_id, media_url, media_type, file_name, caption)
         VALUES ($1, $2, $3, $4, $5) RETURNING *",
    )
    .bind(claims.sub)
    .bind(&req.media_url)
    .bind(&media_type)
    .bind(req.file_name)
    .bind(req.caption)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok((StatusCode::CREATED, Json(story.into())))
}

pub async fn list_stories(
    State(state): State<AppState>,
    claims: Claims,
) -> Result<Json<Vec<StoryGroup>>, (StatusCode, String)> {
    // Stories from friends (accepted friendships) + the current user's own stories,
    // that have not expired.
    let stories = sqlx::query_as::<_, models::Story>(
        "SELECT s.* FROM stories s
         WHERE s.expires_at > NOW()
           AND (
             s.user_id = $1
             OR EXISTS (
                SELECT 1 FROM friendships f
                WHERE f.status = 'accepted'
                  AND ((f.user_id = $1 AND f.friend_id = s.user_id)
                       OR (f.user_id = s.user_id AND f.friend_id = $1))
             )
           )
         ORDER BY s.created_at DESC",
    )
    .bind(claims.sub)
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Group by user, preserving most-recent-first order.
    let mut groups: Vec<StoryGroup> = Vec::new();
    for story in stories {
        let user = sqlx::query_as::<_, models::User>("SELECT * FROM users WHERE id = $1")
            .bind(story.user_id)
            .fetch_one(&state.db)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let user = StoryUser {
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            avatar_url: user.avatar_url,
            is_online: user.is_online,
        };

        match groups.iter_mut().find(|g| g.user.id == user.id) {
            Some(group) => group.stories.push(story.into()),
            None => groups.push(StoryGroup {
                user,
                stories: vec![story.into()],
            }),
        }
    }

    Ok(Json(groups))
}

pub async fn delete_story(
    State(state): State<AppState>,
    claims: Claims,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query("DELETE FROM stories WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(claims.sub)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Story not found".to_string()));
    }

    Ok(StatusCode::OK)
}

impl From<models::Story> for StoryResponse {
    fn from(s: models::Story) -> Self {
        Self {
            id: s.id,
            user_id: s.user_id,
            media_url: s.media_url,
            media_type: s.media_type.unwrap_or_else(|| "image".to_string()),
            file_name: s.file_name,
            caption: s.caption,
            created_at: s.created_at,
        }
    }
}