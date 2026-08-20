use axum::{
    extract::{
        ws::{Message as WsMessage, WebSocket, WebSocketUpgrade},
        Query, State,
    },
    response::IntoResponse,
};
use dashmap::DashMap;
use futures::{sink::SinkExt, stream::StreamExt};
use serde::Deserialize;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::mpsc;
use uuid::Uuid;

use crate::AppState;

#[derive(Deserialize)]
pub struct WsAuthQuery {
    pub token: String,
}

pub type WsChannel = mpsc::UnboundedSender<String>;
pub type WsChannels = Arc<DashMap<Uuid, WsChannel>>;

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(query): Query<WsAuthQuery>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    // Verify token
    let claims = match crate::auth::verify_jwt(&query.token) {
        Ok(c) => c,
        Err(_) => {
            return axum::response::Response::builder()
                .status(axum::http::StatusCode::UNAUTHORIZED)
                .body(axum::body::Body::empty())
                .unwrap();
        }
    };

    let user_id = claims.sub;

    ws.on_upgrade(move |socket| handle_ws(socket, state, user_id))
}

async fn handle_ws(socket: WebSocket, state: AppState, user_id: Uuid) {
    let (mut ws_sender, mut ws_receiver) = socket.split();

    // Create a channel to send messages to this client
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();

    // Register the channel
    state.ws_channels.insert(user_id, tx.clone());

    // Mark user as online
    let _ = sqlx::query("UPDATE users SET is_online = true, last_seen = NOW() WHERE id = $1")
        .bind(user_id)
        .execute(&state.db)
        .await;

    // Notify user's contacts that they're online
    broadcast_presence(&state, user_id, true).await;

    tracing::info!("WebSocket connected: user {}", user_id);

    // Forward messages from the channel to the WebSocket
    let send_state = state.clone();
    let send_task = tokio::spawn(async move {
        let _ = send_state;
        while let Some(msg) = rx.recv().await {
            if ws_sender.send(WsMessage::Text(msg)).await.is_err() {
                break;
            }
        }
    });

    // Receive messages from the WebSocket
    let recv_state = state.clone();
    let recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = ws_receiver.next().await {
            match msg {
                WsMessage::Text(text) => {
                    if let Ok(json) = serde_json::from_str::<Value>(&text) {
                        handle_ws_message(&recv_state, user_id, json).await;
                    }
                }
                WsMessage::Close(_) => break,
                _ => {}
            }
        }
    });

    // Wait for either task to finish
    tokio::select! {
        _ = send_task => {}
        _ = recv_task => {}
    }

    // Cleanup: remove channel and mark offline
    state.ws_channels.remove(&user_id);

    let _ = sqlx::query("UPDATE users SET is_online = false, last_seen = NOW() WHERE id = $1")
        .bind(user_id)
        .execute(&state.db)
        .await;

    broadcast_presence(&state, user_id, false).await;

    tracing::info!("WebSocket disconnected: user {}", user_id);
}

async fn broadcast_presence(state: &AppState, user_id: Uuid, online: bool) {
    // Find all conversations the user is part of
    let participants: Vec<(Uuid,)> = sqlx::query_as(
        "SELECT DISTINCT cp2.user_id FROM conversation_participants cp1
         JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
         WHERE cp1.user_id = $1 AND cp2.user_id != $1",
    )
    .bind(user_id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let msg = serde_json::json!({
        "type": "presence",
        "user_id": user_id,
        "online": online,
    })
    .to_string();

    for (pid,) in participants {
        if let Some(tx) = state.ws_channels.get(&pid) {
            let _ = tx.send(msg.clone());
        }
    }
}

async fn handle_ws_message(state: &AppState, sender_id: Uuid, msg: Value) {
    let msg_type = msg.get("type").and_then(|t| t.as_str()).unwrap_or("");

    match msg_type {
        // WebRTC Signaling: forward offer/answer/ice candidates to target user
        "call_offer" | "call_answer" | "ice_candidate" | "call_reject" | "call_end" | "call_ring" => {
            let target_id = msg.get("target_id").and_then(|t| t.as_str());
            if let Some(target_str) = target_id {
                if let Ok(target_id) = Uuid::parse_str(target_str) {
                    let mut forwarded = msg.clone();
                    forwarded["from_id"] = serde_json::json!(sender_id);
                    if let Some(tx) = state.ws_channels.get(&target_id) {
                        let _ = tx.send(forwarded.to_string());
                    }
                }
            }
        }
        // Typing indicator
        "typing" => {
            let conv_id = msg.get("conversation_id").and_then(|c| c.as_str());
            let is_typing = msg.get("is_typing").and_then(|t| t.as_bool()).unwrap_or(false);
            if let Some(conv_str) = conv_id {
                if let Ok(conv_id) = Uuid::parse_str(conv_str) {
                    let participants: Vec<(Uuid,)> = sqlx::query_as(
                        "SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2",
                    )
                    .bind(conv_id)
                    .bind(sender_id)
                    .fetch_all(&state.db)
                    .await
                    .unwrap_or_default();

                    let ws_msg = serde_json::json!({
                        "type": "typing",
                        "conversation_id": conv_id,
                        "user_id": sender_id,
                        "is_typing": is_typing,
                    })
                    .to_string();

                    for (pid,) in participants {
                        if let Some(tx) = state.ws_channels.get(&pid) {
                            let _ = tx.send(ws_msg.clone());
                        }
                    }
                }
            }
        }
        // Message read receipts
        "message_read" => {
            let conv_id = msg.get("conversation_id").and_then(|c| c.as_str());
            let message_id = msg.get("message_id").and_then(|m| m.as_str());
            if let (Some(conv_str), Some(msg_str)) = (conv_id, message_id) {
                if let (Ok(conv_id), Ok(message_id)) = (Uuid::parse_str(conv_str), Uuid::parse_str(msg_str)) {
                    // Get the sender of this message
                    if let Ok((sender_id,)) = sqlx::query_as::<_, (Uuid,)>(
                        "SELECT sender_id FROM messages WHERE id = $1",
                    )
                    .bind(message_id)
                    .fetch_one(&state.db)
                    .await
                    {
                        let ws_msg = serde_json::json!({
                            "type": "message_status",
                            "message_id": message_id,
                            "conversation_id": conv_id,
                            "status": "read",
                        })
                        .to_string();

                        if let Some(tx) = state.ws_channels.get(&sender_id) {
                            let _ = tx.send(ws_msg);
                        }
                    }
                }
            }
        }
        // Ping/keepalive
        "ping" => {
            if let Some(tx) = state.ws_channels.get(&sender_id) {
                let _ = tx.send(serde_json::json!({"type": "pong"}).to_string());
            }
        }
        _ => {}
    }
}
