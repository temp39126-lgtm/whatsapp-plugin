#!/bin/sh
set -e

echo "Waiting for MongoDB..."
until wget -qO- http://mongodb:27017 >/dev/null 2>&1 || nc -z mongodb 27017 2>/dev/null; do
  sleep 2
done

if [ "${RUN_SEED_ON_START:-true}" = "true" ]; then
  echo "Running database seed (safe to re-run)..."
  node dist/utils/seed.js || echo "Seed skipped or already applied"
fi

exec "$@"
