import fs from 'fs';
import path from 'path';

/** Whitelisted repo docs published on the platform site (/docs). */
export const DOCS: Record<string, { title: string; description: string; file: string }> = {
  'brand-guide': {
    title: 'Brand Guide for Developers',
    description: 'The Dexo brand system in code — tokens, typography, the platform vs tenant brand boundary, and the rules every UI change must follow.',
    file: 'docs/BRAND-GUIDE-FOR-DEVELOPERS.md',
  },
  'developer-guide': {
    title: 'Developer Guide',
    description: 'System map, auth, multi-tenancy, module anatomy, and recipes: third-party integrations, SMS OTP, new apps, and platform modules tenants can enhance (HR example).',
    file: 'docs/DEVELOPER-GUIDE.md',
  },
  'auth-rbac': {
    title: 'Auth & RBAC Design',
    description: 'Authentication flows, JWT structure, roles and permission model across platform and tenant layers.',
    file: '05_Auth_RBAC_Design.md',
  },
  'api-conventions': {
    title: 'API Design Conventions',
    description: 'REST standards for the Dexo API — routing, guards, tenant scoping, errors, pagination and naming.',
    file: '06_API_Design_Conventions.md',
  },
};

/** Map repo-relative markdown filenames → published /docs slugs (for link rewriting). */
export const FILE_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(DOCS).map(([slug, d]) => [d.file.split('/').pop() as string, slug]),
);

/** Resolve the monorepo root from the running app (apps/platform-web). */
export function readDoc(slug: string): string | null {
  const doc = DOCS[slug];
  if (!doc) return null;
  const candidates = [
    path.join(process.cwd(), '..', '..', doc.file), // apps/platform-web → repo root
    path.join(process.cwd(), doc.file),             // started from repo root
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8');
    } catch { /* try next */ }
  }
  return null;
}
