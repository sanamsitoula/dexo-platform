# Dexo — Future Business Template Expansion

> **Document type:** Planning & architecture reference
> **Status:** Draft — not yet implemented
> **Companion files:**
> - `scripts/seed/visual-templates/` — currently implemented visual seed
> - `scripts/seed/01-domain-templates.ts` — base structural seed (Phase 2)
> - `DEXO_MASTER_PROMPT_v5.md` — platform architecture reference

---

## Purpose

This document captures everything that sits *beyond* the current
`BusinessTypeTemplate` model — features, data layers, and architectural
expansions that should be built once the core platform (Phases 0–11) is
stable. Nothing in this document is needed to ship v1. Everything here is
designed to be added **without breaking existing tenants**.

---

## Current State vs. Target State

```
CURRENT (Phase 2 output)
────────────────────────
BusinessTypeTemplate
  ├── identity      (name, description, tagline)
  ├── branding      (colors, fonts, heroImage)
  ├── websiteSections  (section on/off + variant + style)
  ├── onboardingSteps  (step definitions)
  ├── dashboardLayout  (widget grid)
  └── features         (feature flags)


TARGET (this document)
──────────────────────
BusinessTypeTemplate          ← unchanged, remains the structural core
  │
  ├── BusinessTypeAssets      ← NEW: AI prompt library + brand asset specs
  │     ├── aiPrompts         (per-section generation prompts)
  │     ├── imagePrompts      (Midjourney/Flux/DALL·E prompts per asset)
  │     ├── copyPrompts       (hero copy, CTA, SEO copy prompts)
  │     ├── emailPrompts      (onboarding + automation email prompts)
  │     └── socialPrompts     (per-platform marketing prompts)
  │
  ├── TenantGeneratedContent  ← NEW: per-tenant AI output, stored + editable
  │     ├── websiteCopy       (generated headlines, body text, CTAs)
  │     ├── seoAssets         (meta title, description, OG image, schema)
  │     ├── emailSequences    (welcome, reminder, upsell — generated)
  │     └── socialPosts       (ready-to-publish content per platform)
  │
  ├── BusinessTypeTheme       ← NEW: multiple visual themes per domain type
  │     ├── themeKey          (e.g. "pulse-3d", "soft-minimal", "corporate")
  │     ├── colorTokens       (full design token set)
  │     ├── componentVariants (section → variant mapping)
  │     └── animationPreset   (none | subtle | immersive)
  │
  └── TemplateMarketplace     ← FUTURE: tenant-selectable premium themes
        ├── community themes  (user-submitted)
        ├── premium themes    (paid, platform revenue)
        └── white-label       (custom themes for enterprise tenants)
```

---

## Layer 1 — BusinessTypeAssets (Priority: High)

### What it is
A companion model to `BusinessTypeTemplate` that stores AI generation
prompts. During tenant onboarding, Dexo calls the Claude API with the
relevant prompts + the tenant's business info to generate personalized
website copy, SEO metadata, and marketing content automatically.

### Why a separate model
- Keeps `BusinessTypeTemplate` lean (structural config only)
- Allows prompt iteration without schema migrations
- Makes it easy to A/B test different prompt strategies
- Allows prompts to be versioned independently of template structure

### Prisma schema (future migration)

```prisma
model BusinessTypeAssets {
  id           String     @id @default(cuid())
  domainType   DomainType @unique
  template     BusinessTypeTemplate @relation(fields: [domainType], references: [domainType])

  // Per-section website copy generation prompts
  // Key = section name (hero, services, testimonials, etc.)
  // Value = prompt string fed to AI with tenant context injected
  aiCopyPrompts      Json   // { hero: "...", services: "...", cta: "..." }

  // Image/video asset generation prompts
  // Used with Midjourney, Flux, DALL·E, RunwayML, etc.
  aiImagePrompts     Json   // { hero: "...", gallery: "...", team: "..." }

  // SEO asset generation prompts
  aiSeoPrompts       Json   // { metaTitle: "...", metaDesc: "...", schema: "..." }

  // Email automation prompts (one per email type)
  aiEmailPrompts     Json   // { welcome: "...", reminder: "...", upsell: "..." }

  // Social media prompts (one per platform)
  aiSocialPrompts    Json   // { instagram: "...", facebook: "...", linkedin: "..." }

  // Logo & icon direction prompts
  aiLogoPrompts      Json   // { logoStyle: "...", iconSet: "...", colorMood: "..." }

  // Prompt schema version — allows future breaking changes
  promptVersion      String @default("1.0")

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### Prompt structure convention

Every prompt in `aiCopyPrompts` follows this template so the generation
service can inject tenant data consistently:

```
{TENANT_NAME} is a {DOMAIN_TYPE_LABEL} located in {CITY}.
Their target audience is {AUDIENCE}.
Their unique selling point is {USP}.

Task: {SPECIFIC_GENERATION_INSTRUCTION}

Requirements:
• {REQUIREMENT_1}
• {REQUIREMENT_2}
• Tone: {TONE}
• Length: {LENGTH_GUIDANCE}
• Output format: {FORMAT}
```

### Example: FITNESS_CENTER aiCopyPrompts

```json
{
  "hero": {
    "headline": "Generate a powerful hero headline for a fitness center called {TENANT_NAME}. Under 8 words. Action-oriented, energetic, speaks to transformation. No clichés like 'unleash your potential'.",
    "subheadline": "Generate a 1–2 sentence hero subheadline for {TENANT_NAME}. Should mention location ({CITY}) and a specific benefit (e.g. expert trainers, 24/7 access, results guaranteed). Conversational, not corporate.",
    "ctaPrimary": "Generate a CTA button label for a fitness free trial. 3–5 words. Urgent but not pushy.",
    "ctaSecondary": "Generate a secondary CTA for a gym website. Something like 'See our classes' or 'Meet the trainers'. 3–5 words."
  },
  "stats": {
    "items": "Generate 4 impressive stat labels for a fitness center (e.g. 'Members', 'Trainers', 'Classes Per Week', 'Locations'). Return as JSON array of strings."
  },
  "services": {
    "sectionHeading": "Generate a section heading for the programs/classes section of {TENANT_NAME}. 3–6 words. Energetic.",
    "cardDescriptions": "For each of these programs: {SERVICES_LIST}, write a 1-sentence benefit-focused description. Return as JSON object keyed by program name."
  },
  "cta": {
    "finalCta": "Generate the final CTA section headline and button text for {TENANT_NAME}. The headline should create urgency. Button: 3–5 words."
  }
}
```

### Seed file location (when ready)

```
scripts/seed/visual-templates/
  seed-visual-assets.ts      ← NEW: seeds BusinessTypeAssets for all 12 types
  index.ts                   ← UPDATE: add call to seedVisualAssets()
```

---

## Layer 2 — TenantGeneratedContent (Priority: High)

### What it is
Per-tenant storage for AI-generated content. Generated once during
onboarding, stored in the DB, editable by the tenant owner at any time,
and re-generatable with one click.

### Why store it
- Tenant website renders from DB, not re-calling AI on every page load
- Tenants can edit generated content (their brand voice may differ)
- Allows content versioning and rollback
- Audit trail of what was generated vs. manually edited

### Prisma schema (future migration)

```prisma
model TenantGeneratedContent {
  id         String   @id @default(cuid())
  tenantId   String   @unique
  tenant     Tenant   @relation(fields: [tenantId], references: [id])

  // Generated website copy per section
  websiteCopy     Json    // { hero: { headline, subheadline, cta }, services: [...], ... }

  // Generated SEO metadata
  seoAssets       Json    // { metaTitle, metaDescription, ogImagePrompt, schema, keywords[] }

  // Generated email sequences
  emailSequences  Json    // { welcome: {subject, body}, reminder: {...}, upsell: {...} }

  // Generated social media posts (ready to publish)
  socialPosts     Json    // { instagram: [...], facebook: [...], linkedin: [...] }

  // Generation metadata
  generatedAt     DateTime @default(now())
  generatedBy     String   // "ai" | "manual" | "ai+edited"
  promptVersion   String   // which prompt schema version was used
  model           String   // which AI model was used (e.g. "claude-sonnet-4-6")

  // Manually edited fields tracking
  editedFields    Json     @default("[]")  // list of dot-paths that tenant edited

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

### Generation flow (future service)

```
Tenant completes onboarding Step 4 (branding)
  → TenantContentService.generate(tenantId)
      → Load BusinessTypeAssets.aiCopyPrompts for domainType
      → Inject tenant context (name, city, USP, services, etc.)
      → Call Claude API (claude-sonnet-4-6) with assembled prompts
      → Parse structured JSON response
      → Store in TenantGeneratedContent
      → Emit 'tenant.content.generated' event
          → Email tenant owner: "Your website content is ready"
          → Trigger website preview build
```

### API endpoints (future Phase)

```
GET  /api/tenants/:id/content              → get current generated content
POST /api/tenants/:id/content/regenerate   → regenerate all (or specific sections)
PUT  /api/tenants/:id/content/section/:key → manually edit a section
GET  /api/tenants/:id/content/history      → content version history
```

---

## Layer 3 — BusinessTypeTheme (Priority: Medium)

### What it is
Right now each `BusinessTypeTemplate` has a single visual identity
(one color palette, one font pair, one set of section variants).
`BusinessTypeTheme` allows **multiple named themes per domain type**
so tenants can choose their visual direction during onboarding.

### Example: FITNESS_CENTER themes

| Theme Key       | Vibe                          | Primary    | Accent    | Font Heading    |
|:----------------|:------------------------------|:-----------|:----------|:----------------|
| `pulse-3d`      | Dark neon, 3D, glassmorphism  | `#FF4500`  | `#00F0FF` | Space Grotesk   |
| `soft-athletic` | Light, clean, minimal         | `#2E7D32`  | `#66BB6A` | Plus Jakarta    |
| `bold-strength` | Dark, bold typography, red    | `#B71C1C`  | `#FF6F00` | Barlow          |
| `luxury-gym`    | Premium dark, gold accents    | `#1C1C1E`  | `#D4AF37` | Cormorant       |

### Prisma schema (future migration)

```prisma
model BusinessTypeTheme {
  id           String     @id @default(cuid())
  domainType   DomainType
  themeKey     String     // e.g. "pulse-3d", "soft-athletic"
  name         String     // display name: "Pulse 3D", "Soft Athletic"
  description  String
  isPremium    Boolean    @default(false)
  previewImage String?    // thumbnail for theme picker UI

  // Full design token set
  colorTokens  Json
  // {
  //   primary, accent, bg, surface, text, textMuted,
  //   border, shadow, success, warning, error
  // }

  // Typography
  fontHeading  String
  fontBody     String
  fontMono     String?

  // Section component variant overrides
  sectionVariants Json
  // { hero: "video-bg-3d", services: "3d-tilt-cards", ... }

  // Animation intensity
  animationPreset String @default("subtle")
  // "none" | "subtle" | "immersive"

  createdAt    DateTime @default(now())

  @@unique([domainType, themeKey])
}
```

### Onboarding integration (future Step)

```
Onboarding Step 4 (current): Upload branding
  → Add sub-step: Choose your visual theme
      → Display theme picker showing BusinessTypeTheme options for domainType
      → Tenant selects theme → saved to Tenant.selectedThemeKey
      → Branding loader merges: template defaults ← selected theme ← tenant overrides
```

---

## Layer 4 — AI Image Asset Generation Pipeline (Priority: Medium)

### What it is
A background job pipeline that takes `BusinessTypeAssets.aiImagePrompts`
and generates actual image files for each tenant's website, stored in MinIO.

### Flow

```
Tenant completes onboarding
  → ImageGenerationQueue.add({ tenantId, domainType })
      → Load aiImagePrompts for domainType
      → Inject tenant context
      → Call image generation API (Flux / DALL·E / Midjourney via proxy)
      → Upload generated images to MinIO at:
            /tenants/{tenantId}/generated/hero.jpg
            /tenants/{tenantId}/generated/gallery-1.jpg
            etc.
      → Update TenantGeneratedContent.websiteCopy._meta.generatedImages
      → Emit 'tenant.images.generated'
```

### Image prompt example: FITNESS_CENTER hero

```
Cinematic fitness hero image for a gym called "{TENANT_NAME}" located in {CITY}.
Dark studio environment with dramatic rim lighting. A diverse group of athletes
mid-workout — strength training, cardio, functional fitness. Neon orange and cyan
accent lighting. High energy. Shot on RED camera, shallow depth of field.
No text or logos in the image. 16:9 aspect ratio. 8K quality.
Style: editorial fitness photography meets Unreal Engine 5 render.
```

### Supported generators (plug-in via adapter pattern)

| Generator   | API            | Best for                  | Cost tier |
|:------------|:---------------|:--------------------------|:----------|
| DALL·E 3    | OpenAI         | Fast, general, consistent | Low       |
| Flux Pro    | fal.ai         | Photorealistic, detail    | Medium    |
| Stable XL   | Stability AI   | Stylized, controllable    | Low       |
| Midjourney  | Unofficial API | Aesthetic, editorial      | Medium    |
| RunwayML    | runway.ml      | Video / hero videos       | High      |

---

## Layer 5 — Template Marketplace (Priority: Low / Future v2)

### What it is
A marketplace where platform admins, agencies, and community members
can publish additional visual themes for any domain type. Tenants can
browse and apply marketplace themes from their admin portal.

### Business model options

| Model              | Description                                              |
|:-------------------|:---------------------------------------------------------|
| Free community     | Open-source themes submitted by the community            |
| Premium (one-time) | Paid themes; revenue split between creator and platform  |
| Subscription tier  | Premium themes bundled into higher subscription plans    |
| White-label        | Enterprise tenants can upload fully custom themes        |

### Architecture notes

- Marketplace themes are stored in a `MarketplaceTheme` model
- They extend `BusinessTypeTheme` with `publisherId`, `price`, `downloads`
- Theme application is non-destructive — original template always recoverable
- Themes are sandboxed — no arbitrary JS, CSS custom properties only

---

## Layer 6 — Marketing Automation Assets (Priority: Medium)

### What it is
Pre-built email sequences and social media content templates stored per
domain type, personalized for each tenant during onboarding.

### Email sequences per domain type

| Sequence          | Triggers                              | Emails |
|:------------------|:--------------------------------------|:-------|
| Welcome           | Tenant onboarding complete            | 3      |
| Customer welcome  | Customer joins tenant platform        | 2      |
| Abandoned booking | Customer starts but doesn't complete  | 2      |
| Re-engagement     | No activity in 30 days                | 3      |
| Renewal reminder  | Membership/subscription expiring      | 3      |
| Upsell            | After first purchase/booking          | 2      |
| Review request    | 48h after service completion          | 1      |
| Birthday          | Customer birthday (if collected)      | 1      |

### Social media content library

Each domain type gets a library of 30 ready-to-edit social posts:
- 10 × educational / value posts
- 10 × promotional posts
- 5 × testimonial/social proof templates
- 5 × behind-the-scenes templates

Stored in `BusinessTypeAssets.aiSocialPrompts`, generated per-tenant
into `TenantGeneratedContent.socialPosts` during onboarding.

---

## Layer 7 — Advanced Analytics & Conversion Optimization (Priority: Low)

### Planned additions to dashboardLayout

```json
{
  "conversionFunnel": {
    "enabled": true,
    "steps": ["Website Visit", "CTA Click", "Form Submit", "Booking/Purchase", "Return Visit"]
  },
  "heatmapIntegration": {
    "enabled": false,
    "provider": "hotjar | microsoft-clarity | posthog"
  },
  "abTestingSupport": {
    "enabled": false,
    "testableElements": ["hero-headline", "cta-text", "pricing-variant"]
  }
}
```

### Tenant-facing analytics endpoints (future)

```
GET /api/analytics/tenant/overview       → visits, conversions, revenue trend
GET /api/analytics/tenant/funnel         → funnel drop-off per step
GET /api/analytics/tenant/content        → which sections users engage with
GET /api/analytics/tenant/ab-results     → A/B test performance
```

---

## Implementation Roadmap

### Phase A — After Phase 11 completes (v1 stable)
1. Add `BusinessTypeAssets` model + migration
2. Write `scripts/seed/visual-templates/seed-visual-assets.ts`
3. Build `TenantContentService` (Claude API integration)
4. Add `TenantGeneratedContent` model + migration
5. Wire content generation into tenant onboarding completion

### Phase B — v1.1
6. Add `BusinessTypeTheme` model + multi-theme picker in onboarding Step 4
7. Update branding loader to merge selected theme tokens
8. Add `PUT /api/tenants/:id/content/section/:key` (manual content editing)
9. Build content editor UI in `apps/tenant-admin`

### Phase C — v1.2
10. Image generation pipeline (DALL·E 3 as default adapter)
11. Email sequence generation + integration with notifications package
12. Social media content library generation

### Phase D — v2.0
13. Template Marketplace (community themes)
14. Advanced analytics + conversion funnel
15. A/B testing framework
16. Premium themes (paid) + white-label enterprise themes

---

## Files to Create When Starting Each Phase

### Phase A
```
packages/cms/src/
  content-generator.service.ts    ← Claude API prompt assembly + calling
  content-generator.types.ts      ← TypeScript types for all prompt/output shapes
  content-generator.test.ts       ← Unit tests with mocked API responses

scripts/seed/visual-templates/
  seed-visual-assets.ts           ← Seeds BusinessTypeAssets for all 12 types
  assets/
    fitness-center.prompts.ts     ← Prompt definitions (one file per domain)
    restaurant.prompts.ts
    ecommerce.prompts.ts
    healthcare.prompts.ts
    salon.prompts.ts
    hotel.prompts.ts
    school.prompts.ts
    coaching.prompts.ts
    logistics.prompts.ts
    tailor.prompts.ts
    ngo.prompts.ts
    sme-corporate.prompts.ts

apps/api/src/modules/
  tenant-content/
    tenant-content.module.ts
    tenant-content.service.ts
    tenant-content.controller.ts
    dto/
      regenerate-content.dto.ts
      update-section-content.dto.ts
```

### Phase B
```
apps/tenant-admin/app/
  (tenant)/settings/content/
    page.tsx                      ← Content editor main page
    [section]/
      page.tsx                    ← Per-section editor

apps/tenant-website/components/
  sections/
    variants/                     ← One file per variant token
      ImmersiveVideoHero.tsx
      ParallaxProductHero.tsx
      TrustBuilderHero.tsx
      GlassmorphismCards.tsx
      ... (one per variant string in seed)
```

---

## Naming Conventions

| Thing                   | Convention                              | Example                       |
|:------------------------|:----------------------------------------|:------------------------------|
| Theme key               | kebab-case                              | `pulse-3d`, `warm-bistro`     |
| Section variant token   | kebab-case                              | `video-bg-3d`, `glass-cards`  |
| Section style modifier  | kebab-case                              | `glassmorphism-cta`, `neon-border` |
| Widget style token      | kebab-case                              | `neon-chart`, `gold-accent`   |
| Prompt file             | `{domain-type}.prompts.ts`              | `fitness-center.prompts.ts`   |
| Generated content key   | camelCase dot-path                      | `hero.headline`, `seo.metaTitle` |
| AI model reference      | Anthropic model string                  | `claude-sonnet-4-6`           |

---

## Key Decisions Already Made

These are locked — do not revisit without a full architecture review:

1. **Structural config lives in `BusinessTypeTemplate`** — not in the new layers
2. **AI generation is onboarding-time, not request-time** — generated once, stored, editable
3. **Theme selection is per-tenant** — stored in `Tenant.selectedThemeKey` (future field)
4. **Prompts are versioned** — `promptVersion` field allows migration of existing tenants when prompts improve
5. **Image generation is async** — via BullMQ queue, never blocking onboarding
6. **Marketplace themes are CSS/token-only** — no arbitrary JS execution in tenant themes

---

*Last updated: 2026-06-26*
*Next review: After Phase 11 completes*
