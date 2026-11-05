#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$HOME/whatsapp-plugin"
COMPOSE="$ROOT/deploy/docker-compose.prod.yml"
DOCKERFILE="$ROOT/frontend/Dockerfile"
IGNORE="$ROOT/.dockerignore"
FRONTEND_IGNORE="$ROOT/frontend/.dockerignore"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

echo "=========================================="
echo " Fix frontend Docker build context"
echo "=========================================="

# Verify expected files exist.
for file in "$COMPOSE" "$DOCKERFILE" \
            "$ROOT/frontend/package.json" \
            "$ROOT/shared/constants/permissions.ts" \
            "$ROOT/shared/types/preferences.ts"; do
    if [[ ! -f "$file" ]]; then
        echo "ERROR: Required file not found: $file"
        exit 1
    fi
done

cd "$ROOT"

# Back up files before changing them.
cp "$COMPOSE" "$COMPOSE.backup-$TIMESTAMP"
cp "$DOCKERFILE" "$DOCKERFILE.backup-$TIMESTAMP"

if [[ -f "$IGNORE" ]]; then
    cp "$IGNORE" "$IGNORE.backup-$TIMESTAMP"
fi

if [[ -f "$FRONTEND_IGNORE" ]]; then
    cp "$FRONTEND_IGNORE" "$FRONTEND_IGNORE.backup-$TIMESTAMP"
fi

echo "[1/5] Backups created."

# Update only the frontend build configuration.
python3 - "$COMPOSE" <<'PY'
import re
import sys

path = sys.argv[1]
with open(path, encoding="utf-8") as f:
    content = f.read()

pattern = r'(?m)^  frontend:\n(?P<body>(?:(?!^  [A-Za-z0-9_-]+:).*\n)*)'

match = re.search(pattern, content)
if not match:
    raise SystemExit("ERROR: Could not locate frontend service in Compose file.")

body = match.group("body")

if re.search(r'(?m)^\s+context:\s*\.\.\s*$', body):
    print("Frontend build context already points to repository root.")
else:
    body_new, count = re.subn(
        r'(?m)^(\s+)context:\s*\.\./frontend\s*$',
        r'\1context: ..',
        body,
        count=1
    )
    if count != 1:
        raise SystemExit(
            "ERROR: Expected frontend context '../frontend' was not found. "
            "No Compose changes were made."
        )
    content = content[:match.start("body")] + body_new + content[match.end("body"):]

# Ensure Dockerfile path is relative to the repository-root context.
# Keep all other build args and frontend settings unchanged.
frontend_match = re.search(pattern, content)
body = frontend_match.group("body")
body_new, count = re.subn(
    r'(?m)^(\s+)dockerfile:\s*Dockerfile\s*$',
    r'\1dockerfile: frontend/Dockerfile',
    body,
    count=1
)
if count == 1:
    content = content[:frontend_match.start("body")] + body_new + content[frontend_match.end("body"):]
elif not re.search(r'(?m)^\s+dockerfile:\s*frontend/Dockerfile\s*$', body):
    raise SystemExit("ERROR: Could not safely update frontend Dockerfile path.")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
PY

echo "[2/5] Compose frontend build context updated."

# Rewrite the Dockerfile paths for the repository-root build context.
cat > "$DOCKERFILE" <<'DOCKER'
FROM node:20-alpine AS deps
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ ./
COPY shared/ ../shared/

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_PUBLIC_USER_SIGNUP_ENABLED=false

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_PUBLIC_USER_SIGNUP_ENABLED=$NEXT_PUBLIC_PUBLIC_USER_SIGNUP_ENABLED

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
DOCKER

echo "[3/5] Frontend Dockerfile updated."

# Exclude local dependencies and generated files from the root build context.
cat > "$IGNORE" <<'IGNORE'
.git
**/node_modules
**/.next
**/npm-debug.log*
IGNORE

# The frontend-specific ignore file remains harmless; preserve it.
echo "[4/5] Root .dockerignore updated."

# Validate Compose configuration without starting or stopping services.
cd "$ROOT/deploy"
docker compose --env-file .env -f docker-compose.prod.yml config -q

echo
echo "SUCCESS: Files updated and Compose configuration validated."
echo
echo "Backups use suffix: $TIMESTAMP"
echo
echo "Next, build the frontend with:"
echo "cd ~/whatsapp-plugin/deploy"
echo 'docker compose --env-file .env -f docker-compose.prod.yml build --no-cache frontend'
echo
echo "This script has NOT restarted production services."
