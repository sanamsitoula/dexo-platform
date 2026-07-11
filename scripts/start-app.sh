#!/bin/bash
# ==============================================================================
#  Start a single Dexo app with reliable file logging (Linux/macOS port of
#  scripts/start-app.ps1). Used by run.sh to launch each app as an independent
#  background process with its own timestamped .out/.err log and .pid file.
#
#  Usage: scripts/start-app.sh <app>
#    api | platform-web | platform-admin | tenant-website | tenant-admin |
#    tenant-app | mobile | expo-go
# ==============================================================================
set -e

APP="$1"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
LOG_DIR="$PROJECT_ROOT/logs/$APP"
mkdir -p "$LOG_DIR"
LOG_BASE="$LOG_DIR/$APP-$TIMESTAMP.log"
LOG_OUT="$LOG_BASE.out"
LOG_ERR="$LOG_BASE.err"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }

case "$APP" in
  api)              PORT=4000 ;;
  platform-web|web) PORT=3001 ;;
  platform-admin|admin) PORT=3002 ;;
  tenant-website)   PORT=4005 ;;
  tenant-admin)     PORT=4006 ;;
  tenant-app)       PORT=4007 ;;
  mobile|expo-go)   PORT=8081 ;;
  *) log "Unknown app: $APP"; exit 1 ;;
esac

# Kill anything already listening on the port so we get a clean start.
# NOTE: `lsof -ti tcp:$PORT` is unreliable in some sandboxed environments
# (silently returns nothing for sockets it can't attribute) — `ss -ltnp`
# resolves them correctly, so use that instead.
if [ -n "$PORT" ]; then
  PIDS=$(ss -ltnp "( sport = :$PORT )" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | sort -u)
  if [ -n "$PIDS" ]; then kill -9 $PIDS 2>/dev/null || true; fi
  sleep 0.3
fi

log "Starting $APP on port $PORT"
log "Log file: $LOG_OUT / $LOG_ERR"

# Resolve the Next.js binary: prefer the app's own node_modules (so a v14 app
# doesn't get run by the hoisted v13 binary), falling back to the workspace root.
next_bin() {
  local app_dir="$1"
  if [ -f "$app_dir/node_modules/next/dist/bin/next" ]; then
    echo "$app_dir/node_modules/next/dist/bin/next"
  else
    echo "$PROJECT_ROOT/node_modules/next/dist/bin/next"
  fi
}

WORK_DIR="$PROJECT_ROOT"
CMD=()

case "$APP" in
  api)
    CMD=(node "$PROJECT_ROOT/node_modules/ts-node/dist/bin.js" --transpile-only "$PROJECT_ROOT/apps/api/src/main.ts")
    ;;
  platform-web|web)
    WORK_DIR="$PROJECT_ROOT/apps/platform-web"
    CMD=(node "$(next_bin "$WORK_DIR")" dev -p 3001)
    ;;
  platform-admin|admin)
    WORK_DIR="$PROJECT_ROOT/apps/platform-admin"
    CMD=(node "$(next_bin "$WORK_DIR")" dev -p 3002)
    ;;
  tenant-website)
    WORK_DIR="$PROJECT_ROOT/apps/tenant-website"
    CMD=(node "$(next_bin "$WORK_DIR")" dev -p 4005)
    ;;
  tenant-admin)
    WORK_DIR="$PROJECT_ROOT/apps/tenant-admin"
    CMD=(node "$(next_bin "$WORK_DIR")" dev -p 4006)
    ;;
  tenant-app)
    WORK_DIR="$PROJECT_ROOT/apps/tenant-app"
    CMD=(node "$(next_bin "$WORK_DIR")" dev -p 4007)
    ;;
  mobile)
    WORK_DIR="$PROJECT_ROOT/apps/mobile"
    CMD=(node "$PROJECT_ROOT/node_modules/expo/bin/cli" start --lan --port 8081 --no-dev)
    ;;
  expo-go)
    WORK_DIR="$PROJECT_ROOT/apps/mobile"
    CMD=(node "$PROJECT_ROOT/node_modules/expo/bin/cli" start --tunnel --port 8081)
    ;;
esac

cd "$WORK_DIR"
nohup "${CMD[@]}" > "$LOG_OUT" 2> "$LOG_ERR" &
APP_PID=$!
disown

# Persist the PID so stop.sh can kill the exact process later.
echo "$APP_PID" > "$LOG_DIR/$APP.pid"

log "Started (PID $APP_PID)"
log "Tail: tail -f '$LOG_OUT'"
log "Err:  tail -f '$LOG_ERR'"
