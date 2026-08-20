# Chatly - VPS deploy script (Ubuntu/Debian/Arch)
# Run as root or with sudo. Builds release binary locally, ships to server.
set -euo pipefail

SERVER="${1:?Usage: ./deploy.sh user@server-ip}"
DOMAIN="${DOMAIN:-chat.example.com}"
JWT_SECRET="${JWT_SECRET:?set a strong JWT_SECRET}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
TURN_PASSWORD="${TURN_PASSWORD:-$(head -c 24 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9')}"

echo "=== Building release binary ==="
(cd backend && cargo build --release --locked)

echo "=== Deploying to $SERVER ==="
rsync -avz --rsync-path="sudo rsync" \
  backend/target/release/chat_backend \
  backend/migrations/ \
  deploy/nepalchat.service \
  "$SERVER:/tmp/nepalchat-deploy/"

ssh "$SERVER" "sudo bash -s" << 'REMOTE'
set -euo pipefail
set -a; source /tmp/nepalchat-deploy/nepalchat.service.env 2>/dev/null || true; set +a
mkdir -p /opt/nepalchat/uploads
sudo useradd -r -s /usr/sbin/nologin nepalchat 2>/dev/null || true
sudo cp /tmp/nepalchat-deploy/chat_backend /opt/nepalchat/
sudo cp -r /tmp/nepalchat-deploy/migrations /opt/nepalchat/
sudo cp /tmp/nepalchat-deploy/nepalchat.service /etc/systemd/system/
sudo chown -R nepalchat:nepalchat /opt/nepalchat
sudo systemctl daemon-reload
sudo systemctl enable --now nepalchat
REMOTE

echo "=== Done. Backend running via systemd on $SERVER:3000 ==="
echo "Next: point Caddy/Nginx at port 3000 with HTTPS/WSS, then update"
echo "      mobile/src/config.ts to https://$DOMAIN"