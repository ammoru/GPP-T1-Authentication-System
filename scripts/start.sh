#!/usr/bin/env bash
set -euo pipefail

# ensure TZ=UTC
export TZ=${TZ:-UTC}
export DATA_DIR=${DATA_DIR:-/data}

# Start cron daemon (distribution-friendly startup)
if command -v service >/dev/null 2>&1; then
  service cron start || /etc/init.d/cron start || cron
else
  cron || true
fi

# Ensure data directories exist
mkdir -p "${DATA_DIR}" /cron
chmod 755 "${DATA_DIR}" /cron

echo "Starting Node server (0.0.0.0:8080) with DATA_DIR=${DATA_DIR}"
exec node /app/index.js
