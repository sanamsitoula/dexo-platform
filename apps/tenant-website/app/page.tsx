import Link from 'next/link';
import { headers } from 'next/headers';
import { getFitnessInfo, getFitnessPlans, getGenericTenantInfo, getTenantBySubdomain, getCategories, getProducts, getPublicMenus, getPublicPage, type FitnessInfo, type FitnessPlan } from '@/lib/api';
import { getTemplate } from '@dexo/shared/src/themes';
import TemplateHome from '@/components/TemplateHome';
import EcommerceHome from '@/components/EcommerceHome';
import MenuSection from '@/components/MenuSection';
import { getSiteTheme } from '@/lib/site-theme';
import { isEcommerceDomainCode } from '@/lib/domainType';
import { memberPortalUrl } from '@/lib/portal';

function resolveSubdomain(): string {
  const h = headers();
  return h.get('x-tenant-slug') || '';
}

const FEATURES = [
  { icon: '🏋️', title: 'Personalized Workouts', desc: 'Trainer-approved plans tailored to your goals, with progress logging.' },
  { icon: '🥗', title: 'Diet & Calorie Tracker', desc: 'Log meals (incl. Nepali foods) and track calories, protein and macros daily.' },
  { icon: '📅', title: 'Classes & Booking', desc: 'Browse the class schedule and book your spot from your phone.' },
  { icon: '📈', title: 'Progress & Assessments', desc: 'Body measurements, streaks and milestone badges keep you motivated.' },
  { icon: '💳', title: 'Easy Payments', desc: 'Pay membership dues online via eSewa, Khalti, ConnectIPS or card.' },
  { icon: '📱', title: 'Everything in the App', desc: 'Check in with a QR code, message your trainer, and manage your membership.' },
];

const FALLBACK: FitnessInfo = {
  id: '', name: 'Fitness Center', subdomain: null,
  tagline: 'Transform your body. Transform your life.',
  description: 'Modern gym & fitness management — workouts, diet tracking, classes and more.',
  logoUrl: null, colorPrimary: '#E85D24', colorAccent: '#F2A623', branchCount: 0, contact: null,
};

function planPeriod(type: string, days: number): string {
  const map: Record<string, string> = { DAILY: 'day', MONTHLY: 'month', QUARTERLY: 'quarter', HALF_YEARLY: '6 months', YEARLY: 'year' };
  return map[type] || `${days} days`;
}

/** Neutral plans section, palette-aware — slotted into template homepages. */
function TemplatePlans({ plans, color, name }: { plans: FitnessPlan[]; color: string; name: string }) {
  if (plans.length === 0) return null;
  return (
    <section id="plans" className="px-4 py-16 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-center">Membership Plans</h2>
      <p className="text-center opacity-70 mt-2">Prices in NPR, inclusive of VAT.</p>
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((p: FitnessPlan, i: number) => (
          <div key={p.id} className="p-6 rounded-xl border flex flex-col"
            style={{ borderColor: i === 1 ? color : 'rgba(128,128,128,0.3)', boxShadow: i === 1 ? `0 0 0 1px ${color}` : undefined }}>
            <h3 className="font-bold text-xl">{p.name}</h3>
            {p.description && <p className="text-sm opacity-70 mt-1">{p.description}</p>}
            <div className="mt-4">
              <span className="text-4xl font-extrabold">Rs {p.totalWithVat.toLocaleString()}</span>
              <span className="opacity-60 text-sm"> / {planPeriod(p.type, p.durationDays)}</span>
            </div>
            <ul className="mt-4 space-y-1 text-sm opacity-80 flex-1">
              <li>✓ {p.accessHours || 'Full access'}</li>
              <li>{p.includesTrainer ? '✓' : '✗'} Personal trainer</li>
              <li>{p.includesClasses ? '✓' : '✗'} Group classes</li>
              <li>✓ {p.branchAccess === 'all' ? 'All branches' : 'Single branch'}</li>
            </ul>
            <Link href={`/register?plan=${p.id}`} className="mt-6 text-center px-4 py-2 rounded-md font-semibold text-white" style={{ background: color }}>
              Choose {p.name}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function Home() {
  const subdomain = resolveSubdomain();
  const tenant = await getTenantBySubdomain(subdomain);
  // tenant.service.ts's findBySubdomain() deliberately FLATTENS the
  // TenantDomain relation into a plain `tenant.domainCode` string and
  // strips `domains` from the response entirely (see its own comment:
  // "Flatten so consumers can read tenant.domainCode directly") — reading
  // tenant.domains[0].domain.code here always silently evaluated to
  // undefined, which meant every ecommerce tenant fell through to the
  // generic fitness/template branch instead of rendering EcommerceHome.
  const domainCode = tenant?.domainCode;

  if (isEcommerceDomainCode(domainCode)) {
    const [theme, categories, featured, latest, ecomHomePage] = await Promise.all([
      getSiteTheme(subdomain),
      getCategories(subdomain),
      getProducts(subdomain, { featured: true }),
      getProducts(subdomain),
      getPublicPage(subdomain, 'home'),
    ]);
    return (
      <EcommerceHome
        theme={theme}
        name={tenant?.name || 'Store'}
        tagline={(tenant?.settings as any)?.branding?.tagline}
        categories={categories}
        featured={featured}
        latest={latest}
        realSections={ecomHomePage?.sections}
        subdomain={subdomain}
      />
    );
  }

  const [info, plans, menus, homePage] = await Promise.all([
    getFitnessInfo(subdomain),
    getFitnessPlans(subdomain),
    getPublicMenus(subdomain),
    getPublicPage(subdomain, 'home'),
  ]);
  // getFitnessInfo() is fitness-only and 404s for every other business type
  // — this branch is only reached when a tenant has no chosen template at
  // all, but non-fitness tenants without one would otherwise still show
  // "Fitness Center" / "Transform your body..." on their own homepage.
  const t = info || (await getGenericTenantInfo(subdomain)) || FALLBACK;
  // Canonical member-portal host: portal.<tenant>.onedexo.com (see lib/portal.ts).
  const memberLoginUrl = `${memberPortalUrl(subdomain)}/login`;

  // Template-ecosystem rendering: if the tenant picked one of the 60 website
  // templates at signup, render that design family instead of the default page.
  const branding = (tenant?.settings as any)?.branding;
  const tpl = branding?.templateId ? getTemplate(branding.templateId) : undefined;
  if (tpl) {
    // getSiteTheme() resolves the tenant's ACTIVE Theme Builder theme (if
    // any) over the legacy branding override over the fixed template —
    // previously this branch never called it at all, so Theme Builder's
    // background/surface/text/radius tokens (everything except the two
    // legacy colorPrimary/colorAccent fields) never reached the homepage.
    const theme = await getSiteTheme(subdomain, branding.colorPrimary, branding.colorAccent);
    return (
      <TemplateHome
        tpl={tpl}
        name={t.name}
        tagline={t.tagline}
        description={t.description}
        colorPrimary={theme.primary}
        colorAccent={theme.accent}
        colorBackground={theme.bg}
        colorSurface={theme.surface}
        colorText={theme.text}
        colorTextSecondary={theme.sub}
        themeBorderRadius={parseInt(theme.radius, 10) || undefined}
        bookEnabled={theme.bookEnabled}
        contact={t.contact}
        plansSlot={<TemplatePlans plans={plans} color={theme.primary} name={t.name} />}
        menusSlot={<>{menus.map((m) => <MenuSection key={m.id} menu={m} colorPrimary={theme.primary} />)}</>}
        realSections={homePage?.sections}
        subdomain={subdomain}
      />
    );
  }

  return (
    <div style={{ background: '#0f0f10', color: '#fff', minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="text-xl font-extrabold" style={{ color: t.colorPrimary }}>{t.name}</div>
        <div className="space-x-4 text-sm">
          <Link href="/about" className="opacity-80 hover:opacity-100">About</Link>
          <Link href="/services" className="opacity-80 hover:opacity-100">Services</Link>
          <Link href="/book" className="opacity-80 hover:opacity-100">Book</Link>
          <a href="#plans" className="opacity-80 hover:opacity-100">Plans</a>
          <Link href="/contact" className="opacity-80 hover:opacity-100">Contact</Link>
          <a href={memberLoginUrl} className="px-4 py-2 rounded-md font-semibold border border-white/25 hover:bg-white/10">Member Login</a>
          <Link href="/register" className="px-4 py-2 rounded-md font-semibold text-black" style={{ background: t.colorPrimary }}>Join Now</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-4 py-24 max-w-3xl mx-auto">
        <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight">{t.tagline}</h1>
        <p className="mt-5 text-lg opacity-80">{t.description}</p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link href="/register" className="px-7 py-3 rounded-md font-semibold text-black" style={{ background: t.colorPrimary }}>Get Started</Link>
          <a href="#plans" className="px-7 py-3 rounded-md font-semibold border border-white/20 hover:bg-white/5">View Plans</a>
        </div>
        {t.branchCount > 0 && <p className="mt-6 text-sm opacity-60">{t.branchCount} location{t.branchCount > 1 ? 's' : ''} · Open now</p>}
      </section>

      {/* Features */}
      <section className="px-4 py-16 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center">Everything you need to reach your goals</h2>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="p-6 rounded-xl bg-white/5 border border-white/10">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-3 font-semibold text-lg">{f.title}</h3>
              <p className="mt-1 text-sm opacity-70">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="px-4 py-16 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center">Membership Plans</h2>
        <p className="text-center opacity-70 mt-2">Prices in NPR, inclusive of VAT.</p>
        {plans.length === 0 ? (
          <p className="text-center opacity-60 mt-10">Plans will be available shortly. Contact us to get started today.</p>
        ) : (
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((p: FitnessPlan, i: number) => (
              <div key={p.id} className="p-6 rounded-xl bg-white/5 border border-white/10 flex flex-col"
                style={i === 1 ? { borderColor: t.colorPrimary, boxShadow: `0 0 0 1px ${t.colorPrimary}` } : {}}>
                <h3 className="font-bold text-xl">{p.name}</h3>
                {p.description && <p className="text-sm opacity-70 mt-1">{p.description}</p>}
                <div className="mt-4">
                  <span className="text-4xl font-extrabold">Rs {p.totalWithVat.toLocaleString()}</span>
                  <span className="opacity-60 text-sm"> / {planPeriod(p.type, p.durationDays)}</span>
                </div>
                <ul className="mt-4 space-y-1 text-sm opacity-80 flex-1">
                  <li>✓ {p.accessHours || 'Gym access'}</li>
                  <li>{p.includesTrainer ? '✓' : '✗'} Personal trainer</li>
                  <li>{p.includesClasses ? '✓' : '✗'} Group classes</li>
                  <li>{p.includesDietPlan ? '✓' : '✗'} Diet plan</li>
                  <li>{p.includesLocker ? '✓' : '✗'} Locker</li>
                  <li>✓ {p.branchAccess === 'all' ? 'All branches' : 'Single branch'}</li>
                </ul>
                <Link href={`/register?plan=${p.id}`} className="mt-6 text-center px-4 py-2 rounded-md font-semibold text-black" style={{ background: t.colorPrimary }}>
                  Choose {p.name}
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Menu Builder sections (Services/Team/Locations/...) */}
      {menus.map((m) => <MenuSection key={m.id} menu={m} colorPrimary={t.colorPrimary} />)}

      {/* CTA */}
      <section className="px-4 py-20 text-center" style={{ background: t.colorAccent, color: '#111' }}>
        <h2 className="text-3xl font-bold">Ready to start your journey?</h2>
        <p className="mt-2 opacity-80">Sign up in minutes and train from day one.</p>
        <Link href="/register" className="mt-6 inline-block px-8 py-3 bg-black text-white rounded-md font-semibold">Join {t.name}</Link>
      </section>

      {/* Footer */}
      <footer className="py-10 text-center text-sm opacity-60">
        {t.contact && (
          <p className="mb-2">
            {t.contact.branch}{t.contact.address ? ` · ${t.contact.address}` : ''}{t.contact.phone ? ` · ${t.contact.phone}` : ''}
          </p>
        )}
        <div className="space-x-3 mb-2">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/about" className="hover:text-white">About</Link>
          <Link href="/services" className="hover:text-white">Services</Link>
          <Link href="/book" className="hover:text-white">Book</Link>
          <Link href="/register" className="hover:text-white">Join</Link>
          <Link href="/contact" className="hover:text-white">Contact</Link>
        </div>
        <div>© {new Date().getFullYear()} {t.name} · Powered by Dexo</div>
      </footer>
    </div>
  );
}
