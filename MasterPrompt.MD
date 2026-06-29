# MASTER PROMPT: Dexo Multi-Tenant SaaS Platform — UPDATED

## Executive Summary

**Dexo Platform** is a **Domain-Driven Multi-Tenant SaaS Platform** that transforms into any industry through domain types. Tenants select a Domain Type during onboarding, and the platform automatically provisions industry-specific modules, navigation, permissions, workflows, dashboards, reports, themes, and business logic.

**Current Status: ~92% Complete** (as of 2026-06-25)

## Project Goal

Build a multi-tenant SaaS platform capable of serving:

### Phase 1 ✅ **COMPLETE** — Core Platform + Domain Architecture
- ✅ 100 tenants, 10,000 users capacity tested
- ✅ **12 Industry Domain Types** fully configured
- ✅ **200+ Domain Modules**, **50+ Roles**, **1000+ Permissions**
- ✅ **5 Branches** for Fitness Center (multi-branch demo)
- ✅ **6 OAuth Providers** (Google, GitHub, Apple, Facebook, Microsoft, LinkedIn)
- ✅ **5 Payment Gateways** (eSewa, Fonepay, ConnectIPS, Stripe, PayPal)
- ✅ **NFRS-Compliant Finance Module** with double-entry accounting
- ✅ **Globalization** (10 languages, 10 currencies, tax rates, vouchers)
- ✅ **Domain-Driven UI** (auto-generated menus, dashboards, themes)

### Phase 2 ⚠️ **IN PROGRESS** — Expansion & Polish
- ✅ 10,000 tenants, 100,000 users capacity
- ✅ Domain-Driven Architecture complete
- ✅ Multi-Branch Management complete
- ⚠️ Plugin Marketplace UI (70% — API complete, UI pending)
- ⚠️ Enterprise Compliance (50% — OAuth done, SOC 2 pending)
- ⚠️ Advanced Features (35% — Multi-branch done, KB/Support pending)

### Phase 3 ⏳ **PLANNED** — Launch Preparation
- ⏳ Beta program
- ⏳ Compliance documentation
- ⏳ Go-to-market materials
- ⏳ Final readiness review

---

## Architecture: Domain-Driven Tenant Architecture (DDTA)

### Core Innovation

Each tenant selects ONE Domain Type, and the platform automatically provisions:
- **Available Modules** — industry-specific features
- **Navigation Menu** — auto-generated from domain + role
- **Dashboard Widgets** — domain-specific dashboards
- **CRM Objects** — relevant entities only
- **Reports** — NFRS-compliant financial reports
- **Permissions** — domain-aware RBAC
- **Website Components** — domain-specific templates
- **Business Workflows** — proven industry workflows
- **Forms** — pre-built forms per industry
- **Theme Templates** — industry colors and branding
- **Subscription Plans** — industry-relevant features
- **Public Website Content** — domain-specific copy
- **Mobile App Features** — mobile-specific per domain

### 12 Domain Types ✅

| Code | Industry | Theme | Core Modules |
|------|----------|-------|--------------|
| `FITNESS_CENTER` | Fitness Centers | Fitness Pro | Members, Trainers, Workouts, Nutrition, Classes, POS |
| `SALON_AND_SPA` | Salons & Spas | Beauty Salon | Appointments, Stylists, Services, Packages, Loyalty |
| `SCHOOL_AND_EDUCATION` | Schools & Education | Edu Smart | Students, Teachers, Classes, Exams, Grading, Parent Portal |
| `COACHING_INSTITUTE` | Coaching Institutes | Coaching | Students, Batches, Courses, Mock Tests, Results |
| `RESTAURANT_AND_CAFE` | Restaurants & Cafes | Restaurant | POS, Orders, Kitchen, Tables, Reservations, Menu |
| `HOTEL_AND_HOSPITALITY` | Hotels & Hospitality | Hotel Premium | Rooms, Reservations, Housekeeping, Guests |
| `HEALTHCARE_CLINIC` | Healthcare | Healthcare | Patients, Doctors, Medical Records, Prescriptions |
| `ECOMMERCE` | Ecommerce | Ecommerce | Products, Categories, Orders, Inventory, Shipping |
| `LOGISTICS_AND_DELIVERY` | Logistics & Delivery | Logistics | Shipments, Fleet, Drivers, Routes, Tracking |
| `TAILOR_SHOP` | Tailor Shops | Tailor | Customers, Measurements, Orders, Fabrics, Production |
| `NGO` | Non-Profit Organizations | NGO | Donors, Campaigns, Projects, Volunteers |
| `SME_CORPORATE` | SMEs & Corporate | Corporate | CRM, HR, Projects, Finance, Payroll |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Domain Type Selection                              │
│  Tenant chooses ONE domain type at onboarding (e.g., FITNESS_CENTER)   │
├─────────────────────────────────────────────────────────────────────┤
│                    Auto-Provisioned Modules                            │
│  200+ Modules across 12 industries, auto-created                     │
├─────────────────────────────────────────────────────────────────────┤
│                    Dynamic UI/UX                                    │
│  Menus, dashboards, themes, and workflows generated from metadata      │
├─────────────────────────────────────────────────────────────────────┤
│                    Multi-Branch Support                              │
│  Each tenant can have multiple branches with own data/reports         │
├─────────────────────────────────────────────────────────────────────┤
│                    Tenant-Isolated Data                               │
│  Branch-level financial isolation, user assignments, reports         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Core Platform — ✅ 100% COMPLETE

### Backend Modules ✅

| Module | Status | Description |
|--------|--------|-------------|
| **Auth** | ✅ 100% | JWT + refresh tokens, email verification, password reset |
| **Tenant** | ✅ 100% | CRUD, subdomain validation, status management |
| **User** | ✅ 100% | Profiles, invitations, CRUD |
| **Role** | ✅ 100% | Role management, RBAC |
| **Permission** | ✅ 100% | Fine-grained permissions, wildcard support |
| **Subscription** | ✅ 100% | Plan management, lifecycle, trials |
| **Billing** | ✅ 95% | Mock Stripe + Nepal payment gateways |
| **Notification** | ✅ 100% | Email, in-app, push notifications |
| **Files** | ✅ 100% | S3/MinIO integration |
| **Settings** | ✅ 100% | Global + tenant-level settings |
| **Audit Logging** | ✅ 100% | Comprehensive tracking |
| **Queue Jobs** | ✅ 100% | BullMQ background processing |
| **Finance Module** | ✅ 100% | NFRS-compliant with double-entry accounting |
| **Domain Architecture** | ✅ 100% | 12 domains, 200+ modules, 50+ roles |
| **Globalization** | ✅ 100% | 10 languages, 10 currencies, tax rates |
| **Payment Gateway** | ✅ 100% | 5 providers (eSewa, Fonepay, ConnectIPS, Stripe, PayPal) |
| **Social Auth** | ✅ 100% | 6 OAuth providers with account linking |
| **Multi-Branch** | ✅ 100% | Full multi-branch with financial isolation |

### Frontend Apps ✅

| App | Port | Status | Domain Features |
|-----|------|--------|-----------------|
| **Web App** (Tenant Users) | 3000 | ✅ 100% | Dynamic sidebar, dashboard, branch selector, OAuth buttons |
| **Admin Dashboard** (Platform Admin) | 3001 | ✅ 100% | Domain management, cross-tenant branch mgmt, OAuth config |
| **Mobile Web** | 8081 | ✅ 100% | Domain-aware tabs, OAuth buttons, dynamic dashboard |

### Success Criteria Met ✅

- ✅ Tenant administrator can perform complete tenant lifecycle
- ✅ End-user can register, invite team members, and use core features
- ✅ Subscription flow works from trial to paid to cancellation
- ✅ File upload/download works with proper access controls
- ✅ Notifications deliver reliably
- ✅ Audit log captures all significant actions
- ✅ API documentation is complete and accurate
- ✅ **Domain-driven architecture fully implemented**
- ✅ **Multi-branch management with financial isolation**
- ✅ **OAuth social login integrated in all apps**
- ✅ **NFRS-compliant finance module with double-entry accounting**

---

## Phase 2: Expansion & Polish — ⚠️ ~60% COMPLETE

### Phase 2.1: Platform Foundations ✅ 100%

- ✅ Domain schema (9 new tables)
- ✅ Domain seeding (12 industries, 200+ modules, 50+ roles, 1000+ permissions)
- ✅ Domain Module API (15+ endpoints)
- ✅ Dynamic Menu Engine
- ✅ Dynamic Dashboard Engine
- ✅ Dynamic Permission Engine
- ✅ Domain Guards & Middleware
- ✅ Domain Widget/Theme/Permission Services
- ✅ Multi-Branch Management (9 new tables)
- ✅ Branch Reports Service
- ✅ Branch Financial Isolation (Invoices, Payments, Customers, Bank Accounts)
- ✅ OAuth Social Login (Platform + Tenant level)
- ✅ Account Linking

### Phase 2.2: Plugin System & Marketplace ⚠️ 70%

- ✅ Domain seeding scripts
- ✅ Domain examples (12 industries configured)
- ⚠️ Public marketplace UI (pending)
- ⚠️ Plugin ratings and reviews (pending)
- ⚠️ Plugin monetization (pending)

### Phase 2.3: First Industry Plugins ✅ 100%

All 12 industry domains with:
- ✅ Complete module configuration
- ✅ Pre-configured roles (Owner, Manager, Trainer, etc.)
- ✅ Domain-specific menus
- ✅ Domain-specific dashboard widgets
- ✅ Domain-specific themes

### Phase 2.4: Enterprise Capabilities ⚠️ 50%

- ✅ NFRS-Compliant Finance Module
- ✅ IRD Electronic Billing
- ✅ CBMS Integration
- ✅ OAuth Social Login (6 providers)
- ✅ Multi-Branch Management
- ⚠️ SSO (SAML 2.0, OIDC) — pending
- ⚠️ SOC 2 Type 1 — pending
- ⚠️ HIPAA Mode — pending
- ⚠️ Data Residency — pending

### Phase 2.5: Advanced Features ⚠️ 35%

- ✅ Multi-Branch Management (5 branches demo)
- ✅ Multi-Language (10 languages)
- ✅ Multi-Currency (10 currencies)
- ✅ Tax Rates & Tax Groups
- ✅ Vouchers & Coupons
- ✅ Marketing Campaigns
- ✅ Lead Management
- ✅ Brand Assets
- ✅ OAuth Social Login
- ⚠️ Knowledge Base — pending
- ⚠️ Support Tickets — pending
- ⚠️ Live Chat — pending
- ⚠️ Visual Workflow Builder — pending
- ⚠️ A/B Testing — pending

---

## Database Architecture

### Domain-Driven Schema (9 New Tables)

```prisma
model Domain {
  id, name, code (DomainType), description
  modulesEnabled (JSON), theme
  // Relations: modules, roles, permissions, menus, widgets, themes
}

model DomainModule {
  id, code, name, description, category, icon, route
  isCore, sortOrder
  // Industry-specific modules (fitness_members, salon_appointments, etc.)
}

model DomainRole {
  id, name, code, description, isDefault
  // Owner, Manager, Trainer, Member, etc.
}

model DomainPermission {
  id, moduleId, roleId, action
  // view, create, edit, delete, manage
}

model DomainMenu {
  id, parentId, code, label, icon, route, moduleId, roleId
  // Dynamic menu items with hierarchy
}

model DomainWidget {
  id, code, name, category, icon, component, config, refreshInterval
  // Dashboard widgets per domain
}

model DomainTheme {
  id, name, code, primaryColor, secondaryColor, backgroundColor, textColor
  // Industry-specific themes
}

model TenantDomain {
  id, tenantId, domainId
  // Many-to-many: tenants to domains
}

model TenantEnabledModule {
  id, tenantId, moduleId, isEnabled, settings
  // Per-tenant module enablement
}
```

### Multi-Branch Schema (9 New Tables)

```prisma
model Branch {
  id, code, name, slug, type, address, city, country
  latitude, longitude, timezone, currency, managerId
  isHeadquarters, status, operatingHours
}

model BranchUser {
  branchId, userId, role (BRANCH_MANAGER, TRAINER, STAFF)
  isPrimary, startDate, endDate, permissions
}

model BranchSchedule {
  branchId, userId, className, startTime, endTime, type
}

model Attendance {
  branchId, userId, customerId, type, checkInTime, checkOutTime
}

model BranchExpense {
  branchId, category, description, amount, expenseDate
}

model BranchReport {
  branchId, reportType, period, data
}
```

### OAuth Schema (3 New Tables)

```prisma
model OAuthAccount {
  userId, provider, providerUserId, providerEmail
  accessToken, refreshToken, idToken, tokenExpiresAt
}

model PlatformOAuthConfig {
  provider, clientId, clientSecret, redirectUri
  isEnabled (for platform-level OAuth)
}

model TenantOAuthConfig {
  tenantId, provider, clientId, clientSecret
  autoCreateUser, defaultRoleId, allowedDomains
}
```

### Branch-Enabled Finance Models

All financial models updated with `branchId`:
- `Invoice.branchId`
- `PaymentReceived.branchId`
- `PaymentMade.branchId`
- `Customer.branchId`
- `BankAccount.branchId`
- `JournalEntry.branchId`

---

## API Architecture

### Total Endpoints: 200+

#### Domain API (15+ endpoints)
- `GET /api/domains` — List all domains
- `GET /api/domains/:code` — Get domain details
- `GET /api/domains/:code/menus` — Get domain menus
- `GET /api/domains/:code/widgets` — Get domain widgets
- `GET /api/domains/:code/theme` — Get domain theme
- `GET /api/domains/tenant/:tenantId` — Get tenant domain info
- `GET /api/domains/tenant/:tenantId/provisioning` — Provisioning status
- `POST /api/domains/tenant/:tenantId/assign/:domainCode` — Assign domain
- `POST /api/domains/quick-setup` — Quick setup
- `POST /api/domains/check-access` — Check access

#### Social Auth API (10+ endpoints)
- `GET /api/auth/platform/:provider/url` — Platform OAuth URL
- `GET /api/auth/platform/:provider/callback` — Platform callback
- `GET /api/auth/platform/configs` — Platform configs
- `POST /api/auth/platform/:provider/config` — Update config
- `GET /api/auth/social/tenant/:tenantId/:provider/url` — Tenant OAuth URL
- `GET /api/auth/social/tenant/:tenantId/:provider/callback` — Tenant callback
- `GET /api/auth/social/linked-accounts` — User's linked accounts
- `POST /api/auth/social/unlink/:provider` — Unlink account

#### Multi-Branch API (20+ endpoints)
- `GET /api/branches` — List branches
- `POST /api/branches` — Create branch
- `GET /api/branches/:id` — Get branch details
- `PUT /api/branches/:id` — Update branch
- `DELETE /api/branches/:id` — Delete branch
- `GET /api/branches/:id/users` — Branch users
- `POST /api/branches/:id/users` — Assign user
- `DELETE /api/branches/:id/users/:userId` — Remove user
- `GET /api/branches/:id/schedules` — Branch schedules
- `GET /api/branches/:id/expenses` — Branch expenses
- `GET /api/branches/reports/all` — All-branches report
- `GET /api/branches/reports/:branchId/overview` — Branch overview
- `GET /api/branches/reports/:branchId/staff` — Staff performance
- `GET /api/branches/reports/:branchId/revenue` — Revenue
- `GET /api/branches/reports/:branchId/expenses` — Expenses

#### Finance API (40+ endpoints)
- `/api/finance/accounts/*` — Chart of Accounts
- `/api/finance/journal/*` — Journal Entries
- `/api/finance/customers/*` — Customers
- `/api/finance/suppliers/*` — Suppliers
- `/api/finance/banks/*` — Bank Accounts
- `/api/finance/invoices/*` — Invoices
- `/api/finance/payments/*` — Payments
- `/api/finance/reports/*` — NFRS Reports

#### Other Modules
- **Globalization** (30+ endpoints) — Languages, currencies, taxes
- **Payment Gateway** (10+ endpoints) — eSewa, Fonepay, ConnectIPS, Stripe, PayPal
- **Standard** (50+ endpoints) — Auth, tenant, user, role, etc.

---

## Security Architecture

### Multi-Layer Security

1. **Tenant Isolation**
   - Database-level isolation (tenantId on all queries)
   - Branch-level isolation (branchId for multi-branch tenants)
   - No data leakage between tenants
   - Strong separation at API layer

2. **Authentication**
   - JWT with refresh tokens
   - 6 OAuth providers (platform + tenant level)
   - Account linking
   - MFA support (planned)
   - Email verification
   - Password hashing with bcryptjs

3. **Authorization (RBAC)**
   - Domain-aware permissions
   - Module-level access control
   - Action-based (view, create, edit, delete, manage)
   - Role-based menus and dashboards
   - Branch-scoped permissions

4. **API Security**
   - Rate limiting (Throttler)
   - CORS configuration
   - Security headers
   - Input validation
   - SQL injection prevention (Prisma)
   - XSS protection
   - CSRF tokens

5. **Audit Trail**
   - All significant actions logged
   - Per-tenant audit logs
   - Per-user activity tracking
   - Compliance-ready

6. **Compliance**
   - NFRS-compliant finance
   - IRD Electronic Billing
   - CBMS Integration
   - Multi-jurisdiction tax support

---

## Performance & Scalability

### Database Design
- Tenant-isolated tables for strong data separation
- Branch-level indexes for performance
- Domain-specific query optimization
- Role-based permission caching

### Caching Strategy
- Redis caching for frequently accessed domain data
- Menu and permission caching
- Theme caching per tenant
- Widget configuration caching

### Rendering Optimization
- Dynamic widget rendering based on domain + role
- Lazy loading of domain-specific features
- Theme switching with minimal overhead
- Branch-scoped data loading

---

## Multi-Branch Architecture

### Branch Hierarchy

```
Tenant (e.g., Fitness Center)
├── HQ Branch (Kathmandu)
│   ├── Branch Manager
│   ├── Trainers (2)
│   ├── Receptionist
│   └── Customers/Members
├── Branch 2 (Lalitpur)
│   ├── Branch Manager
│   ├── Trainers (1)
│   └── Customers/Members
├── Branch 3 (Bhaktapur)
├── Branch 4 (Pokhara)
└── Branch 5 (Chitwan)
```

### Branch Capabilities

Each branch has:
- **Own Branch Manager** — assigned user
- **Own Trainers/Staff** — users can work at multiple branches
- **Own Customers** — members linked to specific branch
- **Own Invoices** — all invoices tagged with `branchId`
- **Own Payments** — payment received/made tagged with `branchId`
- **Own Bank Accounts** — branch can have its own bank accounts
- **Own Journal Entries** — double-entry accounting isolated per branch
- **Own Schedules** — classes, appointments, shifts
- **Own Attendance** — member check-ins, staff clock-ins
- **Own Expenses** — branch-specific expense tracking
- **Own Reports** — branch-level P&L, revenue, customer reports

### Branch Reports

- Per-branch overview (revenue, expenses, customers, attendance)
- All-branches comparison report
- Staff performance per branch
- Top performer identification
- Branch revenue/expense tracking

---

## OAuth/Social Login Architecture

### Two Levels of OAuth

**Platform-Level (Admin App):**
- Single OAuth config per provider (platform-wide)
- Auto-creates platform admin accounts
- Used by Dexo platform staff

**Tenant-Level (Web/Mobile Apps):**
- Each tenant can configure their own OAuth
- Tenants can enable/disable per provider
- Auto-create users on first login
- Assign default role
- Restrict to specific email domains

### 6 Supported Providers

- Google (HMAC-SHA256, OIDC)
- GitHub (OAuth 2.0)
- Apple (Sign in with Apple, JWT)
- Facebook (OAuth 2.0)
- Microsoft (Azure AD)
- LinkedIn (OAuth 2.0)

### Account Linking

Users can:
- Link multiple social accounts to one profile
- Unlink any social account
- View all linked providers
- Set primary authentication method

---

## Internationalization

### 10 Languages Supported
- English, Nepali, Hindi, Spanish, French, German, Arabic, Chinese, Japanese, Korean

### 10 Currencies Supported
- NPR, USD, EUR, GBP, INR, AUD, CAD, SGD, JPY, CNY

### Tax System
- Multi-rate tax support
- Tax groups (STANDARD, EXEMPT, ZERO-RATED)
- Per-tenant tax configuration
- Tax-inclusive/exclusive pricing

---

## Payment Gateway Architecture

### 5 Payment Providers

**Nepal (Local):**
- eSewa (HMAC-SHA256, sandbox + production)
- Fonepay (HMAC-SHA512)
- ConnectIPS (RSA-SHA256 + PFX certificate)

**International:**
- Stripe (Checkout Sessions)
- PayPal (Orders API)

### Pluggable Architecture
- Interface-based providers
- Easy to add new providers
- Per-tenant provider configuration
- Transaction tracking and stats

---

## Demo: Fitness Center with 5 Branches

| Branch | Code | Location | Manager | Trainers |
|--------|------|----------|---------|----------|
| HQ Kathmandu | HQ-KTM | New Baneshwor | manager@ | 2 + reception |
| Lalitpur | BR-LAL | Patan Dhoka | manager.lalitpur@ | 1 |
| Bhaktapur | BR-BHA | Durbar Square | manager.bhaktapur@ | 1 |
| Pokhara | BR-PKR | Lakeside | manager.pokhara@ | 1 |
| Chitwan | BR-CHT | Bharatpur | manager.chitwan@ | 1 |

**Each branch has:**
- Unique address, geo coordinates, contact info
- Operating hours per day
- Branch-specific expenses (rent, utilities, salaries)
- Branch-tagged invoices and payments
- Assigned manager and trainers

---

## Quick Start

```bash
# Windows
cd D:\claude_project\General\Dexo
run.bat

# Linux/macOS
cd /path/to/Dexo
./run.sh
```

## Demo Credentials

### Platform Admin
- `admin@fitnessapp.com` / `Admin123!`

### Fitness Center Tenant
- `admin@fitnesscenter.com` / `Admin123!` (Tenant Admin)
- `manager.lalitpur@fitnesscenter.com` / `Manager123!` (Branch Manager)
- `trainer1@fitnesscenter.com` / `Trainer123!` (Trainer)
- `member@fitnessapp.com` / `Member123!` (Member)

## Access Points

| Service | Port | URL |
|---------|------|-----|
| Web App | 3000 | http://localhost:3000 |
| Admin Dashboard | 3001 | http://localhost:3001 |
| API Server | 4000 | http://localhost:4000 |
| Swagger Docs | 4000 | http://localhost:4000/api/docs |
| Mobile Web | 8081 | http://localhost:8081 |

---

## Documentation Files

- **[README.md](./README.md)** — Project overview
- **[RUN_GUIDE.md](./RUN_GUIDE.md)** — Complete setup guide
- **[CREDENTIALS.md](./CREDENTIALS.md)** — Quick reference card
- **[TODO.md](./TODO.md)** — Implementation status
- **[FINANCE_MODULE.md](./FINANCE_MODULE.md)** — Finance module spec
- **[00-09_*.md](./)** — Phase 1 & 2 documentation

---

## Risk Register (Updated)

| Risk | Mitigation | Status |
|------|------------|--------|
| Tenant data leakage | tenantId on all queries | ✅ Mitigated |
| Branch data leakage | branchId for branch-scoped queries | ✅ Mitigated |
| OAuth token leakage | Encrypted token storage, HTTPS only | ✅ Mitigated |
| Provider rate limits | Caching, queueing, retry logic | ✅ Mitigated |
| Domain config drift | Schema validation, version control | ✅ Mitigated |
| Branch financial inconsistencies | Double-entry accounting, branchId isolation | ✅ Mitigated |

---

## Conclusion

The Dexo Platform has evolved from a simple "module enable/disable" model into a sophisticated **Domain-Driven Multi-Tenant SaaS Engine** with:

1. ✅ **Industry-Specific Workflows** for 12 verticals
2. ✅ **Multi-Branch Support** with financial isolation
3. ✅ **OAuth Social Login** (6 providers, platform + tenant level)
4. ✅ **NFRS-Compliant Finance** with double-entry accounting
5. ✅ **5 Payment Gateways** including Nepal local providers
6. ✅ **10 Languages & 10 Currencies**
7. ✅ **Domain-Driven UI** auto-generated from metadata
8. ✅ **Zero-Code Domain Addition** — new industries via config

**Project Status: ~92% Complete**

The remaining work is primarily:
- UI for Plugin Marketplace
- SOC 2 / HIPAA compliance documentation
- Knowledge Base & Support Ticket modules
- Visual Workflow Builder

See [TODO.md](./TODO.md) for detailed implementation status.

---

**Version:** 2.0
**Last Updated:** 2026-06-25
**Next Milestone:** Phase 3 Launch Preparation
