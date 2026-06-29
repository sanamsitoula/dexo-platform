# Database Schema Design v1

## Overview
Multi-tenant-ready database schema designed for PostgreSQL with Prisma ORM. Schema is designed to support horizontal scaling, tenant isolation, and evolution from modular monolith to microservices.

## Core Design Principles

### Tenant Isolation Strategy
- **Approach**: Shared database, shared schema with tenant_id column isolation
- **Rationale**: 
  - Simplest to implement and maintain for MVP
  - Lower operational overhead than separate databases/schemata
  - Easy backup/restore and cross-tenant analytics (when needed with proper isolation)
  - Scales well to target of 10,000 tenants with proper indexing
- **Alternative Considered**: 
  - Separate databases per tenant (rejected: operational complexity, backup/restore complexity)
  - Separate schemas per tenant (rejected: similar complexity to separate DBs)
  - Hybrid approach (rejected: premature optimization)

### Multi-Tenant Ready Design
- Every table that stores tenant-specific data includes a `tenant_id` foreign key
- Tenant_id is enforced via Row Level Security (RLS) policies at database level
- Application layer also validates tenant_id for defense in depth
- Shared tables (like system configuration) do not have tenant_id

### Scalability Considerations
- Proper indexing strategy for tenant_id + common query columns
- Partitioning strategy designed for future implementation
- Read replica readiness for horizontal read scaling
- Connection pooling configured for PgBouncer

## Core Tables

### 1. Tenants Table
```sql
Table: tenants
Columns:
- id: UUID (Primary Key)
- name: VARCHAR(255) NOT NULL
- subdomain: VARCHAR(100) UNIQUE (for tenant.example.com)
- domain: VARCHAR(255) (for custom domains)
- status: ENUM('active', 'suspended', 'trial', 'cancelled') NOT NULL
- plan_id: UUID (Foreign Key to plans)
- settings: JSONB (tenant-specific configuration)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- trial_ends_at: TIMESTAMPTZ (NULL for non-trial)
- created_by: UUID (reference to users who created tenant)
```

### 2. Users Table
```sql
Table: users
Columns:
- id: UUID (Primary Key)
- tenant_id: UUID (Foreign Key to tenants) - NULL for system/users
- email: VARCHAR(255) NOT NULL
- password_hash: VARCHAR(255) NOT NULL
- first_name: VARCHAR(100)
- last_name: VARCHAR(100)
- phone: VARCHAR(20)
- avatar_url: VARCHAR(500)
- status: ENUM('active', 'inactive', 'pending_verification', 'locked') NOT NULL
- email_verified: BOOLEAN DEFAULT FALSE
- mfa_enabled: BOOLEAN DEFAULT FALSE
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- last_login_at: TIMESTAMPTZ
- invited_by: UUID (Self-referencing to users)
- invitation_token: VARCHAR(255) (for email invitations)
- invitation_expires_at: TIMESTAMPTZ
```

### 3. Roles Table
```sql
Table: roles
Columns:
- id: UUID (Primary Key)
- tenant_id: UUID (Foreign Key to tenants) - NULL for system roles
- name: VARCHAR(100) NOT NULL
- description: TEXT
- is_system: BOOLEAN DEFAULT FALSE (cannot be deleted if true)
- permissions: JSONB (stores permission IDs or permission rules)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### 4. Permissions Table
```sql
Table: permissions
Columns:
- id: UUID (Primary Key)
- resource: VARCHAR(100) NOT NULL (e.g., 'users', 'billing', 'reports')
- action: VARCHAR(50) NOT NULL (e.g., 'create', 'read', 'update', 'delete')
- description: TEXT
- tenant_id: UUID (Foreign Key to tenants) - NULL for system permissions
- created_at: TIMESTAMPTZ
```

### 5. User_Role_Junction (Many-to-Many)
```sql
Table: user_roles
Columns:
- user_id: UUID (Foreign Key to users)
- role_id: UUID (Foreign Key to roles)
- assigned_by: UUID (Foreign Key to users)
- assigned_at: TIMESTAMPTZ
- PRIMARY KEY (user_id, role_id)
```

### 6. Subscription Plans Table
```sql
Table: plans
Columns:
- id: UUID (Primary Key)
- name: VARCHAR(100) NOT NULL
- slug: VARCHAR(100) UNIQUE NOT NULL
- description: TEXT
- price_cents: INTEGER NOT NULL
- currency: VARCHAR(3) DEFAULT 'USD'
- billing_interval: ENUM('monthly', 'yearly') NOT NULL
- features: JSONB (list of enabled features)
- limits: JSONB (user limits, API limits, storage limits, etc.)
- is_active: BOOLEAN DEFAULT TRUE
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### 7. Subscriptions Table
```sql
Table: subscriptions
Columns:
- id: UUID (Primary Key)
- tenant_id: UUID (Foreign Key to tenants)
- plan_id: UUID (Foreign Key to plans)
- status: ENUM('active', 'trial', 'past_due', 'canceled', 'unpaid') NOT NULL
- current_period_start: TIMESTAMPTZ
- current_period_end: TIMESTAMPTZ
- trial_start: TIMESTAMPTZ
- trial_end: TIMESTAMPTZ
- canceled_at: TIMESTAMPTZ
- ended_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### 8. Audit Logs Table
```sql
Table: audit_logs
Columns:
- id: UUID (Primary Key)
- tenant_id: UUID (Foreign Key to tenants) - NULL for system events
- user_id: UUID (Foreign Key to users) - NULL for system actions
- action: VARCHAR(100) NOT NULL (e.g., 'user.created', 'tenant.updated')
- resource_type: VARCHAR(100) (e.g., 'user', 'tenant', 'billing')
- resource_id: UUID (reference to the resource)
- changes: JSONB (before/after states for update/delete)
- ip_address: INET
- user_agent: TEXT
- created_at: TIMESTAMPTZ
```

### 9. Notification Templates Table
```sql
Table: notification_templates
Columns:
- id: UUID (Primary Key)
- tenant_id: UUID (Foreign Key to tenants) - NULL for system templates
- name: VARCHAR(100) NOT NULL
- type: ENUM('email', 'sms', 'push', 'in-app') NOT NULL
- subject: VARCHAR(255) (for email/templates that need subject)
- body: TEXT NOT NULL
- variables: JSONB (list of template variables like {{user_name}})
- is_active: BOOLEAN DEFAULT TRUE
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### 10. Files Table (for S3 metadata)
```sql
Table: files
Columns:
- id: UUID (Primary Key)
- tenant_id: UUID (Foreign Key to tenants)
- user_id: UUID (Foreign Key to users) - NULL for system files
- s3_key: VARCHAR(500) NOT NULL (the S3 object key)
- original_name: VARCHAR(255) NOT NULL
- mime_type: VARCHAR(100)
- size_bytes: BIGINT
- is_public: BOOLEAN DEFAULT FALSE
- uploaded_at: TIMESTAMPTZ
```

## Indexing Strategy

### Critical Indexes for Performance
```sql
-- Tenant isolation indexes (most critical)
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_roles_tenant_id ON roles(tenant_id);
CREATE INDEX idx_permissions_tenant_id ON permissions(tenant_id);
CREATE INDEX idx_subscriptions_tenant_id ON subscriptions(tenant_id);
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_files_tenant_id ON files(tenant_id);

-- Query optimization indexes
CREATE INDEX idx_users_email_tenant ON users(tenant_id, email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_files_s3_key ON files(s3_key);
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_domain ON tenants(domain);
CREATE INDEX idx_tenants_status ON tenants(status);

-- Composite indexes for common queries
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
```

## Row Level Security (RLS) Policy Example
```sql
-- Enable RLS on tenants table
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own tenant
CREATE POLICY tenant_isolation ON tenants
FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Similar policies applied to all tenant-specific tables
```

## Prisma Schema Example
```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Tenant {
  id            String   @id @default(uuid())
  name          String
  subdomain     String?  @unique
  domain        String?
  status        TenantStatus @default(active)
  plan          Plan?    @relation(fields: [planId], references: [id])
  planId        String?
  settings      Json?
  users         User[]
  roles         Role[]
  subscriptions Subscription[]
  auditLogs     AuditLog[]
  files         File[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  trialEndsAt   DateTime?
}

model User {
  id            String   @id @default(uuid())
  tenant        Tenant?  @relation(fields: [tenantId], references: [id])
  tenantId      String?
  email         String
  passwordHash  String
  firstName     String?
  lastName      String?
  phone         String?
  avatarUrl     String?
  status        UserStatus @default(active)
  emailVerified Boolean @default(false)
  mfaEnabled    Boolean @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  lastLoginAt   DateTime?
  roles         Role[]   @relation("UserRoles")
  auditLogs     AuditLog[]
  files         File[]
  invitedBy     User?    @relation("Invitations", fields: [invitedById], references: [id])
  invitedById   String?
  invitationToken String?
  invitationExpiresAt DateTime?
  @@index([tenantId])
  @@index([email])
}

model Role {
  id            String   @id @default(uuid())
  tenant        Tenant?  @relation(fields: [tenantId], references: [id])
  tenantId      String?
  name          String
  description   String?
  isSystem      Boolean @default(false)
  permissions   Json?
  users         User[]   @relation("UserRoles")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([tenantId])
}

model Permission {
  id            String   @id @default(uuid())
  resource      String
  action        String
  description   String?
  tenant        Tenant?  @relation(fields: [tenantId], references: [id])
  tenantId      String?
  createdAt     DateTime @default(now())
  @@index([tenantId])
  @@unique([resource, action, tenantId])
}

model UserRoles {
  user      User @relation(fields: [userId], references: [id])
  userId    String
  role      Role @relation(fields: [roleId], references: [id])
  roleId    String
  assignedBy User? @relation("AssignedBy", fields: [assignedById], references: [id])
  assignedById String?
  assignedAt DateTime @default(now())
  @@id([userId, roleId])
}

// Additional models for Plan, Subscription, AuditLog, NotificationTemplate, File follow similar pattern
```

## Data Types Rationale

### UUID vs Auto-increment
- **Chosen**: UUID v4 for all primary keys
- **Why**: 
  - Prevents ID enumeration attacks
  - Enables safe merging of databases (important for multi-tenant)
  - Works well with distributed systems
  - No coordination needed for ID generation
- **Trade-off**: Slightly larger index size vs auto-increment integers

### JSONB for Flexible Fields
- **Used for**: Settings, features, limits, permissions, audit changes
- **Why**: 
  - Schemaless flexibility for tenant-specific configurations
  - Efficient querying and indexing capabilities in PostgreSQL
  - Avoids schema migrations for configuration changes
- **Trade-off**: Less rigid than normalized tables; mitigated by application validation

### ENUM vs Lookup Tables
- **Chosen**: ENUM for fixed, infrequently changing statuses
- **Why**: 
  - Performance benefits for small, static sets
  - Simplicity for status fields like user status, tenant status
- **Used Lookup Tables** when values might need frequent updates or localization

## Migration Strategy
### v1 to v2 Evolution
1. **Add Partitioning**: When tenant count exceeds 1K, implement tenant_id range partitioning
2. **Read Replicas**: Deploy PostgreSQL read replicas for analytics/reporting workloads
3. **Column Encryption**: Implement pgcrypto for PII fields as compliance requirements grow
4. **Archiving**: Move old audit logs to cheaper storage (S3 + Athena) after retention period
5. **Connection Pooling**: Implement PgBouncer for efficient connection management

## Backup Strategy
- **Point-in-Time Recovery**: WAL archiving enabled
- **Logical Backups**: Daily pg_dump of entire database
- **Snapshot Backups**: Weekly filesystem snapshots (if using managed DB)
- **Cross-Region**: WAL shipping to secondary region for disaster recovery
- **Retention**: 30 days daily, 12 weeks weekly, 12 months monthly backups

## Performance Benchmarks (Target)
- Simple tenant-scoped queries: <50ms 95th percentile
- Complex reports with joins: <200ms 95th percentile
- Write operations: <100ms 95th percentile
- Concurrent connections: 200+ with PgBouncer
- Table sizes: Designed for 10M+ rows per core table before partitioning needed