export interface TenantContext {
  id: string;
  slug: string;
  domainType: string;
  status: 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED' | 'DELETION_SCHEDULED' | 'DELETED';
  branding: {
    name: string;
    colorPrimary: string;
    colorAccent: string;
    colorBg: string;
    logoUrl?: string;
    fontHeading?: string;
  };
}

const cache = new Map<string, { ctx: TenantContext; at: number }>();
const CACHE_TTL_MS = 5 * 60_000;

interface LifecycleRow {
  status: string;
  subdomainSlug: string;
  customDomain: string | null;
  customDomainVerified: boolean;
  tenant: {
    id: string;
    name: string;
    domainType: string;
    colorPrimary: string | null;
    colorAccent: string | null;
    colorBg: string | null;
    logoUrl: string | null;
  };
}

export async function resolveTenant(
  hostname: string,
  prisma: { tenantLifecycle: {
    findFirst: (args: unknown) => Promise<LifecycleRow | null>;
  } },
): Promise<TenantContext | null> {
  const cached = cache.get(hostname);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.ctx;

  const subdomain = parseSubdomain(hostname);
  const lifecycle = await prisma.tenantLifecycle.findFirst({
    where: {
      OR: [
        subdomain ? { subdomainSlug: subdomain } : { id: 'NEVER' },
        { customDomain: hostname, customDomainVerified: true },
      ],
    },
    include: { tenant: true },
  });

  if (!lifecycle) return null;
  if (lifecycle.status !== 'ACTIVE') return null;

  const ctx: TenantContext = {
    id: lifecycle.tenant.id,
    slug: lifecycle.subdomainSlug,
    domainType: lifecycle.tenant.domainType,
    status: lifecycle.status as TenantContext['status'],
    branding: {
      name: lifecycle.tenant.name,
      colorPrimary: lifecycle.tenant.colorPrimary || '#1f2937',
      colorAccent: lifecycle.tenant.colorAccent || '#3b82f6',
      colorBg: lifecycle.tenant.colorBg || '#ffffff',
      logoUrl: lifecycle.tenant.logoUrl || undefined,
      fontHeading: 'Inter',
    },
  };
  cache.set(hostname, { ctx, at: Date.now() });
  return ctx;
}

export function parseSubdomain(hostname: string): string | null {
  const host = hostname.split(':')[0].toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === 'dexo.localhost') return null;
  const parts = host.split('.');
  // *.dexo.com → first part
  if (parts.length >= 3 && parts.slice(-2).join('.') === 'dexo.com') {
    const sub = parts[0];
    if (sub && !['www', 'admin', 'api', 'cdn', 'docs', 'status', 'portal'].includes(sub)) {
      return sub;
    }
  }
  // *.localhost → first part
  if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
    return parts[0] || null;
  }
  return null;
}

export function clearCache(hostname?: string) {
  if (hostname) cache.delete(hostname);
  else cache.clear();
}
