#!/bin/bash
set -e

CONTAINER="dwahfy-core-postgres-1"

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "Error: container '${CONTAINER}' is not running."
  echo "Start it with: docker compose up -d"
  exit 1
fi

docker cp "$(dirname "$0")/create-fake-data.js" "${CONTAINER}:/app/scripts/create-fake-data.js"
docker exec "${CONTAINER}" node scripts/create-fake-data.js
