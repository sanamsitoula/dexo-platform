#!/bin/bash
# ==============================================================================
#  Dexo Platform v5 - Linux/macOS Startup Script
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
#  In dev: set DEV_TENANT=vrfitness|spicegarden or use X-Dev-Tenant header
#
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "========================================"
echo "  Dexo Platform v5 - Development Server"
echo "========================================"
echo ""

# Node.js check
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

# Install deps if needed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}[INFO]${NC} Installing dependencies..."
    npm install
    echo ""
fi

# .env fallback — .env.example matches docker-compose.yml (Postgres :5433, db "dexo")
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}[WARNING]${NC} .env not found — copying .env.example"
    cp .env.example .env
    echo ""
fi

# Infrastructure (Postgres 5433, Redis, MinIO, MailHog) via Docker
if command -v docker &> /dev/null; then
    echo -e "${BLUE}[INFO]${NC} Starting infrastructure containers..."
    docker compose up -d postgres redis minio mailhog 2>/dev/null || docker-compose up -d postgres redis minio mailhog
    echo -e "${BLUE}[INFO]${NC} Waiting for PostgreSQL..."
    for i in $(seq 1 30); do
        if docker exec dexo-postgres pg_isready -U postgres > /dev/null 2>&1; then
            echo -e "${GREEN}[OK]${NC} PostgreSQL is ready."
            break
        fi
        sleep 2
    done
else
    echo -e "${YELLOW}[WARNING]${NC} Docker not found — make sure Postgres (:5433), Redis, MinIO and MailHog are running."
fi
echo ""

# Database: client, migrations, v5 seed (idempotent)
echo -e "${BLUE}[INFO]${NC} Prisma generate + migrate deploy..."
npx prisma generate > /dev/null
npx prisma migrate deploy
echo -e "${BLUE}[INFO]${NC} Seeding v5 demo data (idempotent)..."
npm run db:seed:v5 || echo -e "${YELLOW}[WARN]${NC} Seed failed (continuing)"

# Kill anything on our ports
echo -e "${BLUE}[INFO]${NC} Cleaning up ports..."
for PORT in 3001 3002 4000 4005 4006 4007 8081; do
    PID=$(lsof -ti tcp:$PORT 2>/dev/null || true)
    if [ -n "$PID" ]; then kill -9 $PID 2>/dev/null || true; fi
done
echo -e "${BLUE}[INFO]${NC} Ports cleared."

# Start dev server
echo -e "${GREEN}[INFO]${NC} Starting development server..."
echo ""
echo "========================================"
echo "  APPLICATIONS (v5 port map):"
echo "    :3001  Platform Web (marketing)"
echo "    :3002  Platform Admin (staff)"
echo "    :4005  Tenant Website (public)"
echo "    :4006  Tenant Admin (owner/staff)"
echo "    :4007  Tenant App (customer)"
echo "    :4000  API"
echo "    :8081  Mobile (Expo)"
echo "========================================"
echo ""
echo "Set DEV_TENANT=vrfitness|spicegarden before starting tenant apps."
echo ""

npm run dev
