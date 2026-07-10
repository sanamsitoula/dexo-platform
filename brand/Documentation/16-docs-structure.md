# DEXO — Documentation Structure

## Information architecture (docs.dexo.dev)
```
Getting started
  ├ What is DEXO?          (concepts in 5 min)
  ├ Quick start            (npx → running app, ≤ 10 min)
  └ Core concepts          (Tenant, Org, Workspace, Plan, Role)
Installation
  ├ Docker (recommended)   (compose file, env reference)
  ├ Kubernetes             (Helm chart, values.yaml reference, HPA notes)
  ├ Cloud guides           (AWS ECS, GCP Cloud Run, Hetzner, Railway, Coolify)
  └ From source            (Node 20+, Postgres 15+, Redis, pnpm)
Guides
  ├ Multi-tenancy          (isolation model, tenant resolution, data partitioning)
  ├ White-labeling         (theme engine, custom domains + SSL, email branding)
  ├ Auth & RBAC            (providers, SSO/OIDC, roles, permission matrix)
  ├ Billing                (Stripe setup, plans, metering, invoices, webhooks)
  ├ Storage & files        · Notifications · Localization · Plugins
API
  ├ Authentication         (API keys, scopes)
  ├ REST reference         (auto-generated from OpenAPI)
  ├ Webhooks               (events catalog, signatures, retries)
  └ Rate limits & errors   (error code table)
SDK & CLI
  ├ JS/TS SDK · Go SDK     (install, typed client examples)
  └ dexo CLI               (init, deploy, tenant, migrate commands)
Architecture
  ├ System overview        (diagram: gateway → core → tenant DB strategy)
  ├ Tenant isolation       (row-level vs schema vs database modes)
  └ Scaling & performance
Operations
  ├ Upgrades & migrations · Backups · Monitoring · Hardening checklist
Troubleshooting & FAQ
```

## Quick start (content skeleton)
1. `npx create-dexo-app my-platform` 2. `docker compose up` 3. open localhost:3000, create admin 4. create first Tenant 5. invite a teammate, assign role 6. flip theme colors 7. call `GET /api/v1/tenants` with your key. Each step: one command/screenshot + one sentence of what just happened. Ends with "Where next" cards.

## Writing standards
Every page answers one task. Code blocks runnable verbatim (copy button). Tabs for Docker/K8s/source variants. Admonitions: Note/Warning/Danger only. Every guide ends with "Troubleshooting" accordion + "Next" link. Versioned docs from v1.0; `latest` alias.

## FAQ seed (8)
Is DEXO really free? (yes, MIT — cloud is optional) · How is tenant data isolated? · Can I remove all DEXO branding? (yes — that's the point) · Does billing require Stripe? (default provider; adapter interface for others) · Production-ready? · How do upgrades work? · SSO support? · How do I get help?
