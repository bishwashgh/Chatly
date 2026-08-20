use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::auth::Claims;
use crate::db::models;
use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/history", get(get_call_history))
        .route("/log", post(log_call))
        .route("/:id", get(get_call))
}

#[derive(Serialize)]
pub struct CallResponse {
    pub id: Uuid,
    pub conversation_id: Uuid,
    pub caller_id: Uuid,
    pub callee_id: Uuid,
    pub call_type: String,
    pub status: String,
    pub started_at: Option<chrono::DateTime<chrono::Utc>>,
    pub ended_at: Option<chrono::DateTime<chrono::Utc>>,
    pub duration: i32,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl From<models::Call> for CallResponse {
    fn from(c: models::Call) -> Self {
        Self {
            id: c.id,
            conversation_id: c.conversation_id,
            caller_id: c.caller_id,
            callee_id: c.callee_id,
            call_type: c.call_type.unwrap_or_else(|| "audio".to_string()),
            status: c.status.unwrap_or_else(|| "initiated".to_string()),
            started_at: c.started_at,
            ended_at: c.ended_at,
            duration: c.duration.unwrap_or(0),
            created_at: c.created_at,
        }
    }
}

pub async fn get_call_history(
    State(state): State<AppState>,
    claims: Claims,
) -> Result<Json<Vec<CallResponse>>, (StatusCode, String)> {
    let calls = sqlx::query_as::<_, models::Call>(
        "SELECT * FROM calls WHERE caller_id = $1 OR callee_id = $1 ORDER BY created_at DESC LIMIT 50",
    )
    .bind(claims.sub)
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let resp: Vec<CallResponse> = calls.into_iter().map(|c| c.into()).collect();
    Ok(Json(resp))
}

#[derive(Deserialize)]
pub struct LogCallRequest {
    pub conversation_id: Uuid,
    pub callee_id: Uuid,
    pub call_type: String,
    pub status: String,
    pub duration: Option<i32>,
}

pub async fn log_call(
    State(state): State<AppState>,
    claims: Claims,
    Json(req): Json<LogCallRequest>,
) -> Result<Json<CallResponse>, (StatusCode, String)> {
    let started_at = if req.status == "ended" { Some(chrono::Utc::now() - chrono::Duration::seconds(req.duration.unwrap_or(0) as i64)) } else { None };
    let ended_at = if req.status == "ended" { Some(chrono::Utc::now()) } else { None };

    let call = sqlx::query_as::<_, models::Call>(
        "INSERT INTO calls (conversation_id, caller_id, callee_id, call_type, status, started_at, ended_at, duration)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
    )
    .bind(req.conversation_id)
    .bind(claims.sub)
    .bind(req.callee_id)
    .bind(&req.call_type)
    .bind(&req.status)
    .bind(started_at)
    .bind(ended_at)
    .bind(req.duration)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(CallResponse::from(call)))
}

pub async fn get_call(
    State(state): State<AppState>,
    claims: Claims,
    Path(id): Path<Uuid>,
) -> Result<Json<CallResponse>, (StatusCode, String)> {
    let _ = claims;
    let call = sqlx::query_as::<_, models::Call>("SELECT * FROM calls WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Call not found".to_string()))?;

    Ok(Json(CallResponse::from(call)))
}
