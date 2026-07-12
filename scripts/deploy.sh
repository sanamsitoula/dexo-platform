#!/bin/bash
# ==============================================================================
# OneDexo production deploy — runs ON THE AZURE VM, invoked over SSH by
# .github/workflows/ci.yml's `deploy` job. See docs/ci_cd.md for the full
# pipeline description.
#
# Idempotent: safe to re-run by hand for a manual redeploy.
# ==============================================================================
set -euo pipefail

PROJECT_ROOT="${DEXO_DEPLOY_PATH:-/var/www/dexo-platform}"
BRANCH="${DEXO_DEPLOY_BRANCH:-main}"

cd "$PROJECT_ROOT"

echo "==> Fetching $BRANCH..."
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "==> Installing dependencies..."
npm ci

echo "==> Generating Prisma client..."
npx prisma generate

echo "==> Applying database migrations..."
npx prisma migrate deploy

echo "==> Clearing Turbo build cache (avoids stale artifacts from before source changes)..."
rm -rf .turbo node_modules/.cache/turbo packages/*/.turbo apps/*/.turbo

echo "==> Building all workspaces..."
NEXT_TELEMETRY_DISABLED=1 npm run build

echo "==> Reloading PM2 process list (zero-downtime)..."
if pm2 describe dexo-api > /dev/null 2>&1; then
  pm2 reload ecosystem.config.js --update-env
else
  pm2 start ecosystem.config.js
  pm2 save
fi

echo "==> Deploy complete: $(git rev-parse --short HEAD)"
pm2 status
