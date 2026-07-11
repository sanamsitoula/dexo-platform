#!/bin/bash
# ==============================================================================
#  Tail the most recent log for a Dexo service in real time (Linux/macOS port
#  of scripts/view-log.ps1).
#
#  Usage: scripts/view-log.sh <service> [-Err] [-Tail N]
#    scripts/view-log.sh api
#    scripts/view-log.sh tenant-admin -Err
#    scripts/view-log.sh platform-web -Tail 100
# ==============================================================================
set -e

SERVICE="$1"
shift || true
ERR_MODE=0
TAIL_N=50

while [ $# -gt 0 ]; do
  case "$1" in
    -Err|--err) ERR_MODE=1 ;;
    -Tail|--tail) shift; TAIL_N="$1" ;;
  esac
  shift
done

if [ -z "$SERVICE" ]; then
  echo "Usage: scripts/view-log.sh <service> [-Err] [-Tail N]"
  exit 1
fi

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

case "$SERVICE" in
  web) DIR_NAME=platform-web ;;
  admin) DIR_NAME=platform-admin ;;
  tenant-web) DIR_NAME=tenant-website ;;
  expo) DIR_NAME=expo-go ;;
  docker) DIR_NAME=orchestrator ;;
  *) DIR_NAME="$SERVICE" ;;
esac

LOG_DIR="$PROJECT_ROOT/logs/$DIR_NAME"

if [ ! -d "$LOG_DIR" ]; then
  echo "No log directory found for service '$SERVICE' (looked in: $LOG_DIR)"
  echo "Known services: api platform-web platform-admin tenant-website tenant-admin tenant-app mobile expo-go orchestrator"
  exit 1
fi

if [ "$ERR_MODE" = "1" ]; then
  LATEST=$(ls -t "$LOG_DIR"/*.err 2>/dev/null | head -1)
else
  LATEST=$(ls -t "$LOG_DIR"/*.out 2>/dev/null | head -1)
  [ -z "$LATEST" ] && LATEST=$(ls -t "$LOG_DIR"/*.log 2>/dev/null | head -1)
fi
[ -z "$LATEST" ] && LATEST=$(ls -t "$LOG_DIR"/* 2>/dev/null | head -1)

if [ -z "$LATEST" ]; then
  echo "No log files found in $LOG_DIR"
  exit 1
fi

echo "Service : $SERVICE"
echo "Tailing : $LATEST"
echo "Mode    : $([ "$ERR_MODE" = "1" ] && echo errors || echo stdout)  |  Press Ctrl+C to stop."
echo ""
tail -n "$TAIL_N" -f "$LATEST"
