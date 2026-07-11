#!/bin/bash
# ==============================================================================
#  Dexo Platform v5 - Stop all dev servers and free locked ports (Linux/macOS
#  port of stop.bat)
# ==============================================================================
#  Kills every background app started by run.sh (API, web apps, mobile) and
#  frees the locked ports. Docker services (postgres/redis/minio/mailhog) are
#  LEFT RUNNING so you don't lose data. Run:
#    docker stop dexo-postgres dexo-redis dexo-minio dexo-mailhog
#  to stop those too.
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo ""
echo "========================================"
echo "  Dexo Platform v5 - Stopping servers"
echo "========================================"
echo ""

# 1) Kill via recorded PID files from start-app.sh
echo "[INFO] Stopping apps via recorded PIDs..."
for pidfile in logs/*/*.pid; do
  [ -f "$pidfile" ] || continue
  PID=$(cat "$pidfile" 2>/dev/null)
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    kill -9 "$PID" 2>/dev/null || true
  fi
  rm -f "$pidfile"
done

# 2) Kill any turbo/npm dev process tree started for this project (covers
#    `npm run dev` / `turbo run dev` sessions not started via start-app.sh)
echo "[INFO] Stopping project node processes..."
pkill -9 -f "turbo run dev" 2>/dev/null || true
pkill -9 -f "$PROJECT_ROOT.*next dev" 2>/dev/null || true
pkill -9 -f "$PROJECT_ROOT.*ts-node.*src/main.ts" 2>/dev/null || true
pkill -9 -f "$PROJECT_ROOT/apps/mobile" 2>/dev/null || true

# 3) Free the locked ports by killing whatever is still listening on them
echo "[INFO] Freeing locked ports (3001 3002 4000 4005 4006 4007 8081)..."
for PORT in 3001 3002 4000 4005 4006 4007 8081; do
  PIDS=$(ss -ltnp "( sport = :$PORT )" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | sort -u)
  if [ -n "$PIDS" ]; then kill -9 $PIDS 2>/dev/null || true; fi
done

sleep 2

# 4) Report final port status
echo ""
echo "[INFO] Port status after stop:"
ANY=0
for PORT in 3001 3002 4000 4005 4006 4007 8081; do
  if ss -ltn "( sport = :$PORT )" 2>/dev/null | grep -q LISTEN; then
    echo "    :$PORT  STILL IN USE"
    ANY=1
  fi
done
[ "$ANY" = "0" ] && echo "    All Dexo ports are free."

echo ""
echo "[INFO] Docker services left running (data preserved):"
docker ps --filter "name=dexo-" --format "     {{.Names}}  ({{.Status}})" 2>/dev/null

echo ""
echo "Done. Run ./run.sh to start again."
echo ""
