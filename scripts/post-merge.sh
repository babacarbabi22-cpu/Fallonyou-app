#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Keep the hook deterministic and safe when it is run without a terminal.
export CI="${CI:-1}"

echo "[post-merge] Installing locked dependencies"
npm ci --no-audit --no-fund --ignore-scripts

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "[post-merge] Synchronizing database schema"
  # Do not pass --force: Drizzle must stop rather than approve a destructive
  # change without an explicit review.
  npm run db:push
else
  echo "[post-merge] DATABASE_URL is not set; skipping database synchronization"
fi

echo "[post-merge] Building application"
npm run build

echo "[post-merge] Setup complete"