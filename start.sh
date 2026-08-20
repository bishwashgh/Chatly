#!/bin/bash
# Chatly - start everything
set -e

cd "$(dirname "$0")"

echo "=== Checking PostgreSQL ==="
if ! pg_isready -q 2>/dev/null; then
  echo "Starting PostgreSQL..."
  echo "Ghimire2004" | sudo -S systemctl start postgresql 2>/dev/null || sudo systemctl start postgresql
fi

echo "=== Starting Rust backend on :3000 ==="
cd backend
if pgrep -f chat_backend > /dev/null; then
  echo "Backend already running (PID $(pgrep -f chat_backend))"
else
  setsid nohup ./target/debug/chat_backend > /tmp/opencode/backend.log 2>&1 < /dev/null &
  echo "Backend started (PID $!) - log at /tmp/opencode/backend.log"
fi

echo "=== Starting Expo dev server ==="
cd ../mobile
npx expo start

echo "Done!"