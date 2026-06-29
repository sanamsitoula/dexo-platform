# Implementation Plan: Blog Management, Dynamic Theme & White-Label Platform

## Overview
This plan adds three major features to the Dexo platform:
1. **Blog Management** - Platform-level and tenant-level blogs with categories, authors, comments
2. **Dynamic Platform Theme** - Modern, customizable theme with CSS variables and templates
3. **White-Label Branding** - Full platform branding customization (logo, colors, name, favicon)

---

## Phase 1: Database Schema for Blog Management

### `[MODIFY] prisma/schema.prisma`

Add the following models:

```prisma
model Blog {
  id            String    @id @default(uuid())
  title         String
  slug          String    @unique
  content       String    // Markdown or HTML content
  excerpt       String?   // Short summary
  featuredImage String?   // URL to featured image
  status        BlogStatus @default(draft)
  publishedAt   DateTime?
  scheduledAt   DateTime? // For scheduled publishing
  
  // Relations
  author        User      @relation("BlogAuthor", fields: [authorId], references: [id])
  authorId      String
  category      BlogCategory? @relation(fields: [categoryId], references: [id])
  categoryId    String?
  
  // Tenant scoping (null = platform blog)
  tenant        Tenant?   @relation(fields: [tenantId], references: [id])
  tenantId      String?
  
  // SEO
  metaTitle     String?
  metaDescription String?
  
  // Stats
  viewCount     Int       @default(0)
  likeCount     Int       @default(0)
  
  // Timestamps
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Relations
  comments      BlogComment[]
  tags          BlogTag[]
  
  @@index([tenantId])
  @@index([authorId])
  @@index([categoryId])
  @@index([status])
  @@index([slug])
}

model BlogCategory {
  id          String    @id @default(uuid())
  name        String
  slug        String    @unique
  description String?
  color       String?   // Hex color for category badge
  icon        String?   // Icon name
  
  // Tenant scoping (null = platform category)
  tenant      Tenant?   @relation(fields: [tenantId], references: [id])
  tenantId    String?
  
  // Hierarchy
  parent      BlogCategory? @relation("CategoryHierarchy", fields: [parentId], references: [id])
  parentId    String?
  children    BlogCategory[] @relation("CategoryHierarchy")
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  blogs       Blog[]
  
  @@index([tenantId])
  @@index([slug])
}

model BlogComment {
  id          String    @id @default(uuid())
  content     String
  status      CommentStatus @default(pending)
  
  // Relations
  blog        Blog      @relation(fields: [blogId], references: [id], onDelete: Cascade)
  blogId      String
  author      User      @relation("CommentAuthor", fields: [authorId], references: [id])
  authorId    String
  
  // For guest comments (optional)
  guestName   String?
  guestEmail  String?
  
  // Timestamps
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@index([blogId])
  @@index([authorId])
  @@index([status])
}

model BlogTag {
  id          String    @id @default(uuid())
  name        String    @unique
  slug        String    @unique
  
  createdAt   DateTime  @default(now())
  
  blogs       Blog[]
}

enum BlogStatus {
  draft
  published
  scheduled
  archived
}

enum CommentStatus {
  pending
  approved
  rejected
  spam
}
```

Add relations to existing models:

```prisma
// In User model
blogs         Blog[]        @relation("BlogAuthor")
comments      BlogComment[] @relation("CommentAuthor")

// In Tenant model
blogs         Blog[]
blogCategories BlogCategory[]
```

---

## Phase 2: Blog Management API

### `[NEW] packages/blog/` (NestJS module)

**Structure:**
```
packages/blog/
  src/
    blog/
      blog.module.ts
      blog.controller.ts
      blog.service.ts
      dto/
        create-blog.dto.ts
        update-blog.dto.ts
        query-blog.dto.ts
    category/
      category.module.ts
      category.controller.ts
      category.service.ts
      dto/
        create-category.dto.ts
        update-category.dto.ts
    comment/
      comment.module.ts
      comment.controller.ts
      comment.service.ts
      dto/
        create-comment.dto.ts
    index.ts
  package.json
  tsconfig.json
```

**Key Endpoints:**

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/blogs` | Public | List published blogs (platform or tenant-scoped) |
| GET | `/blogs/:slug` | Public | Get single blog by slug |
| POST | `/blogs` | PlatformAdmin OR TenantAdmin | Create blog |
| PUT | `/blogs/:id` | PlatformAdmin OR TenantAdmin | Update blog |
| DELETE | `/blogs/:id` | PlatformAdmin OR TenantAdmin | Delete blog |
| POST | `/blogs/:id/publish` | PlatformAdmin OR TenantAdmin | Publish blog |
| GET | `/blogs/my` | Authenticated | Get user's own blogs |
| GET | `/blog-categories` | Public | List categories |
| POST | `/blog-categories` | PlatformAdmin OR TenantAdmin | Create category |
| PUT | `/blog-categories/:id` | PlatformAdmin OR TenantAdmin | Update category |
| DELETE | `/blog-categories/:id` | PlatformAdmin OR TenantAdmin | Delete category |
| GET | `/blogs/:id/comments` | Public | Get approved comments |
| POST | `/blogs/:id/comments` | Authenticated | Add comment |
| PUT | `/comments/:id/status` | PlatformAdmin OR TenantAdmin | Moderate comment |

**Tenant Scoping Logic:**
- If `req.user.isPlatformAdmin` → can manage all platform blogs (tenantId = null)
- If `req.user.tenantId` → can only manage blogs for their tenant
- Public API accepts `?tenant=subdomain` to fetch tenant-specific blogs

---

## Phase 3: Blog Management UI (Admin App)

### `[NEW] apps/admin/app/blogs/`

**Structure:**
```
apps/admin/app/blogs/
  page.tsx              -- Blog list with filters (status, category, author)
  new/page.tsx          -- Create new blog (rich text editor)
  [id]/
    page.tsx            -- Edit blog
    comments/page.tsx   -- Manage comments
```

**Components:**
```
apps/admin/components/blog/
  BlogEditor.tsx        -- Rich text editor (using TipTap or similar)
  BlogCard.tsx          -- Blog preview card
  CategorySelector.tsx  -- Category dropdown with create option
  TagInput.tsx          -- Tag input with autocomplete
  FeaturedImageUpload.tsx -- Image upload component
  CommentList.tsx       -- Comment moderation list
  BlogStats.tsx         -- View count, likes display
```

**Features:**
- Markdown/HTML editor with preview
- Featured image upload
- Category and tag management
- SEO fields (meta title, description)
- Scheduled publishing
- Comment moderation
- Draft/Published/Archived status management

---

## Phase 4: Dynamic Platform Theme System

### `[MODIFY] apps/admin/app/globals.css`

Enhance CSS variables for full theming:

```css
@import "tailwindcss";

@layer base {
  :root {
    /* Primary brand colors */
    --color-primary: #4f46e5;
    --color-primary-hover: #4338ca;
    --color-primary-light: #eef2ff;
    --color-primary-rgb: 79, 70, 229;
    
    /* Secondary colors */
    --color-secondary: #6b7280;
    --color-secondary-hover: #4b5563;
    
    /* Accent colors */
    --color-accent: #10b981;
    --color-accent-hover: #059669;
    
    /* Semantic colors */
    --color-success: #16a34a;
    --color-warning: #f59e0b;
    --color-danger: #dc2626;
    --color-info: #0ea5e9;
    
    /* Layout */
    --sidebar-width: 16rem;
    --header-height: 4rem;
    --border-radius: 0.5rem;
    
    /* Typography */
    --font-family-base: 'Inter', system-ui, -apple-system, sans-serif;
    --font-family-heading: 'Inter', system-ui, -apple-system, sans-serif;
    
    /* Backgrounds */
    --bg-primary: #ffffff;
    --bg-secondary: #f9fafb;
    --bg-tertiary: #f3f4f6;
    
    /* Text */
    --text-primary: #111827;
    --text-secondary: #6b7280;
    --text-muted: #9ca3af;
    
    /* Shadows */
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
    
    /* Transitions */
    --transition-fast: 150ms;
    --transition-base: 250ms;
  }

  /* Dark mode support */
  [data-theme="dark"] {
    --bg-primary: #1f2937;
    --bg-secondary: #111827;
    --bg-tertiary: #374151;
    --text-primary: #f9fafb;
    --text-secondary: #d1d5db;
    --text-muted: #9ca3af;
  }
}

@layer components {
  .btn-primary {
    @apply inline-flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white;
    background-color: var(--color-primary);
    transition: all var(--transition-fast);
  }
  
  .btn-primary:hover {
    background-color: var(--color-primary-hover);
  }

  .btn-secondary {
    @apply inline-flex items-center justify-center gap-2 py-2.5 px-4 border rounded-lg shadow-sm text-sm font-medium;
    border-color: var(--color-secondary);
    color: var(--text-primary);
    background-color: var(--bg-primary);
  }

  .card {
    @apply bg-white shadow-sm rounded-xl p-6 border;
    border-color: rgb(229, 231, 235);
    box-shadow: var(--shadow-sm);
    border-radius: var(--border-radius);
  }

  .input-primary {
    @apply block w-full px-4 py-2.5 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm transition-colors;
    border-color: rgb(209, 213, 219);
    border-radius: var(--border-radius);
  }
  
  .input-primary:focus {
    --tw-ring-color: var(--color-primary);
    border-color: var(--color-primary);
  }
}
```

### `[NEW] apps/admin/lib/theme.ts`

Theme management utility:

```typescript
export interface ThemeConfig {
  // Colors
  primaryColor: string;
  primaryHoverColor: string;
  secondaryColor: string;
  accentColor: string;
  
  // Layout
  borderRadius: string;
  fontFamily: string;
  
  // Logo & Branding
  logoUrl: string;
  faviconUrl: string;
  platformName: string;
  
  // Dark mode
  darkMode: boolean;
}

export const defaultTheme: ThemeConfig = {
  primaryColor: '#4f46e5',
  primaryHoverColor: '#4338ca',
  secondaryColor: '#6b7280',
  accentColor: '#10b981',
  borderRadius: '0.5rem',
  fontFamily: 'Inter, system-ui, sans-serif',
  logoUrl: '/logo.svg',
  faviconUrl: '/favicon.ico',
  platformName: 'Dexo',
  darkMode: false,
};

export function applyTheme(config: Partial<ThemeConfig>) {
  const root = document.documentElement;
  
  if (config.primaryColor) {
    root.style.setProperty('--color-primary', config.primaryColor);
  }
  if (config.primaryHoverColor) {
    root.style.setProperty('--color-primary-hover', config.primaryHoverColor);
  }
  // ... apply other properties
  
  if (config.darkMode) {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }
}

export function loadTheme() {
  const stored = localStorage.getItem('platform-theme');
  if (stored) {
    const config = JSON.parse(stored);
    applyTheme(config);
    return config;
  }
  applyTheme(defaultTheme);
  return defaultTheme;
}
```

### `[NEW] apps/admin/components/ThemeProvider.tsx`

Theme context provider:

```typescript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { ThemeConfig, defaultTheme, applyTheme, loadTheme } from '@/lib/theme';

interface ThemeContextType {
  theme: ThemeConfig;
  updateTheme: (config: Partial<ThemeConfig>) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);

  useEffect(() => {
    const loaded = loadTheme();
    setTheme(loaded);
  }, []);

  const updateTheme = (config: Partial<ThemeConfig>) => {
    const newTheme = { ...theme, ...config };
    setTheme(newTheme);
    localStorage.setItem('platform-theme', JSON.stringify(newTheme));
    applyTheme(newTheme);
  };

  const resetTheme = () => {
    setTheme(defaultTheme);
    localStorage.removeItem('platform-theme');
    applyTheme(defaultTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

---

## Phase 5: Theme Template Selection

### `[NEW] apps/admin/app/settings/theme/page.tsx`

Theme customization page with:
- Color picker for primary, secondary, accent colors
- Border radius slider
- Font family selector
- Dark mode toggle
- Logo upload
- Favicon upload
- Platform name input

### `[NEW] apps/admin/components/theme/ThemeTemplates.tsx`

Pre-built theme templates:

```typescript
export const themeTemplates = [
  {
    id: 'indigo-modern',
    name: 'Indigo Modern',
    preview: '/themes/indigo-modern.png',
    config: {
      primaryColor: '#4f46e5',
      primaryHoverColor: '#4338ca',
      secondaryColor: '#6b7280',
      accentColor: '#10b981',
      borderRadius: '0.5rem',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
  },
  {
    id: 'emerald-nature',
    name: 'Emerald Nature',
    preview: '/themes/emerald-nature.png',
    config: {
      primaryColor: '#059669',
      primaryHoverColor: '#047857',
      secondaryColor: '#78716c',
      accentColor: '#f59e0b',
      borderRadius: '0.75rem',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
  },
  {
    id: 'rose-elegant',
    name: 'Rose Elegant',
    preview: '/themes/rose-elegant.png',
    config: {
      primaryColor: '#e11d48',
      primaryHoverColor: '#be123c',
      secondaryColor: '#64748b',
      accentColor: '#8b5cf6',
      borderRadius: '1rem',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
  },
  {
    id: 'slate-professional',
    name: 'Slate Professional',
    preview: '/themes/slate-professional.png',
    config: {
      primaryColor: '#1e40af',
      primaryHoverColor: '#1e3a8a',
      secondaryColor: '#475569',
      accentColor: '#0891b2',
      borderRadius: '0.375rem',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
  },
  {
    id: 'amber-warm',
    name: 'Amber Warm',
    preview: '/themes/amber-warm.png',
    config: {
      primaryColor: '#d97706',
      primaryHoverColor: '#b45309',
      secondaryColor: '#78716c',
      accentColor: '#dc2626',
      borderRadius: '0.625rem',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
  },
  {
    id: 'violet-creative',
    name: 'Violet Creative',
    preview: '/themes/violet-creative.png',
    config: {
      primaryColor: '#7c3aed',
      primaryHoverColor: '#6d28d9',
      secondaryColor: '#6b7280',
      accentColor: '#ec4899',
      borderRadius: '1.5rem',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
  },
];
```

---

## Phase 6: White-Label Branding

### `[MODIFY] prisma/schema.prisma`

Add PlatformBranding model:

```prisma
model PlatformBranding {
  id              String    @id @default(uuid())
  
  // Identity
  platformName    String    @default("Dexo")
  tagline         String?   @default("Multi-tenant SaaS Platform")
  
  // Logos
  logoUrl         String?
  logoDarkUrl     String?   // For dark mode
  faviconUrl      String?
  ogImageUrl      String?   // For social sharing
  
  // Contact
  supportEmail    String?
  supportPhone    String?
  websiteUrl      String?
  
  // Social
  twitterUrl      String?
  linkedinUrl     String?
  githubUrl       String?
  
  // Footer
  footerText      String?
  privacyPolicyUrl String?
  termsOfServiceUrl String?
  
  // SEO
  defaultMetaTitle String?
  defaultMetaDescription String?
  
  // Theme reference
  themeConfig     Json?     // Store theme settings
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

### `[NEW] apps/admin/app/settings/branding/page.tsx`

Branding settings page with:
- Platform name and tagline
- Logo upload (light and dark versions)
- Favicon upload
- Social media links
- Footer customization
- SEO defaults

### `[NEW] apps/admin/app/settings/branding/preview/page.tsx`

Live preview of branding changes:
- Sidebar preview
- Login page preview
- Public pages preview

---

## Phase 7: Update Settings API

### `[MODIFY] packages/settings/src/settings/settings.controller.ts`

Add branding endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/settings/branding` | Get platform branding (public) |
| PUT | `/settings/branding` | Update branding (platform admin only) |
| POST | `/settings/branding/logo` | Upload logo |
| POST | `/settings/branding/favicon` | Upload favicon |

### `[MODIFY] packages/settings/src/settings/settings.service.ts`

Add branding methods:
- `getBranding()` - Get or create branding record
- `updateBranding(data)` - Update branding
- `uploadLogo(file)` - Handle logo upload
- `uploadFavicon(file)` - Handle favicon upload

---

## Phase 8: Update Admin Layout

### `[MODIFY] apps/admin/components/ClientLayout.tsx`

- Wrap with `ThemeProvider`
- Load branding on mount
- Apply theme from settings

### `[MODIFY] apps/admin/components/AdminSidebar.tsx`

- Use `useTheme()` for dynamic styling
- Display platform logo from branding
- Display platform name from branding

### `[MODIFY] apps/admin/app/layout.tsx`

- Add ThemeProvider
- Load branding metadata

---

## Files to Create/Modify Summary

| Action | File | Description |
|--------|------|-------------|
| MODIFY | `prisma/schema.prisma` | Add Blog, BlogCategory, BlogComment, BlogTag, PlatformBranding models |
| NEW | `packages/blog/` | Full blog management module |
| MODIFY | `apps/api/src/app.module.ts` | Import BlogModule |
| NEW | `apps/admin/app/blogs/` | Blog management UI |
| NEW | `apps/admin/app/settings/theme/` | Theme customization UI |
| NEW | `apps/admin/app/settings/branding/` | Branding settings UI |
| NEW | `apps/admin/lib/theme.ts` | Theme utilities |
| NEW | `apps/admin/components/ThemeProvider.tsx` | Theme context |
| NEW | `apps/admin/components/theme/ThemeTemplates.tsx` | Pre-built themes |
| MODIFY | `apps/admin/app/globals.css` | Enhanced CSS variables |
| MODIFY | `apps/admin/components/ClientLayout.tsx` | Add ThemeProvider |
| MODIFY | `apps/admin/components/AdminSidebar.tsx` | Dynamic branding |
| MODIFY | `packages/settings/` | Branding API endpoints |
| MODIFY | `apps/admin/lib/api.ts` | Add blog and branding API clients |
| MODIFY | `apps/admin/components/AdminSidebar.tsx` | Add Blogs menu item |

---

## Execution Order

1. **Phase 1**: Schema changes (Blog models, PlatformBranding)
2. **Phase 2**: Blog API module
3. **Phase 3**: Blog management UI
4. **Phase 4**: Dynamic theme system (CSS variables, ThemeProvider)
5. **Phase 5**: Theme template selection UI
6. **Phase 6**: White-label branding (schema, API, UI)
7. **Phase 7**: Update settings API for branding
8. **Phase 8**: Update admin layout with theme integration

---

## Tenant Isolation Notes

- Platform blogs: `tenantId = null` → visible on platform landing page
- Tenant blogs: `tenantId = <uuid>` → visible on tenant website
- Blog categories follow same pattern
- Comments are scoped to their blog
- Tenant admins can only manage their own blogs/categories
- Platform admins can manage all

---

## White-Label Considerations

- Theme settings stored in `PlatformBranding.themeConfig`
- Logo/favicon served from `/api/settings/branding/logo` and `/favicon`
- Platform name used in:
  - Login page title
  - Sidebar header
  - Page titles
  - Email templates
  - SEO metadata
- All changes are platform-wide, do NOT affect tenant apps
- Tenant apps have their own branding in `Tenant.settings`
