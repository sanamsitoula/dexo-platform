# Implementation Plan: Domain-Specific Tenant Ecosystem

## Overview

Build a complete tenant ecosystem where each tenant is a domain-specific system with:
- **Base modules** from platform (Auth, CRM, Finance, Users, Settings)
- **Domain-specific modules** added on top (Members for Fitness, Appointments for Salon, etc.)
- **Branch support** for multi-location businesses
- **Custom themes** per domain
- **Domain-specific workflows** and UI

## Domain Matrix

| Domain Code | Industry | Theme | Key Modules |
|-------------|----------|-------|-------------|
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

---

## Phase 1: Enhance Domain Provisioning System

### 1.1 Create Domain Provisioning Service

**File**: `packages/domain/src/provisioning/domain-provisioning.service.ts`

```typescript
@Injectable()
export class DomainProvisioningService {
  // When tenant is created with a domain:
  // 1. Enable base modules (Auth, CRM, Finance, Users, Settings)
  // 2. Enable domain-specific modules
  // 3. Create domain-specific roles
  // 4. Set up domain-specific menus
  // 5. Apply domain theme
}
```

### 1.2 Define Module Categories

**Base Modules** (always enabled):
- `AUTH` - Authentication & user management
- `CRM` - Customer relationship management
- `FINANCE` - Invoicing, payments, accounting
- `USERS` - User & role management
- `SETTINGS` - Tenant settings
- `NOTIFICATIONS` - Email, SMS, push notifications
- `FILES` - File storage & management

**Domain Modules** (per domain):

```typescript
const DOMAIN_MODULES = {
  FITNESS_CENTER: ['MEMBERS', 'TRAINERS', 'WORKOUTS', 'NUTRITION', 'CLASSES', 'POS'],
  SALON_AND_SPA: ['APPOINTMENTS', 'STYLISTS', 'SERVICES', 'PACKAGES', 'LOYALTY'],
  SCHOOL_AND_EDUCATION: ['STUDENTS', 'TEACHERS', 'CLASSES', 'EXAMS', 'GRADING', 'PARENT_PORTAL'],
  // ... etc
}
```

### 1.3 Update Tenant Creation Flow

**Modify**: `packages/tenant/src/tenant/tenant.service.ts`

When creating a tenant:
1. Create tenant record
2. Call `DomainProvisioningService.provision(tenantId, domainCode)`
3. This enables all necessary modules, roles, menus

---

## Phase 2: Create Domain-Specific Models

### 2.1 Fitness Center Models

**File**: `prisma/schema.prisma`

```prisma
model Member {
  id            String   @id @default(uuid())
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  tenantId      String
  user          User?    @relation(fields: [userId], references: [id])
  userId        String?
  
  // Member details
  membershipType String  // BASIC, PREMIUM, VIP
  startDate     DateTime
  endDate       DateTime?
  status        MemberStatus @default(ACTIVE)
  
  // Fitness specific
  height        Decimal? @db.Decimal(5, 2)
  weight        Decimal? @db.Decimal(5, 2)
  goals         String?  @db.Text
  medicalConditions String? @db.Text
  
  // Relations
  trainer       Trainer? @relation(fields: [trainerId], references: [id])
  trainerId     String?
  memberships   Membership[]
  workouts      Workout[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([tenantId])
  @@index([userId])
  @@index([trainerId])
}

model Trainer {
  id            String   @id @default(uuid())
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  tenantId      String
  user          User?    @relation(fields: [userId], references: [id])
  userId        String?
  
  name          String
  email         String?
  phone         String?
  specialization String?
  certifications String? @db.Text
  bio           String?  @db.Text
  hourlyRate    Decimal? @db.Decimal(10, 2)
  
  members       Member[]
  sessions      TrainingSession[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([tenantId])
}

model TrainingSession {
  id            String   @id @default(uuid())
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  tenantId      String
  
  member        Member   @relation(fields: [memberId], references: [id])
  memberId      String
  trainer       Trainer  @relation(fields: [trainerId], references: [id])
  trainerId     String
  
  scheduledAt   DateTime
  duration      Int      // minutes
  status        SessionStatus @default(SCHEDULED)
  notes         String?  @db.Text
  
  createdAt     DateTime @default(now())
  
  @@index([tenantId])
  @@index([memberId])
  @@index([trainerId])
}

enum MemberStatus {
  ACTIVE
  INACTIVE
  EXPIRED
  FROZEN
}

enum SessionStatus {
  SCHEDULED
  COMPLETED
  CANCELLED
  NO_SHOW
}
```

### 2.2 Salon & Spa Models

```prisma
model Appointment {
  id            String   @id @default(uuid())
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  tenantId      String
  
  customer      User?    @relation(fields: [customerId], references: [id])
  customerId    String?
  
  stylist       Stylist? @relation(fields: [stylistId], references: [id])
  stylistId     String?
  
  service       Service  @relation(fields: [serviceId], references: [id])
  serviceId     String
  
  scheduledAt   DateTime
  duration      Int      // minutes
  status        AppointmentStatus @default(SCHEDULED)
  notes         String?  @db.Text
  
  createdAt     DateTime @default(now())
  
  @@index([tenantId])
  @@index([stylistId])
  @@index([scheduledAt])
}

model Stylist {
  id            String   @id @default(uuid())
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  tenantId      String
  user          User?    @relation(fields: [userId], references: [id])
  userId        String?
  
  name          String
  email         String?
  phone         String?
  specialization String?
  commissionRate Decimal? @db.Decimal(5, 2)
  
  appointments  Appointment[]
  
  createdAt     DateTime @default(now())
  
  @@index([tenantId])
}

model Service {
  id            String   @id @default(uuid())
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  tenantId      String
  
  name          String
  description   String?  @db.Text
  duration      Int      // minutes
  price         Decimal  @db.Decimal(10, 2)
  category      String?  // HAIR, NAILS, SPA, etc.
  
  appointments  Appointment[]
  
  createdAt     DateTime @default(now())
  
  @@index([tenantId])
}

enum AppointmentStatus {
  SCHEDULED
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW
}
```

### 2.3 School & Education Models

```prisma
model Student {
  id            String   @id @default(uuid())
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  tenantId      String
  user          User?    @relation(fields: [userId], references: [id])
  userId        String?
  
  name          String
  email         String?
  phone         String?
  grade         String?
  section       String?
  rollNumber    String?
  admissionDate DateTime?
  parentName    String?
  parentPhone   String?
  
  enrollments   Enrollment[]
  examResults   ExamResult[]
  
  createdAt     DateTime @default(now())
  
  @@index([tenantId])
}

model Teacher {
  id            String   @id @default(uuid())
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  tenantId      String
  user          User?    @relation(fields: [userId], references: [id])
  userId        String?
  
  name          String
  email         String?
  phone         String?
  subject       String?
  qualification String?
  
  classes       Class[]
  
  createdAt     DateTime @default(now())
  
  @@index([tenantId])
}

model Class {
  id            String   @id @default(uuid())
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  tenantId      String
  
  name          String
  grade         String?
  section       String?
  teacher       Teacher? @relation(fields: [teacherId], references: [id])
  teacherId     String?
  
  students      Enrollment[]
  
  createdAt     DateTime @default(now())
  
  @@index([tenantId])
}

model Enrollment {
  id            String   @id @default(uuid())
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  tenantId      String
  
  student       Student  @relation(fields: [studentId], references: [id])
  studentId     String
  class         Class    @relation(fields: [classId], references: [id])
  classId       String
  
  enrolledAt    DateTime @default(now())
  
  @@unique([studentId, classId])
  @@index([tenantId])
}

model Exam {
  id            String   @id @default(uuid())
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  tenantId      String
  
  name          String
  subject       String
  totalMarks    Int
  passingMarks  Int
  examDate      DateTime
  
  results       ExamResult[]
  
  createdAt     DateTime @default(now())
  
  @@index([tenantId])
}

model ExamResult {
  id            String   @id @default(uuid())
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  tenantId      String
  
  student       Student  @relation(fields: [studentId], references: [id])
  studentId     String
  exam          Exam     @relation(fields: [examId], references: [id])
  examId        String
  
  marksObtained Int
  grade         String?
  remarks       String?
  
  @@unique([studentId, examId])
  @@index([tenantId])
}
```

---

## Phase 3: Create Tenant Admin App (Port 4006)

### 3.1 App Structure

```
apps/tenant-admin/
  app/
    layout.tsx                    -- Root layout with tenant context
    [subdomain]/
      layout.tsx                  -- Tenant shell with dynamic sidebar
      login/page.tsx              -- Tenant login
      dashboard/page.tsx          -- Domain-specific dashboard
      members/page.tsx            -- Fitness: Members
      trainers/page.tsx           -- Fitness: Trainers
      appointments/page.tsx       -- Salon: Appointments
      students/page.tsx           -- School: Students
      teachers/page.tsx           -- School: Teachers
      classes/page.tsx            -- School: Classes
      crm/page.tsx                -- Base: CRM (always available)
      finance/page.tsx            -- Base: Finance (always available)
      users/page.tsx              -- Base: Users (always available)
      settings/page.tsx           -- Base: Settings (always available)
  components/
    TenantSidebar.tsx             -- Dynamic sidebar based on domain modules
    TenantHeader.tsx              -- Tenant header with branding
  lib/
    api.ts                        -- Tenant-scoped API client
  package.json                    -- port 4006
```

### 3.2 Dynamic Sidebar Based on Domain

**File**: `apps/tenant-admin/components/TenantSidebar.tsx`

```typescript
const DOMAIN_MENUS = {
  FITNESS_CENTER: [
    { name: 'Dashboard', href: '/dashboard', icon: 'Chart' },
    { name: 'Members', href: '/members', icon: 'Users' },
    { name: 'Trainers', href: '/trainers', icon: 'User' },
    { name: 'Classes', href: '/classes', icon: 'Calendar' },
    { name: 'CRM', href: '/crm', icon: 'Inbox' },
    { name: 'Finance', href: '/finance', icon: 'Dollar' },
    { name: 'Settings', href: '/settings', icon: 'Settings' },
  ],
  SALON_AND_SPA: [
    { name: 'Dashboard', href: '/dashboard', icon: 'Chart' },
    { name: 'Appointments', href: '/appointments', icon: 'Calendar' },
    { name: 'Stylists', href: '/stylists', icon: 'Users' },
    { name: 'Services', href: '/services', icon: 'Scissors' },
    { name: 'CRM', href: '/crm', icon: 'Inbox' },
    { name: 'Finance', href: '/finance', icon: 'Dollar' },
    { name: 'Settings', href: '/settings', icon: 'Settings' },
  ],
  // ... other domains
}
```

### 3.3 Domain-Specific Dashboard

Each domain has its own dashboard with relevant widgets:

**Fitness Dashboard**: Active members, expiring memberships, today's sessions, revenue
**Salon Dashboard**: Today's appointments, available stylists, revenue, popular services
**School Dashboard**: Total students, attendance today, upcoming exams, fee collection

---

## Phase 4: Create Tenant Website App (Port 4005)

### 4.1 App Structure

```
apps/tenant-website/
  app/
    layout.tsx                    -- Root layout
    [subdomain]/
      layout.tsx                  -- Public site with tenant branding
      page.tsx                    -- Landing page
      about/page.tsx              -- About us
      services/page.tsx           -- Services/Products
      contact/page.tsx            -- Contact form
      book/page.tsx               -- Booking/Appointments
      login/page.tsx              -- Customer login
      register/page.tsx           -- Customer registration
      dashboard/page.tsx          -- Customer dashboard
  components/
    PublicHeader.tsx              -- Tenant branding header
    PublicFooter.tsx              -- Tenant footer
  lib/
    api.ts                        -- Public API client
  package.json                    -- port 4005
```

### 4.2 Dynamic Branding

The website loads tenant branding from API:
- Logo, favicon, primary color
- Site title, tagline
- Custom domain support

---

## Phase 5: Implement Domain-Specific APIs

### 5.1 Fitness API

**File**: `packages/fitness/`

```
packages/fitness/
  src/
    members/
      members.controller.ts
      members.service.ts
      dto/
    trainers/
      trainers.controller.ts
      trainers.service.ts
      dto/
    sessions/
      sessions.controller.ts
      sessions.service.ts
      dto/
    index.ts
  package.json
```

**Endpoints**:
- `GET /fitness/members` - List members
- `POST /fitness/members` - Create member
- `GET /fitness/trainers` - List trainers
- `POST /fitness/sessions` - Schedule session

### 5.2 Salon API

**File**: `packages/salon/`

**Endpoints**:
- `GET /salon/appointments` - List appointments
- `POST /salon/appointments` - Book appointment
- `GET /salon/stylists` - List stylists
- `GET /salon/services` - List services

### 5.3 School API

**File**: `packages/school/`

**Endpoints**:
- `GET /school/students` - List students
- `POST /school/students` - Enroll student
- `GET /school/classes` - List classes
- `POST /school/exams` - Create exam

---

## Phase 6: Update Tenant Creation Flow

### 6.1 Auto-Provision Domain Modules

**Modify**: `packages/tenant/src/tenant/tenant.service.ts`

```typescript
async create(createTenantDto: CreateTenantDto) {
  // 1. Create tenant
  const tenant = await this.prisma.tenant.create({ ... });
  
  // 2. Provision domain modules
  await this.domainProvisioning.provision(tenant.id, createTenantDto.domainCode);
  
  // 3. Create admin user
  // 4. Set up billing
  
  return tenant;
}
```

### 6.2 Domain Provisioning Logic

```typescript
async provision(tenantId: string, domainCode: string) {
  // 1. Enable base modules
  const baseModules = ['AUTH', 'CRM', 'FINANCE', 'USERS', 'SETTINGS', 'NOTIFICATIONS'];
  for (const moduleCode of baseModules) {
    await this.enableModule(tenantId, moduleCode);
  }
  
  // 2. Enable domain modules
  const domainModules = DOMAIN_MODULES[domainCode] || [];
  for (const moduleCode of domainModules) {
    await this.enableModule(tenantId, moduleCode);
  }
  
  // 3. Create domain roles
  await this.createDomainRoles(tenantId, domainCode);
  
  // 4. Set up domain menus
  await this.setupDomainMenus(tenantId, domainCode);
}
```

---

## Phase 7: Branch Support

### 7.1 Existing Branch System

Already implemented in `apps/api/src/modules/branch/`. Supports:
- Multiple branches per tenant
- Branch-specific users
- Branch-specific settings

### 7.2 Enhance for Domain-Specific Needs

- Fitness: Branch = Gym location
- Salon: Branch = Salon branch
- School: Branch = Campus
- Restaurant: Branch = Restaurant location

---

## Execution Order

1. **Phase 1**: Enhance domain provisioning (2 days)
2. **Phase 2**: Create domain-specific models (3 days)
3. **Phase 3**: Build tenant-admin app (5 days)
4. **Phase 4**: Build tenant-website app (3 days)
5. **Phase 5**: Implement domain APIs (5 days)
6. **Phase 6**: Update tenant creation flow (1 day)
7. **Phase 7**: Enhance branch support (2 days)

**Total**: ~21 days

---

## Key Principles

1. **Modular**: Each domain module is independent
2. **Scalable**: Easy to add new domains/modules
3. **Flexible**: Tenants can customize workflows
4. **Secure**: Tenant isolation at all levels
5. **Performant**: Optimized queries with proper indexing
