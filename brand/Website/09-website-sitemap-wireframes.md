# DEXO — Website Sitemap & Wireframes

## Sitemap
```
dexo.dev
├── / (Landing)
├── /features
│   ├── /features/multi-tenancy
│   ├── /features/white-label
│   ├── /features/billing
│   ├── /features/auth-rbac
│   └── /features/api
├── /pricing            (cloud tiers + self-host = free)
├── /enterprise
├── /open-source
├── /docs               (separate app, docs.dexo.dev)
├── /blog
├── /community          (Discord, GitHub, Discussions)
├── /roadmap            (public, synced from GitHub Projects)
├── /templates          (starter kits: CRM, ERP, internal tools)
├── /integrations
├── /partners
├── /careers
├── /contact
└── /legal (privacy, terms, security, DPA)
```

## Landing page wireframe
```
┌──────────────────────────────────────────────────────┐
│ NAV  [◇DEXO] Features Pricing Docs Blog   [★ 12.4k] [Start building] │
├──────────────────────────────────────────────────────┤
│ HERO (Ink bg, isogrid, indigo glow)                  │
│   badge: "Open source · MIT"                         │
│   H1: Ship your SaaS, not your scaffolding.          │
│   sub: Multi-tenant, white-label platform — auth,    │
│        orgs, RBAC, billing, domains. Self-hosted.    │
│   [Start building]  [Star on GitHub]                 │
│   > npx create-dexo-app   (copyable)                 │
│   [====== product screenshot in browser frame ======]│
├──────────────────────────────────────────────────────┤
│ LOGO BAR  "Powering platforms at" (6 mono logos)     │
├──────────────────────────────────────────────────────┤
│ FEATURE GRID (3×2 cards, icon+title+2 lines)         │
│  Multi-tenant · White-label · Billing                │
│  Auth & RBAC · API-first · Deploy anywhere           │
├──────────────────────────────────────────────────────┤
│ DEEP DIVE 1 (split: copy left, dashboard shot right) │
│  "One core. Infinite tenants."                       │
│ DEEP DIVE 2 (split reversed, theme-engine demo)      │
│  "Your brand on every pixel."                        │
│ DEEP DIVE 3 (code block: REST + webhook example)     │
│  "An API you'd design yourself."                     │
├──────────────────────────────────────────────────────┤
│ OPEN SOURCE BAND (Ink, lime accents)                 │
│  stars · contributors · commits — live counters      │
│  [View on GitHub]                                    │
├──────────────────────────────────────────────────────┤
│ TESTIMONIALS (3 cards, avatar+quote+role)            │
├──────────────────────────────────────────────────────┤
│ TEMPLATES STRIP (horizontal scroll cards)            │
├──────────────────────────────────────────────────────┤
│ CTA BAND: "Launch this weekend." [Start building]    │
├──────────────────────────────────────────────────────┤
│ FOOTER: 5 columns + newsletter + social + status dot │
└──────────────────────────────────────────────────────┘
```

## Pricing page wireframe
```
H1 "Free to own. Paid to relax." — toggle Self-hosted / Cloud
┌─────────┬─────────┬─────────┬─────────┐
│ SELF-   │ CLOUD   │ CLOUD   │ ENTER-  │
│ HOSTED  │ STARTER │ PRO ◆   │ PRISE   │
│ $0/∞    │ $29/mo  │ $99/mo  │ Custom  │
│ all core│ 3 orgs  │ ∞ orgs  │ SSO,SLA │
│ features│ managed │ +domains│ support │
│[Deploy] │[Start]  │[Start]  │[Talk]   │
└─────────┴─────────┴─────────┴─────────┘
Feature comparison table → FAQ (8 items) → CTA band
```

## Feature subpage template
Hero (H1 + illustration) → 3 benefit cards → deep-dive with screenshot → code example → related features → CTA. Every feature page ends with `npx create-dexo-app`.

## Docs shell
Left sidebar (collapsible tree) · center content (68ch) · right "On this page" TOC · top search (⌘K). Dark default, light toggle.

## Page metadata pattern
Title: `{Page} — DEXO` · OG image: auto-generated per page (Ink bg, isogrid, page title in Space Grotesk, mark bottom-right).
