#!/usr/bin/env bash
set -euo pipefail

MONGO_BIN="/tmp/mongodb-linux-x86_64-ubuntu2204-7.0.16/bin/mongod"
MONGO_DATA="/tmp/mongo-data"
MONGO_LOG="/tmp/mongod.log"
MONGO_TGZ="/tmp/mongo.tgz"
MONGO_URL="https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu2204-7.0.16.tgz"

if pgrep -x mongod >/dev/null 2>&1; then
  echo "MongoDB already running"
  exit 0
fi

if [[ ! -x "$MONGO_BIN" ]]; then
  echo "Downloading MongoDB..."
  curl -fsSL "$MONGO_URL" -o "$MONGO_TGZ"
  tar -xzf "$MONGO_TGZ" -C /tmp
fi

mkdir -p "$MONGO_DATA"
"$MONGO_BIN" --dbpath "$MONGO_DATA" --port 27017 --bind_ip 127.0.0.1 --logpath "$MONGO_LOG" --fork
echo "MongoDB started on port 27017"
