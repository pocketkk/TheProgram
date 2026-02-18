#!/usr/bin/env bash
# ─── Add a new hosted instance of The Program ─────────────────────────────────
#
# Usage: ./deploy/add-instance.sh <name> <port>
# Example: ./deploy/add-instance.sh bob 8002
#
# What this script does:
#   1. Creates /opt/theprogram/data/<name>/
#   2. Generates a random SECRET_KEY and appends it to /opt/theprogram/.env
#   3. Hashes the instance password for Caddy
#   4. Prints the docker-compose.yml and Caddyfile snippets to paste in

set -euo pipefail

NAME=${1:?"Usage: $0 <name> <port>  (e.g. $0 bob 8002)"}
PORT=${2:?"Usage: $0 <name> <port>  (e.g. $0 bob 8002)"}
NAME_UPPER=$(echo "$NAME" | tr '[:lower:]' '[:upper:]')

DEPLOY_DIR="/opt/theprogram"
DATA_DIR="${DEPLOY_DIR}/data/${NAME}"
ENV_FILE="${DEPLOY_DIR}/.env"

# ── 1. Data directory ──────────────────────────────────────────────────────────
mkdir -p "$DATA_DIR"
echo "✓ Created ${DATA_DIR}"

# ── 2. Secret key ──────────────────────────────────────────────────────────────
SECRET_KEY=$(openssl rand -hex 32)
echo "${NAME_UPPER}_SECRET_KEY=${SECRET_KEY}" >> "$ENV_FILE"
echo "✓ Secret key written to ${ENV_FILE}"

# ── 3. Password hash ───────────────────────────────────────────────────────────
echo ""
echo "Enter a password for ${NAME} (input hidden):"
read -rs PASSWORD
echo ""

if ! command -v caddy &>/dev/null; then
  echo "⚠  caddy not found — skipping hash generation."
  echo "   Run this manually after installing Caddy:"
  echo "   caddy hash-password --plaintext \"<password>\""
  HASH="REPLACE_WITH_CADDY_HASH"
else
  HASH=$(caddy hash-password --plaintext "$PASSWORD")
  echo "✓ Password hashed"
fi

# ── 4. Print snippets ──────────────────────────────────────────────────────────
cat <<EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Add to docker-compose.yml (under services:)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ${NAME}:
    <<: *app-defaults
    environment:
      APP_ENV: production
      DEBUG: "false"
      FRONTEND_DIST: /app/dist
      EPHEMERIS_PATH: /app/backend/data/ephemeris
      USER_DATA_DIR: /data
      SECRET_KEY: \${${NAME_UPPER}_SECRET_KEY:?Set ${NAME_UPPER}_SECRET_KEY in .env}
    volumes:
      - ${DATA_DIR}:/data
    ports:
      - "127.0.0.1:${PORT}:8000"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Add to Caddyfile
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ${NAME}.theprogram.us {
      basicauth {
          ${NAME} ${HASH}
      }
      reverse_proxy localhost:${PORT}
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Apply changes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  cd ${DEPLOY_DIR}
  docker compose up -d ${NAME}
  caddy reload --config ${DEPLOY_DIR}/Caddyfile

EOF
