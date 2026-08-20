mod api;
mod auth;
mod db;
mod webrtc;
mod ws;

use axum::{
    extract::Request,
    http::{header, Method, StatusCode},
    middleware::Next,
    response::Response,
    routing::{get, Router},
};
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;
use tower_http::trace::TraceLayer;
use ws::WsChannels;

fn db_host(url: &str) -> &str {
    url.split('@')
        .nth(1)
        .unwrap_or(url)
        .split('/')
        .next()
        .unwrap_or(url)
}

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::PgPool,
    pub ws_channels: WsChannels,
}

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "chat_backend=debug,tower_http=debug".into()),
        )
        .init();

    tracing::info!("chat_backend starting");

    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    tracing::info!("DATABASE_URL is set (host: {})", db_host(&database_url));

    let mut pool: Option<sqlx::PgPool> = None;
    for attempt in 1..=15 {
        match PgPoolOptions::new()
            .max_connections(10)
            .acquire_timeout(std::time::Duration::from_secs(5))
            .connect(&database_url)
            .await
        {
            Ok(p) => {
                tracing::info!("Connected to database on attempt {}/15", attempt);
                pool = Some(p);
                break;
            }
            Err(e) => {
                tracing::error!("DB connect attempt {}/15 failed: {}", attempt, e);
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;
            }
        }
    }
    let pool = pool.expect("Failed to connect to database after 15 attempts");

    db::run_migrations(&pool)
        .await
        .expect("Failed to run migrations");

    let state = AppState {
        db: pool,
        ws_channels: Arc::new(dashmap::DashMap::new()),
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::PATCH,
            Method::OPTIONS,
        ])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION]);

    let upload_dir = std::env::var("UPLOAD_DIR").unwrap_or_else(|_| "./uploads".to_string());
    let app = Router::new()
        .route("/health", get(|| async { "OK" }))
        .route("/ws", get(ws::ws_handler))
        .nest("/api/auth", auth::router())
        .nest("/api/users", api::users::router())
        .nest("/api/conversations", api::messages::router())
        .nest("/api/media", api::media::router())
        .nest("/api/calls", api::calls::router())
        .nest("/api/friends", api::friends::router())
        .nest("/api/stories", api::stories::router())
        .nest_service("/media", ServeDir::new(&upload_dir))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let host = std::env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port: u16 = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "3000".to_string())
        .parse()
        .unwrap_or(3000);

    let addr = format!("{}:{}", host, port);
    tracing::info!("Server starting on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("Failed to bind");

    tracing::info!("Server listening on http://{}", addr);

    axum::serve(listener, app)
        .await
        .expect("Server error");
}
