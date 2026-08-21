use axum::{
    extract::{Multipart, State},
    http::StatusCode,
    routing::post,
    Json, Router,
};
use serde::Serialize;
use sha1::{Digest, Sha1};
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

fn env(name: &str) -> Result<String, (StatusCode, String)> {
    std::env::var(name).map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("{name} is not configured"),
        )
    })
}

fn cloudinary_signature(params: &[(String, String)], api_secret: &str) -> String {
    let mut sorted = params.to_vec();
    sorted.sort_by(|a, b| a.0.cmp(&b.0));
    let mut s = String::new();
    for (k, v) in &sorted {
        s.push_str(k);
        s.push('=');
        s.push_str(v);
        s.push('&');
    }
    s.pop();
    s.push_str(api_secret);
    let mut hasher = Sha1::new();
    hasher.update(s.as_bytes());
    hex::encode(hasher.finalize())
}

async fn upload_to_cloudinary(
    data: &[u8],
    mime: &str,
    public_id: &str,
) -> Result<String, (StatusCode, String)> {
    let cloud = env("CLOUDINARY_CLOUD_NAME")?;
    let api_key = env("CLOUDINARY_API_KEY")?;
    let api_secret = env("CLOUDINARY_API_SECRET")?;

    let timestamp = chrono::Utc::now().timestamp().to_string();
    let params = vec![
        ("api_key".to_string(), api_key.clone()),
        ("public_id".to_string(), public_id.to_string()),
        ("timestamp".to_string(), timestamp.clone()),
    ];
    let signature = cloudinary_signature(&params, &api_secret);

    let part = reqwest::multipart::Part::bytes(data.to_vec())
        .file_name(public_id.to_string())
        .mime_str(mime)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let form = reqwest::multipart::Form::new()
        .part("file", part)
        .text("timestamp", timestamp)
        .text("api_key", api_key)
        .text("signature", signature);

    let url = format!("https://api.cloudinary.com/v1_1/{}/auto/upload", cloud);

    let client = reqwest::Client::new();
    let resp = client
        .post(&url)
        .multipart(form)
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("Cloudinary request failed: {e}")))?;

    let status = resp.status();
    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("Cloudinary response invalid: {e}")))?;

    if !status.is_success() {
        return Err((StatusCode::BAD_GATEWAY, format!("Cloudinary error: {body}")));
    }

    body.get("secure_url")
        .and_then(|u| u.as_str())
        .map(|u| u.to_string())
        .ok_or_else(|| {
            (
                StatusCode::BAD_GATEWAY,
                "Cloudinary response missing secure_url".to_string(),
            )
        })
}

pub async fn upload_file(
    State(state): State<AppState>,
    claims: Claims,
    mut multipart: Multipart,
) -> Result<Json<UploadResponse>, (StatusCode, String)> {
    let _ = (state, claims);

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

        let file_id = Uuid::new_v4();
        let public_id = format!("chatly/{}", file_id);

        let url = upload_to_cloudinary(&data, &content_type, &public_id).await?;
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