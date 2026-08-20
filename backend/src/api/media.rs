use axum::{
    extract::{Multipart, State},
    http::{header, StatusCode},
    routing::post,
    Json, Router,
};
use serde::Serialize;
use std::path::PathBuf;
use uuid::Uuid;

use crate::auth::Claims;
use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::new().route("/upload", post(upload_file))
}

#[derive(Serialize)]
pub struct UploadResponse {
    pub url: String,
    pub file_name: String,
    pub file_size: i64,
    pub media_type: String,
}

pub async fn upload_file(
    State(state): State<AppState>,
    claims: Claims,
    mut multipart: Multipart,
) -> Result<Json<UploadResponse>, (StatusCode, String)> {
    let _ = claims;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
    {
        let filename = field
            .file_name()
            .unwrap_or("upload.bin")
            .to_string();

        let content_type = field
            .content_type()
            .unwrap_or("application/octet-stream")
            .to_string();

        let data = field
            .bytes()
            .await
            .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

        let ext = PathBuf::from(&filename)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("bin")
            .to_string();

        let file_id = Uuid::new_v4();
        let stored_name = format!("{}.{}", file_id, ext);
        let upload_dir = std::env::var("UPLOAD_DIR").unwrap_or_else(|_| "./uploads".to_string());
        let file_path = PathBuf::from(&upload_dir).join(&stored_name);

        tokio::fs::create_dir_all(&upload_dir)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        tokio::fs::write(&file_path, &data)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let url = format!("/media/{}", stored_name);
        let file_size = data.len() as i64;

        let media_type = if content_type.starts_with("image/") {
            "image"
        } else if content_type.starts_with("audio/") {
            "audio"
        } else if content_type.starts_with("video/") {
            "video"
        } else {
            "file"
        };

        return Ok(Json(UploadResponse {
            url,
            file_name: filename,
            file_size,
            media_type: media_type.to_string(),
        }));
    }

    Err((StatusCode::BAD_REQUEST, "No file provided".to_string()))
}
