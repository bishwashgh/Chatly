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
        .route("/", get(get_conversations))
        .route("/create", post(create_conversation))
        .route("/:id/messages", get(get_messages))
        .route("/:id/messages", post(send_message))
        .route("/:id/messages/:message_id/status", post(update_message_status))
        .route("/:id/messages/:message_id/reactions", post(add_reaction))
        .route("/:id/messages/:message_id/reactions/:emoji", axum::routing::delete(remove_reaction))
        .route("/:id/read", post(mark_conversation_read))
        .route("/:id", get(get_conversation))
}

#[derive(Serialize)]
pub struct ConversationResponse {
    pub id: Uuid,
    pub name: Option<String>,
    pub is_group: bool,
    pub avatar_url: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub participants: Vec<UserBrief>,
    pub last_message: Option<MessageResponse>,
    pub unread_count: i64,
}

#[derive(Serialize)]
pub struct UserBrief {
    pub id: Uuid,
    pub username: String,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub is_online: bool,
}

#[derive(Serialize)]
pub struct MessageResponse {
    pub id: Uuid,
    pub conversation_id: Uuid,
    pub sender_id: Uuid,
    pub content: Option<String>,
    pub message_type: String,
    pub media_url: Option<String>,
    pub media_duration: Option<i32>,
    pub file_name: Option<String>,
    pub file_size: Option<i64>,
    pub reply_to: Option<Uuid>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub reactions: Vec<ReactionSummary>,
}

#[derive(Serialize, Clone)]
pub struct ReactionSummary {
    pub emoji: String,
    pub count: i64,
    pub reacted_by_me: bool,
}

impl From<models::Message> for MessageResponse {
    fn from(m: models::Message) -> Self {
        Self {
            id: m.id,
            conversation_id: m.conversation_id,
            sender_id: m.sender_id,
            content: m.content,
            message_type: m.message_type.unwrap_or_else(|| "text".to_string()),
            media_url: m.media_url,
            media_duration: m.media_duration,
            file_name: m.file_name,
            file_size: m.file_size,
            reply_to: m.reply_to,
            status: m.status.unwrap_or_else(|| "sent".to_string()),
            created_at: m.created_at,
            reactions: Vec::new(),
        }
    }
}

pub async fn get_conversations(
    State(state): State<AppState>,
    claims: Claims,
) -> Result<Json<Vec<ConversationResponse>>, (StatusCode, String)> {
    let conversations = sqlx::query_as::<_, models::Conversation>(
        "SELECT c.* FROM conversations c
         JOIN conversation_participants cp ON cp.conversation_id = c.id
         WHERE cp.user_id = $1
         ORDER BY c.updated_at DESC",
    )
    .bind(claims.sub)
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut results = Vec::new();
    for conv in conversations {
        let participants = get_participants(&state.db, conv.id).await?;
        let last_message = get_last_message(&state.db, conv.id).await?;
        let unread_count = get_unread_count(&state.db, conv.id, claims.sub).await?;

        results.push(ConversationResponse {
            id: conv.id,
            name: conv.name,
            is_group: conv.is_group.unwrap_or(false),
            avatar_url: conv.avatar_url,
            created_at: conv.created_at,
            participants,
            last_message: last_message.map(|m| m.into()),
            unread_count,
        });
    }

    Ok(Json(results))
}

pub async fn get_conversation(
    State(state): State<AppState>,
    claims: Claims,
    Path(id): Path<Uuid>,
) -> Result<Json<ConversationResponse>, (StatusCode, String)> {
    let conv = sqlx::query_as::<_, models::Conversation>(
        "SELECT * FROM conversations WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Conversation not found".to_string()))?;

    let participants = get_participants(&state.db, conv.id).await?;
    let last_message = get_last_message(&state.db, conv.id).await?;
    let unread_count = get_unread_count(&state.db, conv.id, claims.sub).await?;

    Ok(Json(ConversationResponse {
        id: conv.id,
        name: conv.name,
        is_group: conv.is_group.unwrap_or(false),
        avatar_url: conv.avatar_url,
        created_at: conv.created_at,
        participants,
        last_message: last_message.map(|m| m.into()),
        unread_count,
    }))
}

#[derive(Deserialize)]
pub struct CreateConversationRequest {
    pub participant_id: Uuid,
    pub name: Option<String>,
}

pub async fn create_conversation(
    State(state): State<AppState>,
    claims: Claims,
    Json(req): Json<CreateConversationRequest>,
) -> Result<Json<ConversationResponse>, (StatusCode, String)> {
    // Check if conversation already exists between these two users
    let existing = sqlx::query_as::<_, models::Conversation>(
        "SELECT c.* FROM conversations c
         WHERE c.is_group = false
         AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = c.id AND user_id = $1)
         AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = c.id AND user_id = $2)
         LIMIT 1",
    )
    .bind(claims.sub)
    .bind(req.participant_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if let Some(conv) = existing {
        let participants = get_participants(&state.db, conv.id).await?;
        let last_message = get_last_message(&state.db, conv.id).await?;
        let unread_count = get_unread_count(&state.db, conv.id, claims.sub).await?;

        return Ok(Json(ConversationResponse {
            id: conv.id,
            name: conv.name,
            is_group: conv.is_group.unwrap_or(false),
            avatar_url: conv.avatar_url,
            created_at: conv.created_at,
            participants,
            last_message: last_message.map(|m| m.into()),
            unread_count,
        }));
    }

    // Create new conversation
    let conv = sqlx::query_as::<_, models::Conversation>(
        "INSERT INTO conversations (name, is_group, created_by)
         VALUES ($1, false, $2) RETURNING *",
    )
    .bind(req.name)
    .bind(claims.sub)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Add both participants
    sqlx::query("INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2)")
        .bind(conv.id)
        .bind(claims.sub)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    sqlx::query("INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2)")
        .bind(conv.id)
        .bind(req.participant_id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let participants = get_participants(&state.db, conv.id).await?;

    Ok(Json(ConversationResponse {
        id: conv.id,
        name: conv.name,
        is_group: conv.is_group.unwrap_or(false),
        avatar_url: conv.avatar_url,
        created_at: conv.created_at,
        participants,
        last_message: None,
        unread_count: 0,
    }))
}

#[derive(Deserialize)]
pub struct PaginationQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

pub async fn get_messages(
    State(state): State<AppState>,
    claims: Claims,
    Path(id): Path<Uuid>,
    axum::extract::Query(q): axum::extract::Query<PaginationQuery>,
) -> Result<Json<Vec<MessageResponse>>, (StatusCode, String)> {
    let limit = q.limit.unwrap_or(50);
    let offset = q.offset.unwrap_or(0);

    let messages = sqlx::query_as::<_, models::Message>(
        "SELECT * FROM messages WHERE conversation_id = $1
         ORDER BY created_at DESC LIMIT $2 OFFSET $3",
    )
    .bind(id)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let reactions = load_reactions(&state.db, &messages.iter().map(|m| m.id).collect::<Vec<_>>(), claims.sub).await?;

    let resp: Vec<MessageResponse> = messages
        .into_iter()
        .map(|m| {
            let mut r = MessageResponse::from(m);
            r.reactions = reactions.get(&r.id).cloned().unwrap_or_default();
            r
        })
        .collect();
    Ok(Json(resp))
}

#[derive(Deserialize)]
pub struct SendMessageRequest {
    pub content: Option<String>,
    pub message_type: Option<String>,
    pub media_url: Option<String>,
    pub media_duration: Option<i32>,
    pub file_name: Option<String>,
    pub file_size: Option<i64>,
    pub reply_to: Option<Uuid>,
}

pub async fn send_message(
    State(state): State<AppState>,
    claims: Claims,
    Path(id): Path<Uuid>,
    Json(req): Json<SendMessageRequest>,
) -> Result<(StatusCode, Json<MessageResponse>), (StatusCode, String)> {
    let msg = sqlx::query_as::<_, models::Message>(
        "INSERT INTO messages (conversation_id, sender_id, content, message_type, media_url, media_duration, file_name, file_size, reply_to, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'sent')
         RETURNING *",
    )
    .bind(id)
    .bind(claims.sub)
    .bind(req.content)
    .bind(req.message_type.unwrap_or_else(|| "text".to_string()))
    .bind(req.media_url)
    .bind(req.media_duration)
    .bind(req.file_name)
    .bind(req.file_size)
    .bind(req.reply_to)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Update conversation timestamp
    sqlx::query("UPDATE conversations SET updated_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await
        .ok();

    // Broadcast to WebSocket clients
    let ws_msg = serde_json::json!({
        "type": "new_message",
        "conversation_id": id,
        "message": MessageResponse::from(msg.clone()),
    });

    let participants = get_participant_ids(&state.db, id).await?;
    for pid in participants {
        if pid != claims.sub {
            if let Some(tx) = state.ws_channels.get(&pid) {
                let _ = tx.send(ws_msg.to_string());
            }
        }
    }

    Ok((StatusCode::CREATED, Json(MessageResponse::from(msg))))
}

#[derive(Deserialize)]
pub struct UpdateStatusRequest {
    pub status: String,
}

pub async fn update_message_status(
    State(state): State<AppState>,
    claims: Claims,
    Path((conv_id, message_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdateStatusRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query("UPDATE messages SET status = $1 WHERE id = $2")
        .bind(&req.status)
        .bind(message_id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Notify sender
    let msg = sqlx::query_as::<_, models::Message>("SELECT * FROM messages WHERE id = $1")
        .bind(message_id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if let Some(tx) = state.ws_channels.get(&msg.sender_id) {
        let ws_msg = serde_json::json!({
            "type": "message_status",
            "message_id": message_id,
            "conversation_id": conv_id,
            "status": req.status,
        });
        let _ = tx.send(ws_msg.to_string());
    }

    Ok(StatusCode::OK)
}

pub async fn mark_conversation_read(
    State(state): State<AppState>,
    claims: Claims,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query("UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = $1 AND user_id = $2")
        .bind(id)
        .bind(claims.sub)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::OK)
}

#[derive(Deserialize)]
pub struct AddReactionRequest {
    pub emoji: String,
}

pub async fn add_reaction(
    State(state): State<AppState>,
    claims: Claims,
    Path((conv_id, message_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<AddReactionRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let emoji = req.emoji.trim().to_string();
    if emoji.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Emoji is required".to_string()));
    }

    sqlx::query(
        "INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)
         ON CONFLICT (message_id, user_id, emoji) DO UPDATE SET emoji = EXCLUDED.emoji",
    )
    .bind(message_id)
    .bind(claims.sub)
    .bind(&emoji)
    .execute(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    broadcast_reaction(&state, &conv_id, &message_id, &emoji, true, claims.sub).await?;

    Ok(Json(serde_json::json!({ "message_id": message_id, "emoji": emoji, "reacted_by_me": true })))
}

pub async fn remove_reaction(
    State(state): State<AppState>,
    claims: Claims,
    Path((conv_id, message_id, emoji)): Path<(Uuid, Uuid, String)>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    sqlx::query("DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3")
        .bind(message_id)
        .bind(claims.sub)
        .bind(&emoji)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    broadcast_reaction(&state, &conv_id, &message_id, &emoji, false, claims.sub).await?;

    Ok(Json(serde_json::json!({ "message_id": message_id, "emoji": emoji, "reacted_by_me": false })))
}

async fn broadcast_reaction(
    state: &AppState,
    conv_id: &Uuid,
    message_id: &Uuid,
    emoji: &str,
    added: bool,
    reactor_id: Uuid,
) -> Result<(), (StatusCode, String)> {
    let participants = get_participant_ids(&state.db, *conv_id).await?;
    let ws_msg = serde_json::json!({
        "type": "message_reaction",
        "conversation_id": conv_id,
        "message_id": message_id,
        "emoji": emoji,
        "added": added,
        "user_id": reactor_id,
    });
    for pid in participants {
        if let Some(tx) = state.ws_channels.get(&pid) {
            let _ = tx.send(ws_msg.to_string());
        }
    }
    Ok(())
}

async fn load_reactions(
    db: &PgPool,
    message_ids: &[Uuid],
    viewer_id: Uuid,
) -> Result<std::collections::HashMap<Uuid, Vec<ReactionSummary>>, (StatusCode, String)> {
    let mut result: std::collections::HashMap<Uuid, Vec<ReactionSummary>> = std::collections::HashMap::new();
    if message_ids.is_empty() {
        return Ok(result);
    }

    #[derive(sqlx::FromRow)]
    struct Row {
        message_id: Uuid,
        emoji: String,
        count: i64,
        reacted_by_me: bool,
    }

    let rows = sqlx::query_as::<_, Row>(
        "SELECT message_id, emoji, COUNT(*) AS count, bool_or(user_id = $2) AS reacted_by_me
         FROM message_reactions
         WHERE message_id = ANY($1)
         GROUP BY message_id, emoji",
    )
    .bind(message_ids)
    .bind(viewer_id)
    .fetch_all(db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    for row in rows {
        result
            .entry(row.message_id)
            .or_insert_with(Vec::new)
            .push(ReactionSummary {
                emoji: row.emoji,
                count: row.count,
                reacted_by_me: row.reacted_by_me,
            });
    }

    Ok(result)
}

async fn get_participants(db: &PgPool, conv_id: Uuid) -> Result<Vec<UserBrief>, (StatusCode, String)> {
    let users = sqlx::query_as::<_, models::User>(
        "SELECT u.* FROM users u
         JOIN conversation_participants cp ON cp.user_id = u.id
         WHERE cp.conversation_id = $1",
    )
    .bind(conv_id)
    .fetch_all(db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(users.into_iter().map(|u| UserBrief {
        id: u.id,
        username: u.username,
        display_name: u.display_name,
        avatar_url: u.avatar_url,
        is_online: u.is_online,
    }).collect())
}

async fn get_participant_ids(db: &PgPool, conv_id: Uuid) -> Result<Vec<Uuid>, (StatusCode, String)> {
    let rows: Vec<(Uuid,)> = sqlx::query_as("SELECT user_id FROM conversation_participants WHERE conversation_id = $1")
        .bind(conv_id)
        .fetch_all(db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(rows.into_iter().map(|r| r.0).collect())
}

async fn get_last_message(db: &PgPool, conv_id: Uuid) -> Result<Option<models::Message>, (StatusCode, String)> {
    let msg = sqlx::query_as::<_, models::Message>(
        "SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1",
    )
    .bind(conv_id)
    .fetch_optional(db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(msg)
}

async fn get_unread_count(db: &PgPool, conv_id: Uuid, user_id: Uuid) -> Result<i64, (StatusCode, String)> {
    let count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM messages m
         WHERE m.conversation_id = $1
         AND m.sender_id != $2
         AND m.created_at > COALESCE(
             (SELECT last_read_at FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2),
             '1970-01-01'::timestamptz
         )",
    )
    .bind(conv_id)
    .bind(user_id)
    .fetch_one(db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(count.0)
}
