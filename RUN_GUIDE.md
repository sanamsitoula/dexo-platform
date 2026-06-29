# 🚀 How to Run Dexo Platform - Complete Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start (One Command)](#quick-start)
3. [Manual Setup (Step-by-Step)](#manual-setup)
4. [Demo Credentials](#demo-credentials)
5. [Creating a New Tenant](#creating-a-new-tenant)
6. [Access URLs](#access-urls)
7. [Troubleshooting](#troubleshooting)
8. [Project Structure](#project-structure)

---

## Prerequisites

Before you begin, make sure you have these installed:

| Requirement | Version | Download |
|------------|---------|----------|
| **Node.js** | >= 18.0.0 | [nodejs.org](https://nodejs.org/) |
| **Docker Desktop** | Latest | [docker.com](https://www.docker.com/products/docker-desktop) |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |
| **npm** | >= 9.0.0 | Comes with Node.js |

### Verify Installation
```bash
node --version    # Should show v18.x.x or higher
npm --version     # Should show 9.x.x or higher
docker --version  # Should show Docker version
```

---

## Quick Start (One Command)

### Windows Users
```bash
# Open the project folder
cd D:\claude_project\General\Dexo

# Run the startup script (one command does it all!)
run.bat
```

### Linux/macOS Users
```bash
# Open the project folder
cd /path/to/Dexo

# Make the script executable
chmod +x run.sh

# Run the startup script
./run.sh
```

**That's it!** The script will:
- ✅ Start Docker containers (PostgreSQL, Redis, MinIO, MailHog)
- ✅ Install dependencies (if needed)
- ✅ Create `.env` file (if missing)
- ✅ Run database migrations
- ✅ Seed the database
- ✅ Start all 4 services (API, Web, Admin, Mobile)

The browser windows will open automatically after 15-20 seconds.

---

## Manual Setup (Step-by-Step)

If you prefer to run things manually or need more control:

### Step 1: Start Docker Services
```bash
# Start PostgreSQL on port 5433
docker run -d --name dexo-postgres ^
  -e POSTGRES_PASSWORD=postgres ^
  -e POSTGRES_DB=dexo_db ^
  -p 5433:5432 ^
  postgres:16-alpine

# Start Redis on port 6379
docker run -d --name dexo-redis -p 6379:6379 redis:7-alpine

# Start MinIO (S3-compatible storage) on ports 9000/9001
docker run -d --name dexo-minio ^
  -p 9000:9000 ^
  -p 9001:9001 ^
  -e MINIO_ROOT_USER=minioadmin ^
  -e MINIO_ROOT_PASSWORD=minioadmin ^
  minio/minio server /data --console-address ":9001"

# Start MailHog (email testing) on ports 1025/8025
docker run -d --name dexo-mailhog ^
  -p 1025:1025 ^
  -p 8025:8025 ^
  mailhog/mailhog
```

### Step 2: Install Dependencies
```bash
cd D:\claude_project\General\Dexo
npm install
```

### Step 3: Create Environment File
Create a file named `.env` in the project root:
```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/dexo_db

# JWT
JWT_SECRET=dev-jwt-secret-key-change-in-production

# Redis
REDIS_URL=redis://localhost:6379

# MinIO (S3)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# SMTP (MailHog)
SMTP_HOST=localhost
SMTP_PORT=1025

# Environment
NODE_ENV=development
```

### Step 4: Setup Database
```bash
# Generate Prisma client
npx prisma generate

# Apply schema to database
npx prisma db push

# Seed basic data (languages, currencies, plans, roles, permissions)
npx ts-node --transpile-only prisma/seed.ts

# Seed domain-driven architecture (12 industries with modules, menus, themes)
npx ts-node --transpile-only scripts/seed-domains-complete.js

# Seed Fitness Center tenant demo (with members, trainers, invoices, etc.)
npx ts-node --transpile-only seed-fitness-center-runner.ts

# Seed 5 branches for Fitness Center (optional - shows multi-branch feature)
npx ts-node --transpile-only seed-branches-and-oauth.ts
```

### Step 5: Start All Services

Open **4 separate terminal windows** and run each command:

**Terminal 1: API Server (port 4000)**
```bash
cd D:\claude_project\General\Dexo
npx ts-node --transpile-only apps/api/src/main.ts
```

**Terminal 2: Web App (port 3000)**
```bash
cd D:\claude_project\General\Dexo
cd apps/web
npm run dev
```

**Terminal 3: Admin App (port 3001)**
```bash
cd D:\claude_project\General\Dexo
cd apps/admin
npm run dev
```

**Terminal 4: Mobile Web (port 8081)**
```bash
cd D:\claude_project\General\Dexo
cd apps\mobile
npx expo export --platform web --output-dir "%TEMP%\dexo-mobile-web"
cd %TEMP%\dexo-mobile-web
npx serve -l 8081 -s
```

### Step 6: Verify Everything is Running

| Service | URL | Expected Status |
|---------|-----|-----------------|
| **API** | http://localhost:4000/api/docs | Swagger UI ✅ |
| **Web** | http://localhost:3000 | Login page ✅ |
| **Admin** | http://localhost:3001 | Login page ✅ |
| **Mobile** | http://localhost:8081 | Login screen ✅ |
| **MinIO** | http://localhost:9001 | Login: minioadmin/minioadmin ✅ |
| **MailHog** | http://localhost:8025 | Email interface ✅ |

---

## Demo Credentials

### 🔐 Platform Admin (Manages All Tenants)

**Access:** Admin Dashboard at **http://localhost:3001**

| Field | Value |
|-------|-------|
| **Email** | `admin@fitnessapp.com` |
| **Password** | `Admin123!` |
| **Role** | Platform Administrator |
| **Subdomain** | `admin` (auto-detected) |
| **Permissions** | Full access to all tenants, all data, all settings |

**What you can do:**
- ✅ Create new tenants
- ✅ Manage all tenants from one dashboard
- ✅ View platform-wide analytics
- ✅ Configure platform-level OAuth (Google, GitHub, Apple)
- ✅ Manage all subscriptions and billing

---

### 🏢 Fitness Center Tenant (Pre-Seeded)

**Access:** Web App at **http://localhost:3000**

#### Tenant Admin (Owner)
| Field | Value |
|-------|-------|
| **Email** | `admin@fitnesscenter.com` |
| **Password** | `Admin123!` |
| **Role** | Tenant Owner |
| **Domain** | FITNESS_CENTER |
| **Subdomain** | `fitness` |

**What you can do:**
- ✅ Manage your tenant's users, settings, billing
- ✅ Configure social login (Google, GitHub, Apple for your tenant)
- ✅ Create/manage 5 branches (HQ + 4 branches already seeded)
- ✅ View all branch reports and analytics
- ✅ Access fitness-specific modules (members, trainers, workouts, etc.)

#### Tenant Manager
| Field | Value |
|-------|-------|
| **Email** | `manager@fitnesscenter.com` |
| **Password** | `Manager123!` |
| **Role** | Tenant Manager |
| **Branch** | HQ Kathmandu (HQ-KTM) |

#### Trainers
| Email | Password | Branch | Specialization |
|-------|----------|--------|----------------|
| `trainer1@fitnesscenter.com` | `Trainer123!` | HQ Kathmandu | Strength Training |
| `trainer2@fitnesscenter.com` | `Trainer123!` | HQ Kathmandu | Yoga & Pilates |
| `trainer.lalitpur@fitnesscenter.com` | `Trainer123!` | Lalitpur | Strength Training |
| `trainer.bhaktapur@fitnesscenter.com` | `Trainer123!` | Bhaktapur | Cardio |
| `trainer.pokhara@fitnesscenter.com` | `Trainer123!` | Pokhara | General Fitness |
| `trainer.chitwan@fitnesscenter.com` | `Trainer123!` | Chitwan | Yoga |

#### Branch Managers
| Email | Password | Branch |
|-------|----------|--------|
| `manager@fitnesscenter.com` | `Manager123!` | HQ Kathmandu |
| `manager.lalitpur@fitnesscenter.com` | `Manager123!` | Lalitpur |
| `manager.bhaktapur@fitnesscenter.com` | `Manager123!` | Bhaktapur |
| `manager.pokhara@fitnesscenter.com` | `Manager123!` | Pokhara |
| `manager.chitwan@fitnesscenter.com` | `Manager123!` | Chitwan |

#### Receptionist
| Email | Password | Branch |
|-------|----------|--------|
| `receptionist@fitnesscenter.com` | `Receptionist123!` | HQ Kathmandu |

#### Member (Customer)
| Field | Value |
|-------|-------|
| **Email** | `member@fitnessapp.com` |
| **Password** | `Member123!` |
| **Role** | Member/Customer |

---

## Creating a New Tenant

### Method 1: Via Admin Dashboard (Recommended)

1. **Open Admin Dashboard:** http://localhost:3001
2. **Login** with platform admin credentials:
   - Email: `admin@fitnessapp.com`
   - Password: `Admin123!`
3. **Navigate to Tenants:** Click "Tenants" in the left sidebar
4. **Click "Create New Tenant"** button (top right)
5. **Step 1 - Basic Information:**
   - Organization Name: `My Beauty Salon` (or your business name)
   - Subdomain: `mysalon` (lowercase, no spaces)
   - Custom Domain: (optional) `mysalon.example.com`
6. **Step 2 - Choose Domain Type:**
   - Select from 12 industries: Fitness, Salon, School, Coaching, Restaurant, Hotel, Healthcare, Ecommerce, Logistics, Tailor, NGO, SME
   - For example, select **"Salon & Spa"** for a beauty salon
7. **Click "Create Tenant"** - Auto-provisions all modules, roles, menus, themes
8. **Note the Tenant ID** - You'll need this for login

### Method 2: Direct Database Seeding (Advanced)

Create a file `seed-my-tenant.js`:
```javascript
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. Create tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'My Beauty Salon',
      subdomain: 'mysalon',
      status: 'active',
    },
  });

  // 2. Create owner user
  const passwordHash = await bcrypt.hash('MyPass123!', 10);
  const owner = await prisma.user.create({
    data: {
      email: 'owner@mysalon.com',
      passwordHash,
      firstName: 'John',
      lastName: 'Doe',
      tenantId: tenant.id,
      status: 'active',
      emailVerified: true,
    },
  });

  // 3. Get SALON_AND_SPA domain
  const domain = await prisma.domain.findUnique({
    where: { code: 'SALON_AND_SPA' },
  });

  // 4. Assign domain (auto-provisions modules/roles)
  await fetch('http://localhost:4000/api/domains/quick-setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantId: tenant.id,
      domainCode: 'SALON_AND_SPA',
    }),
  });

  console.log('Tenant created!');
  console.log('Subdomain: mysalon');
  console.log('Login: owner@mysalon.com / MyPass123!');
}

main().finally(() => prisma.$disconnect());
```

Run: `npx ts-node --transpile-only seed-my-tenant.js`

---

## Access URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Web App** (Tenant Users) | http://localhost:3000 | Login, dashboard for tenant users |
| **Admin Dashboard** (Platform Admin) | http://localhost:3001 | Manage all tenants |
| **API Server** | http://localhost:4000 | Backend API |
| **Swagger Docs** | http://localhost:4000/api/docs | Interactive API documentation |
| **Mobile Web** | http://localhost:8081 | Mobile-optimized interface |
| **PostgreSQL** | localhost:5433 | Database (user: postgres, pass: postgres) |
| **Redis** | localhost:6379 | Cache and queue |
| **MinIO Console** | http://localhost:9001 | S3 file storage (minioadmin/minioadmin) |
| **MailHog** | http://localhost:8025 | Email testing interface |

### Tenant-Specific URLs

Each tenant has their own subdomain. If you configure DNS/hosts:
- **Fitness Center:** http://fitness.localhost:3000
- **My Salon:** http://mysalon.localhost:3000
- **My Hotel:** http://myhotel.localhost:3000

For local development, you can set the tenant via the URL parameter or login form.

---

## Project Structure

```
Dexo/
├── apps/
│   ├── api/                      # NestJS API (port 4000)
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   └── modules/          # Feature modules
│   │   │       ├── auth/         # Authentication
│   │   │       ├── tenant/       # Tenant management
│   │   │       ├── user/         # User management
│   │   │       ├── domain/       # Domain-driven architecture
│   │   │       ├── finance/      # NFRS-compliant finance
│   │   │       ├── social-auth/  # OAuth providers
│   │   │       ├── branch/       # Multi-branch management
│   │   │       ├── payment-gateway/ # eSewa, Fonepay, Stripe, PayPal
│   │   │       └── globalization/  # Multi-language, multi-currency
│   │   └── package.json
│   │
│   ├── web/                      # Tenant Web App (port 3000)
│   │   ├── app/
│   │   │   ├── login/
│   │   │   ├── dashboard/
│   │   │   ├── branches/         # Multi-branch management
│   │   │   ├── auth/social/      # OAuth callback
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── SocialLoginButtons.tsx
│   │   │   ├── BranchSelector.tsx
│   │   │   └── ...
│   │   └── lib/
│   │       ├── api.ts
│   │       ├── domain-menus.ts
│   │       ├── domain-widgets.ts
│   │       └── ...
│   │
│   ├── admin/                    # Admin Dashboard (port 3001)
│   │   ├── app/
│   │   │   ├── login/
│   │   │   ├── tenants/
│   │   │   ├── branches/         # Cross-tenant branch management
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── AdminSocialLoginButtons.tsx
│   │   │   ├── DomainConfig.tsx
│   │   │   └── ...
│   │   └── lib/api.ts
│   │
│   └── mobile/                   # Mobile App (Expo, port 8081)
│       ├── app/
│       │   ├── (auth)/
│       │   │   └── login.tsx     # Now has social login
│       │   └── (tabs)/
│       └── components/
│           └── SocialLoginButtons.tsx
│
├── packages/                     # Shared packages
│   ├── auth/
│   ├── shared/                   # Prisma client, utilities
│   ├── tenant/
│   ├── user/
│   └── ...
│
├── prisma/
│   ├── schema.prisma             # Database schema
│   ├── seed.ts                   # Basic seed
│   └── seed-branches-and-oauth.ts # Multi-branch + OAuth seed
│
├── scripts/
│   └── seed-domains-complete.js   # 12 domains seed
│
├── seed-fitness-center.js        # Fitness Center tenant seed
├── seed-branches.js              # Branch configuration
│
├── docker-compose.dev.yml        # Docker services
├── run.bat                        # Windows startup script
├── run.sh                         # Linux/macOS startup script
├── package.json
├── TODO.md                        # Implementation status
├── README.md                      # Project overview
└── RUN_GUIDE.md                   # This file
```

---

## Testing the Platform

### Test Platform Admin Features
1. Open http://localhost:3001
2. Login with `admin@fitnessapp.com` / `Admin123!`
3. Check Dashboard for system-wide stats
4. Go to **Tenants** → See the Fitness Center tenant
5. Go to **Branches** → See all 5 fitness branches across Nepal
6. Go to **Subscriptions** → See plans and subscriptions
7. Go to **Reports** → View platform analytics

### Test Tenant User Features
1. Open http://localhost:3000
2. Login with `admin@fitnesscenter.com` / `Admin123!`
3. Check **Dashboard** for fitness-specific widgets
4. Go to **Branches** → See the 5 fitness branches
   - View all-branches comparison report
   - Click on HQ Kathmandu for detailed view
   - See staff performance, revenue, expenses
5. Go to **Settings** → Configure OAuth (Google, GitHub, Apple)
6. Go to **Team** → See branch managers, trainers, receptionists

### Test Social Login (OAuth)
1. Open http://localhost:3000 (Web) or http://localhost:8081 (Mobile)
2. On login page, you should see "Sign in with Google/GitHub/Apple" buttons
3. Click any provider → Redirects to provider's OAuth page
4. (Note: Requires actual OAuth credentials in .env to work end-to-end)
5. Currently shows "not configured" message (expected in dev)

### Test Multi-Branch Management
1. Login as `manager.lalitpur@fitnesscenter.com` / `Manager123!`
2. You'll only see the Lalitpur branch in your selector
3. Login as `admin@fitnesscenter.com` to see all 5 branches
4. Switch between branches to see different data
5. View branch-specific reports, staff, expenses

---

## Troubleshooting

### ❌ "Port already in use" error
**Solution:** Stop any process using the port:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/macOS
lsof -i :3000
kill -9 <PID>
```

### ❌ Docker not starting
**Solution:** Make sure Docker Desktop is running. On Windows, check the system tray for the Docker icon.

### ❌ "Database connection failed"
**Solution:** 
1. Check if PostgreSQL container is running: `docker ps`
2. If not, start it: `docker start dexo-postgres`
3. Verify connection: `docker logs dexo-postgres`

### ❌ "Module not found" errors
**Solution:** Reinstall dependencies:
```bash
# Clean install
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
npm install
```

### ❌ Login doesn't work
**Solution:** 
1. Make sure database is seeded: `npx ts-node --transpile-only prisma/seed.ts`
2. Re-seed: `npx ts-node --transpile-only seed-fitness-center.js`
3. Re-seed branches: `npx ts-node --transpile-only seed-branches-and-oauth.ts`

### ❌ OAuth buttons show "not configured"
**Solution:** This is expected in development. To enable real OAuth:
1. Get OAuth credentials from Google Cloud Console, GitHub Developer Settings, Apple Developer Portal
2. Add to `.env`:
```env
GOOGLE_CLIENT_ID=your-actual-client-id
GOOGLE_CLIENT_SECRET=your-actual-secret
```

### ❌ Mobile app won't load
**Solution:**
```bash
cd apps/mobile
rm -rf .expo
npx expo export --platform web --output-dir "%TEMP%\dexo-mobile-web"
```

---

## Quick Reference Card

```
╔════════════════════════════════════════════════╗
║        Dexo Platform - Quick Reference         ║
╠════════════════════════════════════════════════╣
║                                                ║
║  🚀 Start:        run.bat                     ║
║  🛑 Stop:         Close all terminal windows   ║
║                                                ║
║  🌐 Web App:       http://localhost:3000       ║
║  👨‍💼 Admin:         http://localhost:3001       ║
║  🔌 API:           http://localhost:4000       ║
║  📱 Mobile:        http://localhost:8081       ║
║  📚 Swagger:       http://localhost:4000/api/docs ║
║                                                ║
║  👤 Platform Admin:                            ║
║     admin@fitnessapp.com / Admin123!          ║
║                                                ║
║  👤 Tenant Admin (Fitness):                    ║
║     admin@fitnesscenter.com / Admin123!       ║
║                                                ║
║  👤 Branch Managers:                           ║
║     manager.lalitpur@fitnesscenter.com / Manager123! ║
║     manager.bhaktapur@fitnesscenter.com / Manager123! ║
║     manager.pokhara@fitnesscenter.com / Manager123!  ║
║     manager.chitwan@fitnesscenter.com / Manager123!  ║
║                                                ║
║  👤 Trainers:                                  ║
║     trainer1@fitnesscenter.com / Trainer123! ║
║     trainer.lalitpur@fitnesscenter.com / Trainer123! ║
║                                                ║
║  👤 Member:                                    ║
║     member@fitnessapp.com / Member123!         ║
║                                                ║
║  🏢 5 Branches: HQ-KTM, BR-LAL, BR-BHA,       ║
║                BR-PKR, BR-CHT                  ║
║                                                ║
║  🎯 12 Industries: Fitness, Salon, School,  ║
║    Coaching, Restaurant, Hotel, Healthcare,    ║
║    Ecommerce, Logistics, Tailor, NGO, SME      ║
║                                                ║
║  💳 5 Payment Gateways: eSewa, Fonepay,       ║
║    ConnectIPS (Nepal), Stripe, PayPal          ║
║                                                ║
║  🔐 6 OAuth Providers: Google, GitHub, Apple, ║
║    Facebook, Microsoft, LinkedIn              ║
║                                                ║
╚════════════════════════════════════════════════╝
```

---

## Support

- **Documentation:** See `TODO.md` for complete feature list
- **API Reference:** http://localhost:4000/api/docs
- **Architecture:** See `README.md` for technical overview
- **Issues:** Check Docker containers are running with `docker ps`

---

**Enjoy using Dexo! 🚀**
