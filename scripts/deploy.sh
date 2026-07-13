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

# `pm2 reload`/`start` return as soon as PM2 has been told to (re)spawn the
# process — they do NOT wait for the app to actually come up. A migration or
# build can succeed while the API still crashes on boot (bad env var, DB
# permission issue, etc.), which would otherwise leave this script exiting 0
# and CI reporting green on a broken deploy. Poll the health endpoint before
# declaring success.
echo "==> Verifying API health..."
API_HEALTHY=0
for i in $(seq 1 15); do
  if curl -fsS "http://127.0.0.1:4000/api/health" 2>/dev/null | grep -q '"status":"ok"'; then
    API_HEALTHY=1
    break
  fi
  sleep 2
done

if [ "$API_HEALTHY" -ne 1 ]; then
  echo "==> [FATAL] API failed to become healthy after reload. Rolling back is NOT automatic — investigate now."
  echo "==> Last 50 lines of dexo-api logs:"
  pm2 logs dexo-api --lines 50 --nostream || true
  pm2 status
  exit 1
fi

echo "==> Deploy complete: $(git rev-parse --short HEAD)"
pm2 status
