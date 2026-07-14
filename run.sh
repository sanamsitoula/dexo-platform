#!/bin/bash
# ==============================================================================
#  Dexo Platform v5 - Linux/macOS Startup Script (parity port of run.bat)
# ==============================================================================
#
#  LOCKED PORT MAP (v5):
#    :3001  apps/platform-web       Platform marketing + sign-up
#    :3002  apps/platform-admin     Platform staff panel
#    :4000  apps/api                Shared API
#    :4005  apps/tenant-website     Tenant public website
#    :4006  apps/tenant-admin       Tenant owner + staff portal
#    :4007  apps/tenant-app         Tenant customer-facing app
#    :8081  apps/mobile             Expo mobile
#    :5433  PostgreSQL
#    :6379  Redis
#    :9000  MinIO
#    :8025  MailHog
#
#  TENANT RESOLUTION: hostname middleware (NEVER [subdomain] URL segments)
#  In dev: use DEV_TENANT env var (e.g. vrfitness, spicegarden), the
#  X-Dev-Tenant header, or open a tenant subdomain directly — modern browsers
#  resolve *.localhost to 127.0.0.1 automatically, e.g.:
#    http://vrfitness.localhost:4005    http://spicegarden.localhost:4005
#
# ==============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)

echo ""
echo "========================================"
echo "  Dexo Platform v5 - Development Server"
echo "  Session: $TIMESTAMP"
echo "========================================"
echo ""

for d in orchestrator api platform-web platform-admin tenant-website tenant-admin tenant-app mobile expo-go; do
  mkdir -p "logs/$d"
done

# ============================================
#  Rotate old logs — keep only the newest 50 files per service directory.
#  Runs BEFORE this session writes anything, so it never touches today's
#  about-to-be-created log files, only leftovers from previous runs.
# ============================================
echo -e "${BLUE}[INFO]${NC} Rotating old logs (keeping newest 50 per service)..."
for d in orchestrator api platform-web platform-admin tenant-website tenant-admin tenant-app mobile expo-go; do
  ls -t "logs/$d"/*.log "logs/$d"/*.log.out "logs/$d"/*.log.err 2>/dev/null | tail -n +51 | xargs -r rm -f
done
echo -e "${BLUE}[INFO]${NC} Log rotation done."
echo ""

ORCHESTRATOR_LOG="logs/orchestrator/orchestrator-$TIMESTAMP.log"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Dexo Platform v5 - Startup initiated" > "$ORCHESTRATOR_LOG"

# ============================================
#  Prerequisite checks
# ============================================
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed${NC}"
    echo "Please install Node.js >= 18.0.0"
    exit 1
fi
echo -e "${BLUE}[INFO]${NC} Node.js version: $(node --version)"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}[ERROR] npm is not installed${NC}"
    exit 1
fi
echo -e "${BLUE}[INFO]${NC} npm version: $(npm --version)"

NODE_VERSION=$(node -e 'console.log(process.version.split("v")[1].split(".")[0])')
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${YELLOW}[WARNING]${NC} Node.js version 18+ recommended (current: $(node --version))"
fi
echo ""

if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERROR] Docker is not installed.${NC}"
    exit 1
fi
if ! docker info &> /dev/null; then
    echo -e "${RED}[ERROR] Docker is not running.${NC}"
    echo "Please start Docker and try again."
    exit 1
fi
echo -e "${BLUE}[INFO]${NC} Docker is running."
echo ""

# ============================================
#  Start Docker Services
# ============================================
echo -e "${BLUE}[INFO]${NC} Starting infrastructure containers..."
DOCKER_LOG="logs/orchestrator/docker-$TIMESTAMP.log"
(docker compose up -d postgres redis minio mailhog 2>/dev/null || docker-compose up -d postgres redis minio mailhog) >> "$DOCKER_LOG" 2>&1
echo -e "${BLUE}[INFO]${NC} All Docker services started."
echo ""

echo -e "${BLUE}[INFO]${NC} Waiting for PostgreSQL..."
for i in $(seq 1 30); do
    if docker exec dexo-postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "${GREEN}[OK]${NC} PostgreSQL is ready."
        break
    fi
    sleep 2
done
echo ""

# ============================================
#  Install dependencies if needed
# ============================================
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}[INFO]${NC} Installing dependencies..."
    npm install
    echo ""
fi

# ============================================
#  Create .env if missing
# ============================================
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}[WARNING]${NC} .env not found — copying .env.example"
        cp .env.example .env
    else
        echo -e "${BLUE}[INFO]${NC} Creating .env file..."
        cat > .env <<'EOF'
# Dexo Platform v5 Environment Variables
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/dexo
JWT_SECRET=dev-jwt-secret-key-change-in-production
REDIS_URL=redis://localhost:6379
USE_MINIO=true
MINIO_ENDPOINT=http://localhost:9000
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
S3_BUCKET=dexo-uploads
SMTP_HOST=localhost
SMTP_PORT=1025
NODE_ENV=development
# Default dev tenant
DEV_TENANT=vrfitness
EOF
    fi
    echo -e "${BLUE}[INFO]${NC} Created .env file."
    echo ""
fi

# ============================================
#  Ensure 'dexo' database exists (matches .env)
# ============================================
echo -e "${BLUE}[INFO]${NC} Ensuring database 'dexo' exists..."
DB_EXISTS=$(docker exec dexo-postgres psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='dexo'" 2>/dev/null || true)
if [ "$DB_EXISTS" != "1" ]; then
    echo -e "${BLUE}[INFO]${NC} Database 'dexo' not found - creating..."
    docker exec dexo-postgres psql -U postgres -c "CREATE DATABASE dexo" >> "$ORCHESTRATOR_LOG" 2>&1 \
        && echo -e "${BLUE}[INFO]${NC} Database 'dexo' created." \
        || echo -e "${RED}[ERROR]${NC} Failed to create database 'dexo'."
fi
echo ""

# ============================================
#  Apply Prisma schema (creates tables)
#  NOTE: `prisma migrate deploy` is a silent no-op when prisma/migrations has
#  no real migration folders (only migration_lock.toml) — this repo ships
#  without checked-in migrations, so fall back to `db push` in that case,
#  otherwise a fresh clone seeds against a database with zero tables.
# ============================================
echo -e "${BLUE}[INFO]${NC} Preparing database schema..."
npx prisma generate >> "$ORCHESTRATOR_LOG" 2>&1
HAS_MIGRATIONS=$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
if [ "$HAS_MIGRATIONS" -gt 0 ]; then
    echo -e "${BLUE}[INFO]${NC} Applying migrations (prisma migrate deploy)..."
    if ! npx prisma migrate deploy >> "$ORCHESTRATOR_LOG" 2>&1; then
        echo -e "${RED}[ERROR]${NC} Migration failed. Last 20 log lines:"
        tail -20 "$ORCHESTRATOR_LOG"
        echo -e "${YELLOW}[WARN]${NC} Continuing startup, but DB-dependent apps will fail."
    else
        echo -e "${BLUE}[INFO]${NC} Migrations applied."
    fi
else
    echo -e "${YELLOW}[WARN]${NC} No migrations found in prisma/migrations — syncing schema with 'prisma db push'."
    if ! npx prisma db push --accept-data-loss >> "$ORCHESTRATOR_LOG" 2>&1; then
        echo -e "${RED}[ERROR]${NC} db push failed. Last 20 log lines:"
        tail -20 "$ORCHESTRATOR_LOG"
        echo -e "${YELLOW}[WARN]${NC} Continuing startup, but DB-dependent apps will fail."
    else
        echo -e "${BLUE}[INFO]${NC} Schema synced."
    fi
fi
echo ""

# ============================================
#  Seed v5 demo data (platform admin + tenants + users)
# ============================================
echo -e "${BLUE}[INFO]${NC} Seeding v5 demo data (idempotent)..."
if ! npm run db:seed:v5 >> "$ORCHESTRATOR_LOG" 2>&1; then
    echo -e "${RED}[ERROR]${NC} Seed failed. Last 20 log lines:"
    tail -20 "$ORCHESTRATOR_LOG"
    echo -e "${YELLOW}[WARN]${NC} Seed failed (continuing). Full log: $ORCHESTRATOR_LOG"
else
    echo -e "${GREEN}[OK]${NC} Seed complete: vrfitness + spicegarden tenants ready."
fi
echo ""

# ============================================
#  Kill any existing processes on all v5 ports
# ============================================
echo -e "${BLUE}[INFO]${NC} Cleaning up old processes..."
for PORT in 3001 3002 4000 4005 4006 4007 8081; do
    PIDS=$(ss -ltnp "( sport = :$PORT )" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | sort -u)
    if [ -n "$PIDS" ]; then kill -9 $PIDS 2>/dev/null || true; fi
done
sleep 1
echo -e "${BLUE}[INFO]${NC} Ports cleared."
echo ""

# ============================================
#  check_app <name> <port> <log-out> <log-err>
#  Verifies the app is listening on its port; prints log tails on failure.
# ============================================
check_app() {
  local name="$1" port="$2" log_out="$3" log_err="$4"
  echo ""
  echo "[CHECK] $name on port $port ..."
  if ss -ltn "( sport = :$port )" 2>/dev/null | grep -q LISTEN; then
    echo -e "${GREEN}[OK]${NC}    $name is listening on port $port."
  else
    echo -e "${RED}[ERROR]${NC} $name is NOT responding on port $port."
    if [ -f "$log_err" ]; then
      echo "--- error log tail ($log_err) ---"
      tail -15 "$log_err"
    fi
    if [ -f "$log_out" ]; then
      echo "--- stdout log tail ($log_out) ---"
      tail -15 "$log_out"
    fi
    echo ""
    echo "[TIP] Tail live with: scripts/view-log.sh <service> -Err"
  fi
}

latest_log() {
  ls -t "logs/$1/$1-"*.log."$2" 2>/dev/null | head -1
}

# ============================================
#  Start each app via start-app.sh
# ============================================
echo -e "${GREEN}[INFO]${NC} Starting Dexo apps..."

echo -e "${BLUE}[INFO]${NC} Checking port 4000 for a stale API process..."
API_PIDS=$(ss -ltnp "( sport = :4000 )" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | sort -u)
if [ -n "$API_PIDS" ]; then
    echo -e "${BLUE}[INFO]${NC} Killing stale process(es) on port 4000: $API_PIDS"
    kill -9 $API_PIDS 2>/dev/null || true
    sleep 2
fi
echo -e "${BLUE}[INFO]${NC} Port 4000 is free."

echo -e "${BLUE}[INFO]${NC} Starting API Server on port 4000..."
scripts/start-app.sh api
sleep 18
API_LOG_OUT="$(latest_log api out)"
API_LOG_ERR="$(latest_log api err)"
check_app "API Server" 4000 "$API_LOG_OUT" "$API_LOG_ERR"

# Hard-stop the whole boot if the API never came up on its port — every
# other app depends on it, so continuing just cascades failures downstream.
if ! ss -ltn "( sport = :4000 )" 2>/dev/null | grep -q LISTEN; then
    echo -e "${RED}[FATAL]${NC} API Server failed to start on port 4000. Aborting startup here."
    echo -e "${RED}[FATAL]${NC} See logs: $API_LOG_OUT / $API_LOG_ERR"
    exit 1
fi

# Hard-stop if the API log recorded a real error. "Failed to check bucket"
# is a known benign MinIO race on cold start and is excluded so it doesn't
# trigger a false abort.
if [ -f "$API_LOG_ERR" ] && grep -i "error" "$API_LOG_ERR" | grep -qv "Failed to check bucket"; then
    echo -e "${RED}[FATAL]${NC} Error(s) detected in the API log. Aborting startup here."
    echo -e "${RED}[FATAL]${NC} Last 30 lines of $API_LOG_ERR:"
    tail -30 "$API_LOG_ERR"
    exit 1
fi

echo -e "${BLUE}[INFO]${NC} Starting Platform Web (port 3001)..."
scripts/start-app.sh platform-web
sleep 12
check_app "Platform Web" 3001 "$(latest_log platform-web out)" "$(latest_log platform-web err)"

echo -e "${BLUE}[INFO]${NC} Starting Platform Admin (port 3002)..."
scripts/start-app.sh platform-admin
sleep 12
check_app "Platform Admin" 3002 "$(latest_log platform-admin out)" "$(latest_log platform-admin err)"

echo -e "${BLUE}[INFO]${NC} Starting Tenant Website (port 4005)..."
scripts/start-app.sh tenant-website
sleep 10
check_app "Tenant Website" 4005 "$(latest_log tenant-website out)" "$(latest_log tenant-website err)"

echo -e "${BLUE}[INFO]${NC} Starting Tenant Admin (port 4006)..."
scripts/start-app.sh tenant-admin
sleep 10
check_app "Tenant Admin" 4006 "$(latest_log tenant-admin out)" "$(latest_log tenant-admin err)"

echo -e "${BLUE}[INFO]${NC} Starting Tenant App (port 4007)..."
scripts/start-app.sh tenant-app
sleep 10
check_app "Tenant App" 4007 "$(latest_log tenant-app out)" "$(latest_log tenant-app err)"

echo -e "${BLUE}[INFO]${NC} Starting Mobile (Expo) on port 8081..."
scripts/start-app.sh mobile
sleep 20
check_app "Mobile (Expo)" 8081 "$(latest_log mobile out)" "$(latest_log mobile err)"

# ============================================
#  Show Status
# ============================================
echo ""
echo "========================================"
echo "  All Services Started (v5)"
echo "  Session: $TIMESTAMP"
echo "========================================"
echo ""
echo "  PLATFORM (locked port map):"
echo "    Platform Web (marketing):  http://localhost:3001   (admin@test.com)"
echo "    Platform Admin (staff):    http://localhost:3002   (admin@test.com)"
echo "    API Server:                http://localhost:4000"
echo "    Swagger Docs:               http://localhost:4000/api/docs"
echo ""
echo "  DEFAULT TENANT (vrfitness — via DEV_TENANT):"
echo "    Tenant Website (public):   http://localhost:4005   (admin@vrfitness.com)"
echo "    Tenant Admin (owner):      http://localhost:4006/admin   (admin@vrfitness.com)"
echo "    Tenant App (customer):     http://localhost:4007/portal (member1@vrfitness.com)"
echo ""
echo "  SUBDOMAIN-BASED TENANT ACCESS (no DEV_TENANT restart needed —"
echo "  browsers resolve *.localhost to 127.0.0.1 automatically):"
echo "    http://vrfitness.localhost:4005     http://spicegarden.localhost:4005"
echo "    http://vrfitness.localhost:4006/admin   http://vrfitness.localhost:4007/portal"
echo "    (tenant-admin/tenant-app resolve their tenant from the host's first label)"
echo ""
echo "  Mobile (Expo):                http://localhost:8081   | Scan QR with Expo Go"
echo ""
echo "  DOCKER SERVICES:"
echo "    PostgreSQL:     localhost:5433"
echo "    Redis:          localhost:6379"
echo "    MinIO (S3):     http://localhost:9000"
echo "    MinIO Console:  http://localhost:9001"
echo "    MailHog:        http://localhost:8025"
echo ""
echo "========================================"
echo ""
echo "  LOGS LOCATION: ./logs/"
echo "    api/ platform-web/ platform-admin/ tenant-website/ tenant-admin/"
echo "    tenant-app/ mobile/ orchestrator/"
echo "  Each log file: logs/<service>/<service>-$TIMESTAMP.log.out (.err for stderr)"
echo "  Servers run as background processes. Stop them with: ./stop.sh"
echo ""
echo "========================================"
echo ""
echo "  Demo Credentials (v5):"
echo "    Platform Admin: admin@test.com              / Admin@123"

echo "  To view live logs:  scripts/view-log.sh api"
echo "  services: api platform-web platform-admin tenant-website tenant-admin tenant-app mobile orchestrator"
echo "  add -Err to tail error logs, e.g. scripts/view-log.sh api -Err"
echo ""

# Best-effort browser open (no-op on a headless server).
if command -v xdg-open &> /dev/null; then
  for url in http://localhost:3001 http://localhost:3002 http://localhost:4005 http://localhost:4006/admin http://localhost:4007/portal http://localhost:4000/api/docs; do
    xdg-open "$url" >/dev/null 2>&1 &
  done
  echo "Browsers opened (or attempted — no-op on headless servers)."
elif command -v open &> /dev/null; then
  for url in http://localhost:3001 http://localhost:3002 http://localhost:4005 http://localhost:4006/admin http://localhost:4007/portal http://localhost:4000/api/docs; do
    open "$url" >/dev/null 2>&1 &
  done
  echo "Browsers opened."
fi
echo ""
