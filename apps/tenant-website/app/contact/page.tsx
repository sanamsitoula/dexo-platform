// Tenant public Contact Us page
// Pulls branch info (address, geo, hours, phone) from /api/branches for the active tenant
// Submits to /api/contact with subdomain → stored as ContactMessage (tenant-scoped)

import { headers } from 'next/headers';
import { getSiteNav } from '@/lib/api';
import { getSiteTheme } from '@/lib/site-theme';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import ContactForm from './ContactForm';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'onedexo.com';

async function getBranches(subdomain: string) {
  try {
    const res = await fetch(`${API_URL}/api/branches?subdomain=${subdomain}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data ?? json ?? [];
  } catch {
    return [];
  }
}

async function getTenantInfo(subdomain: string) {
  try {
    const res = await fetch(`${API_URL}/api/tenants/subdomain/${subdomain}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? json;
  } catch {
    return null;
  }
}

async function getPublicWhatsApp(subdomain: string): Promise<{ isEnabled: boolean; phoneNumber: string; displayName: string | null }> {
  try {
    const res = await fetch(`${API_URL}/api/whatsapp/public/${subdomain}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { isEnabled: false, phoneNumber: '', displayName: null };
    return await res.json();
  } catch {
    return { isEnabled: false, phoneNumber: '', displayName: null };
  }
}

const card = {
  backgroundColor: 'var(--site-surface)',
  border: '1px solid var(--site-border)',
  borderRadius: 'var(--site-radius)',
} as const;

export default async function ContactPage() {
  const h = headers();
  const subdomain = h.get('x-tenant-slug') || '';

  const [branches, tenant, whatsapp, theme, navItems] = await Promise.all([
    getBranches(subdomain),
    getTenantInfo(subdomain),
    getPublicWhatsApp(subdomain),
    getSiteTheme(subdomain),
    getSiteNav(subdomain),
  ]);

  const hq = branches.find((b: any) => b.isHeadquarters) ?? branches[0];
  const tenantName = tenant?.name ?? subdomain;
  const tenantPhone = (tenant?.settings as any)?.phone ?? hq?.phone ?? '';
  const tenantEmail = (tenant?.settings as any)?.email ?? hq?.email ?? `hello@${subdomain}.${PLATFORM_DOMAIN}`;
  const whatsappNumber = whatsapp.isEnabled ? whatsapp.phoneNumber : '';
  const whatsappDisplay = whatsapp.displayName;

  return (
    <div style={{ background: 'var(--site-bg)', color: 'var(--site-text)', minHeight: '100vh' }}>
      <SiteNav theme={theme} name={tenantName} active="/contact" navItems={navItems} />

      {/* Hero */}
      <section className="text-center px-4 py-16 max-w-3xl mx-auto">
        <p className="text-sm uppercase tracking-widest" style={{ color: 'var(--site-sub)' }}>Contact</p>
        <h1 className="mt-3 text-4xl font-extrabold">Get in Touch</h1>
        <p className="mt-3" style={{ color: 'var(--site-sub)' }}>
          We&apos;d love to hear from you. Reach out about memberships, classes, training, or anything else.
        </p>
      </section>

      <main className="max-w-6xl mx-auto pb-16 px-4 grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Contact info + branches */}
        <section>
          <h2 className="text-2xl font-bold">Contact Information</h2>
          <p className="mt-2" style={{ color: 'var(--site-sub)' }}>
            Visit any of our branches, call us, or message us via WhatsApp. We respond within 24 hours.
          </p>

          <div className="mt-6 space-y-6">
            <div className="flex items-start gap-3">
              <span className="mt-1 text-xl" aria-hidden>✉️</span>
              <div>
                <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--site-sub)' }}>Email</div>
                <a href={`mailto:${tenantEmail}`} className="hover:underline" style={{ color: 'var(--site-primary)' }}>{tenantEmail}</a>
              </div>
            </div>

            {tenantPhone && (
              <div className="flex items-start gap-3">
                <span className="mt-1 text-xl" aria-hidden>📞</span>
                <div>
                  <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--site-sub)' }}>Phone</div>
                  <a href={`tel:${tenantPhone}`} className="hover:underline" style={{ color: 'var(--site-primary)' }}>{tenantPhone}</a>
                </div>
              </div>
            )}

            {whatsappNumber && (
              <div className="flex items-start gap-3">
                <span className="mt-1 text-xl" aria-hidden>💬</span>
                <div>
                  <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--site-sub)' }}>WhatsApp</div>
                  <a
                    href={`https://wa.me/${whatsappNumber}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center px-3 py-1 mt-1 bg-green-500 text-white text-sm hover:bg-green-600"
                    style={{ borderRadius: 'var(--site-radius)' }}
                  >
                    Chat on WhatsApp{whatsappDisplay ? ` with ${whatsappDisplay}` : ''}
                  </a>
                </div>
              </div>
            )}

            {hq && (
              <div className="flex items-start gap-3">
                <span className="mt-1 text-xl" aria-hidden>📍</span>
                <div>
                  <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--site-sub)' }}>Headquarters</div>
                  <address className="not-italic" style={{ color: 'var(--site-sub)' }}>
                    {hq.address && <div>{hq.address}</div>}
                    {hq.city && <div>{[hq.city, hq.state, hq.postalCode].filter(Boolean).join(', ')}</div>}
                    {hq.country && <div>{hq.country}</div>}
                  </address>
                  {hq.latitude && hq.longitude && (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${hq.latitude}&mlon=${hq.longitude}#map=16/${hq.latitude}/${hq.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-sm hover:underline"
                      style={{ color: 'var(--site-primary)' }}
                    >
                      View on map →
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* All branches list */}
          {branches.length > 1 && (
            <div className="mt-10">
              <h3 className="text-lg font-semibold">Our Branches</h3>
              <ul className="mt-3 space-y-3">
                {branches.map((b: any) => (
                  <li key={b.id} className="p-4" style={card}>
                    <div className="font-semibold flex items-center gap-2">
                      {b.name}
                      {b.isHeadquarters && (
                        <span
                          className="text-xs px-2 py-0.5 rounded font-semibold"
                          style={{ background: 'var(--site-primary)', color: 'var(--site-on-primary)' }}
                        >
                          HQ
                        </span>
                      )}
                    </div>
                    {b.address && <div className="text-sm mt-1" style={{ color: 'var(--site-sub)' }}>{b.address}</div>}
                    {b.city && <div className="text-sm" style={{ color: 'var(--site-sub)' }}>{[b.city, b.state].filter(Boolean).join(', ')}</div>}
                    {b.phone && <div className="text-sm mt-1" style={{ color: 'var(--site-sub)' }}>📞 {b.phone}</div>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Contact form (client component for state) */}
        <section>
          <ContactForm subdomain={subdomain} />
        </section>
      </main>

      <SiteFooter theme={theme} name={tenantName} />
    </div>
  );
}
