# Dexo Platform — Setup and Run Guide

> ⚠️ **Superseded.** This is a pre-v5 guide; its `prisma/seed.ts` references
> a script that no longer exists — it was retired in favor of the single
> `scripts/seed/index.ts` pipeline (`npm run db:seed` / `npm run db:seed:v5`).
> Use **[RUN_GUIDE_v5.md](./RUN_GUIDE_v5.md)** instead; this file is kept for
> historical reference only.

## What Has Been Implemented

### Core Architecture
- Multi-tenant SaaS platform engine with tenant isolation
- Two-layer user system: Platform Admin + Tenant Users
- Monorepo structure with Turborepo
- Docker Compose with PostgreSQL, Redis, MinIO, MailHog

### 10 Premium Industry Themes ✅ NEW
Each tenant can select a theme during creation with custom colors, menu items, and features:
- 💪 Fitness Pro (Fitness Centers)
- 📚 EduSmart (Schools & Education)
- 🍕 FoodieHub (Restaurants & Cafes)
- 🛒 ShopCommerce (Ecommerce)
- 🚚 LogiTrack (Logistics & Delivery)
- ✂️ StyleTailor (Tailor Shops)
- 🎓 CoachAcademy (Coaching Institutes)
- 💇 BeautySalon (Salons & Spas)
- 🏨 StayHotel (Hotels & Hospitality)
- 🏥 MedicHealth (Healthcare)

### API Server (apps/api)
- NestJS-based API server on port 4000
- Swagger documentation at `/api/docs`
- All core modules integrated

### Core Modules
- **Auth**: JWT, register, login, refresh, email verification, password reset
- **Tenant**: CRUD, subdomain validation, status management, theme selection
- **User**: Profiles, invitations, CRUD
- **Role**: Role management, RBAC
- **Permission**: Fine-grained permissions with wildcard support
- **Subscription**: Plan management, lifecycle
- **Billing**: Mock Stripe implementation
- **Notification**: Templates, email sending
- **Files**: S3/MinIO integration
- **Settings**: Global + tenant-level settings
- **Audit Logging**: Comprehensive tracking
- **Queue Jobs**: BullMQ background processing

### Frontend Apps
- **Web App** (Port 3000): Tenant user interface — Login, Register, Dashboard, Profile, Workouts, Progress, Settings
- **Admin Dashboard** (Port 3001): Platform admin interface — Login, Dashboard, Tenants, Users, Roles, Reports, Settings, Theme Selection
- **Mobile Web** (Port 8081): Mobile-optimized web app with 8 screens

---

## Architecture: Two User Types

```
┌─────────────────────────────────────────────────────────────┐
│                    PLATFORM LAYER                            │
│                                                              │
│  Dexo Platform Admin                                        │
│  • Creates/manages tenants                                  │
│  • Manages platform users                                   │
│  • System-wide settings                                     │
│  • Subscription & billing                                   │
│  • Cross-tenant reports                                     │
│  • Theme management for tenants                             │
│                                                              │
│  App: Admin Dashboard (Port 3001)                           │
├─────────────────────────────────────────────────────────────┤
│                    TENANT LAYER                              │
│                                                              │
│  Tenant Admin → Staff/Trainer → Member/Customer             │
│                                                              │
│  App: Web App (Port 3000)                                   │
│  App: Mobile Web (Port 8081)                                │
└─────────────────────────────────────────────────────────────┘
```

**Platform Admin** manages the entire Dexo platform (all tenants).
**Tenant Users** are business-specific roles within a single tenant (e.g., gym owner, trainer, member).

---

## Prerequisites

### Option 1: Docker (Recommended)
- Docker Desktop installed and running
- Ports 5433, 6379, 9000, 9001, 1025, 8025, 3000, 3001, 4000, 8081 available

### Option 2: Local Services
- PostgreSQL 14+ installed and running
- Redis installed and running
- Node.js 18+ installed
- npm 9+ installed

---

## Setup Instructions

### Quick Start (Docker)

```bash
# 1. Navigate to project
cd d:\claude_project\General\Dexo

# 2. Install dependencies
npm install

# 3. Start Docker services
docker-compose -f docker-compose.dev.yml up -d

# 4. Set up environment
cp .env.example .env

# 5. Set up database
npx prisma db push
npx ts-node --transpile-only prisma/seed.ts

# 6. Start all services
npm run dev
```

### Access Points

| Service | Port | URL |
|---------|------|-----|
| Web App (Tenant Users) | 3000 | http://localhost:3000 |
| Admin Dashboard (Platform Admin) | 3001 | http://localhost:3001 |
| API Server | 4000 | http://localhost:4000 |
| Swagger Docs | 4000 | http://localhost:4000/api/docs |
| PostgreSQL | 5433 | localhost:5433 |
| Redis | 6379 | localhost:6379 |
| MinIO (S3) | 9000 | http://localhost:9000 |
| MinIO Console | 9001 | http://localhost:9001 |
| MailHog | 8025 | http://localhost:8025 |

---

## Demo Credentials

### Platform Admin (Admin Dashboard — Port 3001)

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Platform Admin | `admin@fitnessapp.com` | `Admin123!` | Full platform management |

### Tenant Users (Web App — Port 3000)

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Tenant Admin | `admin@fitnessapp.com` | `Admin123!` | Full tenant management |
| Trainer | `trainer@fitnessapp.com` | `Trainer123!` | Member management, schedules |
| Member | `member@fitnessapp.com` | `Member123!` | Profile, workouts, progress |

---

## Testing the API

### Using Swagger UI
1. Navigate to http://localhost:4000/api/docs
2. Click "Authorize" and enter a JWT token (obtained from login)
3. Try out endpoints

### Using cURL

**Login:**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fitnessapp.com","password":"Admin123!"}'
```

**Register new user:**
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com","password":"Password123!","firstName":"New","lastName":"User"}'
```

**Get dashboard stats:**
```bash
curl -X GET http://localhost:4000/api/dashboard/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Development Workflow

```bash
# Start everything
npm run dev                    # Start all apps + API

# Database operations
npx prisma studio              # Open Prisma Studio (view data)
npx prisma db push             # Push schema changes
npx ts-node --transpile-only prisma/seed.ts   # Re-seed database

# Code quality
npm run lint                   # Check code style
npm run type-check             # Check types

# Stop
Ctrl+C                         # Stop all services
```

---

## Supported Business Types

Dexo is designed to power any multi-tenant business:

| Industry | Use Case |
|----------|----------|
| Fitness Centers | Member management, workout tracking, trainer scheduling |
| Schools & Education | Student enrollment, attendance, grades, parent portals |
| Restaurants & Cafes | Order management, table reservations, menu management |
| Ecommerce | Product catalogs, inventory, orders, customer management |
| Logistics & Delivery | Fleet tracking, route optimization, shipment management |
| Tailor Shops | Order tracking, measurements, fabric inventory |
| Coaching Institutes | Batch scheduling, student progress, fee management |
| Salons & Spas | Appointment booking, stylist management, service catalogs |
| Hotels & Hospitality | Room booking, guest management, housekeeping |
| Healthcare | Patient records, appointment scheduling, clinic management |
| SMEs & Startups | Team management, project tracking, invoicing |
| NGOs | Donor management, project tracking, volunteer coordination |

---

## Troubleshooting

### Docker Issues
- **"Docker daemon not running"**: Start Docker Desktop
- **Port conflicts**: Check ports 5433, 6379, 9000, 3000, 3001, 4000 are not in use
- **Container won't start**: Run `docker-compose -f docker-compose.dev.yml logs` to check errors

### Database Issues
- **"Connection refused"**: Ensure PostgreSQL is running on port 5433
- **"Database does not exist"**: Database is auto-created by Docker
- **Schema sync issues**: Run `npx prisma db push`

### API Issues
- **"Module not found"**: Run `npm install` in the project root
- **Port 4000 in use**: Change PORT in `.env` file
- **Password validation**: Requires uppercase + lowercase + number, 8+ chars

---

## Next Steps

### For Production
1. Configure real Stripe API keys
2. Set up production SMTP/SendGrid
3. Configure AWS S3 or production MinIO
4. Set up CI/CD pipeline
5. Run security audit
6. Performance testing

### For Development
1. Run `docker-compose -f docker-compose.dev.yml up -d`
2. Run `npx prisma db push`
3. Run `npx ts-node --transpile-only prisma/seed.ts`
4. Run `npm run dev`
5. Access web app at http://localhost:3000
6. Access admin app at http://localhost:3001
7. Access API docs at http://localhost:4000/api/docs

---

## Support

- Check [README.md](./README.md) for project overview
- Check [TODO.md](./TODO.md) for implementation status
- Check API docs at http://localhost:4000/api/docs
