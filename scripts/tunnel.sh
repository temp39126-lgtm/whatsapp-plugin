#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CLOUDFLARED="${CLOUDFLARED:-/tmp/cloudflared}"
if [[ ! -x "$CLOUDFLARED" ]]; then
  curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o "$CLOUDFLARED"
  chmod +x "$CLOUDFLARED"
fi

echo "==> Ensuring MongoDB and backend are running"
bash scripts/start-mongo.sh || true
pgrep -f "tsx watch src/server.ts" >/dev/null || (cd backend && npm run dev &)
sleep 3

echo "==> Starting backend Cloudflare tunnel"
"$CLOUDFLARED" tunnel --url http://localhost:5000 --no-autoupdate > /tmp/cf-backend.log 2>&1 &
sleep 8
BACKEND_URL=$(rg -o 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/cf-backend.log | head -1)
echo "Backend tunnel: $BACKEND_URL"

echo "==> Building frontend for production (CSS works through tunnels)"
cd frontend
NEXT_PUBLIC_API_URL="$BACKEND_URL" NEXT_PUBLIC_SOCKET_URL="$BACKEND_URL" npm run build
NEXT_PUBLIC_API_URL="$BACKEND_URL" NEXT_PUBLIC_SOCKET_URL="$BACKEND_URL" npm run start &
sleep 3

echo "==> Starting frontend Cloudflare tunnel"
"$CLOUDFLARED" tunnel --url http://localhost:3000 --no-autoupdate > /tmp/cf-frontend.log 2>&1 &
sleep 8
FRONTEND_URL=$(rg -o 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/cf-frontend.log | tail -1)

echo ""
echo "============================================"
echo "  App:     $FRONTEND_URL/whatsapp/inbox"
echo "  Backend: $BACKEND_URL"
echo "============================================"
echo "Use production mode for tunnels (not npm run dev)."
