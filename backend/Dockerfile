FROM rust:1.97-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

COPY backend/Cargo.toml backend/Cargo.lock* ./

RUN mkdir -p src && echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src

COPY backend/src ./src
COPY backend/migrations ./migrations

RUN cargo build --release

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /build/target/release/chat_backend ./chat_backend
COPY --from=builder /build/migrations ./migrations
COPY backend/.env.example ./.env.example

RUN mkdir -p /app/uploads && chmod +x /app/chat_backend

ENV DATABASE_URL=postgres://postgres:postgres@db:5432/chat_app
ENV JWT_SECRET=change-this-secret-in-production
ENV SERVER_HOST=0.0.0.0
ENV SERVER_PORT=3000
ENV UPLOAD_DIR=/app/uploads
ENV MIGRATIONS_DIR=/app/migrations
ENV RESEND_API_KEY=re_FBsrKrjq_7cGqFJUmzL816XRnX8jJjuNL
ENV RESEND_FROM_EMAIL="Chatly <no-reply@bishwasghimire.com.np>"
ENV RUST_LOG=chat_backend=info,tower_http=info

EXPOSE 3000

CMD ["./chat_backend"]