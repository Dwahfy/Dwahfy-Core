#!/usr/bin/env bash
set -e

ENV_FILE="$(dirname "$0")/../.env"
KEY=$(openssl rand -hex 32)

echo "Generated key: $KEY"

if [ -f "$ENV_FILE" ]; then
  if grep -q "^ADMIN_API_KEY=" "$ENV_FILE"; then
    # Update existing entry
    sed -i "s|^ADMIN_API_KEY=.*|ADMIN_API_KEY=$KEY|" "$ENV_FILE"
    echo "Updated ADMIN_API_KEY in .env"
  else
    # Append new entry
    echo "" >> "$ENV_FILE"
    echo "# Admin" >> "$ENV_FILE"
    echo "ADMIN_API_KEY=$KEY" >> "$ENV_FILE"
    echo "Added ADMIN_API_KEY to .env"
  fi
else
  echo "ADMIN_API_KEY=$KEY" > "$ENV_FILE"
  echo "Created .env with ADMIN_API_KEY"
fi

echo ""
echo "Copy this key into your frontend .env as well:"
echo "  ADMIN_API_KEY=$KEY"
