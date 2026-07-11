// Tenant public Contact Us page
// Pulls branch info (address, geo, hours, phone) from /api/branches for the active tenant
// Submits to /api/contact with subdomain → stored as ContactMessage (tenant-scoped)
// NOTE: WhatsApp click-to-chat button renders when 4.2 ships TenantWhatsAppConfig (TODO marker inline)

import Link from 'next/link';
import { headers } from 'next/headers';
import ContactForm from './ContactForm';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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

export default async function ContactPage() {
  const h = headers();
  const subdomain = h.get('x-tenant-slug') || process.env.DEV_TENANT || 'vrfitness';

  const [branches, tenant, whatsapp] = await Promise.all([
    getBranches(subdomain),
    getTenantInfo(subdomain),
    getPublicWhatsApp(subdomain),
  ]);

  const hq = branches.find((b: any) => b.isHeadquarters) ?? branches[0];
  const tenantName = tenant?.name ?? subdomain;
  const tenantPhone = (tenant?.settings as any)?.phone ?? hq?.phone ?? '';
  const tenantEmail = (tenant?.settings as any)?.email ?? hq?.email ?? `hello@${subdomain}.onedexo.com`;
  const whatsappNumber = whatsapp.isEnabled ? whatsapp.phoneNumber : '';
  const whatsappDisplay = whatsapp.displayName;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="py-16 px-4 bg-gradient-to-br from-slate-900 to-slate-700 text-white">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl font-extrabold">Get in Touch</h1>
          <p className="mt-3 opacity-80">
            We&apos;d love to hear from you. Reach out about memberships, classes, training, or anything else.
          </p>
          <nav className="mt-4 text-sm opacity-70">
            <Link href="/" className="hover:underline">Home</Link>
            <span className="mx-2">/</span>
            <span>Contact</span>
          </nav>
        </div>
      </section>

      <main className="max-w-6xl mx-auto py-12 px-4 grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Contact info + branches */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900">Contact Information</h2>
          <p className="mt-2 text-slate-600">
            Visit any of our branches, call us, or message us via WhatsApp. We respond within 24 hours.
          </p>

          <div className="mt-6 space-y-6">
            <div className="flex items-start gap-3">
              <span className="mt-1 text-xl" aria-hidden>✉️</span>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Email</div>
                <a href={`mailto:${tenantEmail}`} className="text-blue-600 hover:underline">{tenantEmail}</a>
              </div>
            </div>

            {tenantPhone && (
              <div className="flex items-start gap-3">
                <span className="mt-1 text-xl" aria-hidden>📞</span>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Phone</div>
                  <a href={`tel:${tenantPhone}`} className="text-blue-600 hover:underline">{tenantPhone}</a>
                </div>
              </div>
            )}

            {whatsappNumber && (
              <div className="flex items-start gap-3">
                <span className="mt-1 text-xl" aria-hidden>💬</span>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">WhatsApp</div>
                  <a
                    href={`https://wa.me/${whatsappNumber}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center px-3 py-1 mt-1 rounded-md bg-green-500 text-white text-sm hover:bg-green-600"
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
                  <div className="text-xs uppercase tracking-wide text-slate-500">Headquarters</div>
                  <address className="not-italic text-slate-700">
                    {hq.address && <div>{hq.address}</div>}
                    {hq.city && <div>{[hq.city, hq.state, hq.postalCode].filter(Boolean).join(', ')}</div>}
                    {hq.country && <div>{hq.country}</div>}
                  </address>
                  {hq.latitude && hq.longitude && (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${hq.latitude}&mlon=${hq.longitude}#map=16/${hq.latitude}/${hq.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-sm text-blue-600 hover:underline"
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
              <h3 className="text-lg font-semibold text-slate-900">Our Branches</h3>
              <ul className="mt-3 space-y-3">
                {branches.map((b: any) => (
                  <li key={b.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                      {b.name}
                      {b.isHeadquarters && (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">HQ</span>
                      )}
                    </div>
                    {b.address && <div className="text-sm text-slate-600 mt-1">{b.address}</div>}
                    {b.city && <div className="text-sm text-slate-600">{[b.city, b.state].filter(Boolean).join(', ')}</div>}
                    {b.phone && <div className="text-sm text-slate-600 mt-1">📞 {b.phone}</div>}
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

      <footer className="py-8 bg-gray-900 text-gray-400 text-sm text-center">
        © {new Date().getFullYear()} {tenantName} · Powered by Dexo
      </footer>
    </div>
  );
}