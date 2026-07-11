'use client';

/**
 * Tenant identity for the customer portal — name, business type and branding
 * resolved once per session from /api/tenants/resolve (works for platform
 * subdomains, portal.<t> hosts and custom domains alike). NO business type is
 * hardcoded: fitness tenants get fitness data sources, salons get salon copy,
 * and so on (see lib/vertical.ts).
 */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { resolveSubdomain } from './api';
import { resolveVertical, VerticalConfig } from './vertical';

const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '');
const CACHE_KEY = 'dexo_tenant_info';
const CACHE_TTL_MS = 10 * 60 * 1000;

export interface TenantInfo {
  id: string;
  name: string;
  subdomain: string;
  domainType: string | null;
  branding: { colorPrimary?: string; colorAccent?: string; logo?: string; templateId?: string } | null;
}

interface Ctx {
  info: TenantInfo | null;
  vertical: VerticalConfig;
  loading: boolean;
  primary: string;
  accent: string;
}

const TenantCtx = createContext<Ctx | undefined>(undefined);

export function TenantInfoProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const slug = resolveSubdomain();
    // Session cache — avoid re-resolving on every page.
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const { at, slug: cachedSlug, data } = JSON.parse(raw);
        if (cachedSlug === slug && Date.now() - at < CACHE_TTL_MS) {
          setInfo(data);
          setLoading(false);
          return;
        }
      }
    } catch { /* corrupt cache — refetch */ }

    fetch(`${API_HOST}/api/tenants/resolve?host=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setInfo(data);
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), slug, data }));
          } catch { /* storage full — fine */ }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const vertical = resolveVertical(info?.domainType);
  const primary = info?.branding?.colorPrimary || 'var(--brand-primary, #EA580C)';
  const accent = info?.branding?.colorAccent || 'var(--brand-accent, #F59E0B)';

  return (
    <TenantCtx.Provider value={{ info, vertical, loading, primary, accent }}>
      {children}
    </TenantCtx.Provider>
  );
}

export function useTenantInfo(): Ctx {
  const c = useContext(TenantCtx);
  if (!c) throw new Error('useTenantInfo must be used within TenantInfoProvider');
  return c;
}
