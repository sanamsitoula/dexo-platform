import Link from 'next/link';
import type { WebsiteTemplate } from '@dexo/shared/src/themes';

/**
 * Full-page renderer for the OneDexo template ecosystem. Given the tenant's
 * chosen WebsiteTemplate (settings.branding.templateId), this renders a
 * structurally different homepage per design family — the same five families
 * previewed in the signup wizard, now at full size.
 *
 * Server component: no client JS beyond links.
 */

export interface TemplateHomeProps {
  tpl: WebsiteTemplate;
  name: string;
  tagline?: string | null;
  description?: string | null;
  colorPrimary?: string | null;
  colorAccent?: string | null;
  contact?: { branch?: string; address?: string; phone?: string; email?: string } | null;
  /** Pre-rendered pricing/plans section (industry-specific), slotted into the journey. */
  plansSlot?: React.ReactNode;
}

const SECTION_LABELS: Record<string, string> = {
  'services': 'Services', 'about': 'About Us', 'stats': 'Our Numbers', 'testimonials': 'What Clients Say',
  'pricing': 'Pricing', 'faq': 'FAQ', 'contact': 'Contact', 'gallery': 'Gallery', 'booking': 'Book Now',
  'newsletter': 'Stay in Touch', 'process': 'How It Works', 'membership': 'Membership', 'cta': 'Get Started',
  'offers': 'Offers', 'benefits': 'Why Us', 'collections': 'Collections', 'fabric-gallery': 'Fabrics',
  'measurements': 'Measurements', 'custom-orders': 'Custom Orders', 'food-menu': 'Menu', 'chef-story': 'Our Chef',
  'stylists': 'Our Stylists', 'treatments': 'Treatments', 'packages': 'Packages', 'trainers': 'Trainers',
  'classes': 'Classes', 'transformations': 'Transformations', 'doctors': 'Our Doctors', 'departments': 'Departments',
  'emergency': 'Emergency', 'courses': 'Courses', 'teachers': 'Teachers', 'campus-life': 'Campus Life',
  'events': 'Events', 'results': 'Results', 'faculty': 'Faculty', 'batches': 'Batches', 'categories': 'Categories',
  'products': 'Products', 'new-arrivals': 'New Arrivals', 'rooms': 'Rooms & Suites', 'amenities': 'Amenities',
  'experiences': 'Experiences', 'dining': 'Dining', 'delivery-tracking': 'Track Delivery', 'coverage': 'Coverage',
  'fleet': 'Our Fleet', 'case-studies': 'Case Studies', 'timeline': 'Our Journey', 'achievements': 'Achievements',
  'team': 'Our Team', 'causes': 'Our Causes', 'impact-stats': 'Our Impact', 'volunteers': 'Volunteers',
};

export default function TemplateHome({ tpl, name, tagline, description, colorPrimary, colorAccent, contact, plansSlot }: TemplateHomeProps) {
  const p = {
    ...tpl.palette,
    primary: colorPrimary || tpl.palette.primary,
    accent: colorAccent || tpl.palette.accent,
  };
  const dark = tpl.family === 'nocturne';
  const radius = Math.min(tpl.borderRadius, 16);
  const heroTitle = tagline || tpl.hero.title;
  const heroSub = description || tpl.hero.subtitle;
  const journeySections = tpl.sections.filter((s) => !['hero', 'footer', 'pricing', 'contact'].includes(s)).slice(0, 4);

  const navLinks = (
    <>
      <Link href="/about" className="opacity-80 hover:opacity-100">About</Link>
      <Link href="/services" className="opacity-80 hover:opacity-100">Services</Link>
      <Link href="/book" className="opacity-80 hover:opacity-100">Book</Link>
      <a href="#plans" className="opacity-80 hover:opacity-100">Plans</a>
      <Link href="/contact" className="opacity-80 hover:opacity-100">Contact</Link>
    </>
  );
  const authLinks = (
    <>
      <Link href="/login" className="px-4 py-2 font-semibold border hover:opacity-80"
        style={{ borderColor: dark ? '#ffffff40' : `${p.text}30`, borderRadius: radius }}>
        Member Login
      </Link>
      <Link href="/register" className="px-4 py-2 font-semibold text-white" style={{ background: p.primary, borderRadius: radius }}>
        {tpl.hero.cta}
      </Link>
    </>
  );

  return (
    <div style={{ background: p.background, color: p.text, minHeight: '100vh', fontFamily: tpl.family === 'maison' ? 'Georgia, serif' : undefined }}>
      {/* ---------- Navigation ---------- */}
      {tpl.navigationStyle === 'centered' ? (
        <nav className="px-6 py-5 max-w-6xl mx-auto text-center border-b" style={{ borderColor: `${p.textSecondary}25` }}>
          <div className="text-2xl font-bold tracking-[0.25em] uppercase">{name}</div>
          <div className="mt-3 flex justify-center gap-6 text-xs tracking-widest uppercase items-center">
            {navLinks}
            <Link href="/register" className="px-3 py-1.5 font-semibold text-white" style={{ background: p.primary, borderRadius: radius }}>
              {tpl.hero.cta}
            </Link>
          </div>
        </nav>
      ) : tpl.navigationStyle === 'minimal' ? (
        <nav className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto">
          <div className="text-lg font-bold">{name}</div>
          <div className="flex gap-5 text-sm items-center">{navLinks}{authLinks}</div>
        </nav>
      ) : tpl.navigationStyle === 'bottom-bar' ? (
        <nav className="flex items-center justify-between px-6 py-4 border-b-4" style={{ borderColor: p.text }}>
          <div className="text-xl font-black uppercase">{name}</div>
          <div className="flex gap-4 text-sm font-bold uppercase items-center">{navLinks}{authLinks}</div>
        </nav>
      ) : (
        <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
          <div className="text-xl font-extrabold" style={{ color: p.primary }}>{name}</div>
          <div className="flex gap-4 text-sm items-center">{navLinks}{authLinks}</div>
        </nav>
      )}

      {/* ---------- Hero ---------- */}
      {tpl.heroType === 'fullscreen' && (
        <section className="text-center px-4 py-32 text-white" style={{ background: `linear-gradient(180deg, ${p.primary}E6, ${dark ? '#000' : '#1c1917'}E6)` }}>
          <h1 className="text-5xl sm:text-6xl font-bold leading-tight max-w-3xl mx-auto">{heroTitle}</h1>
          <p className="mt-5 text-lg opacity-80 max-w-xl mx-auto">{heroSub}</p>
          <Link href="/register" className="mt-8 inline-block px-8 py-3 font-semibold border-2 border-white hover:bg-white hover:text-black transition" style={{ borderRadius: radius }}>
            {tpl.hero.cta}
          </Link>
        </section>
      )}
      {tpl.heroType === 'floating-cards' && (
        <section className="relative overflow-hidden px-6 py-24 max-w-6xl mx-auto"
          style={{ backgroundImage: `radial-gradient(circle at 75% 20%, ${p.primary}44, transparent 55%)` }}>
          <div className="max-w-xl">
            <h1 className="text-5xl font-bold leading-tight">{heroTitle}</h1>
            <p className="mt-4 text-lg" style={{ color: p.textSecondary }}>{heroSub}</p>
            <Link href="/register" className="mt-8 inline-block px-8 py-3 font-semibold text-white"
              style={{ background: p.primary, borderRadius: 999, boxShadow: `0 0 30px ${p.primary}66` }}>
              {tpl.hero.cta}
            </Link>
          </div>
          <div className="hidden lg:block absolute right-10 top-16 w-56 h-36 border backdrop-blur"
            style={{ backgroundColor: '#ffffff10', borderColor: '#ffffff25', borderRadius: radius, transform: 'rotate(4deg)' }} />
          <div className="hidden lg:block absolute right-32 top-40 w-56 h-36 border backdrop-blur"
            style={{ backgroundColor: '#ffffff18', borderColor: '#ffffff30', borderRadius: radius, transform: 'rotate(-3deg)' }} />
        </section>
      )}
      {tpl.heroType === 'editorial' && (
        <section className="px-6 py-20 max-w-4xl mx-auto">
          <h1 className="text-6xl font-bold tracking-tight leading-[1.05]">{heroTitle}</h1>
          <div className="h-px w-full my-8" style={{ backgroundColor: `${p.textSecondary}55` }} />
          <p className="text-lg max-w-2xl" style={{ color: p.textSecondary }}>{heroSub}</p>
          <Link href="/register" className="mt-6 inline-block text-lg font-semibold underline underline-offset-4">
            {tpl.hero.cta} →
          </Link>
        </section>
      )}
      {tpl.heroType === 'bold-block' && (
        <section className="px-6 py-10 max-w-6xl mx-auto">
          <div className="border-4 p-10 sm:p-16" style={{ borderColor: p.text, background: p.primary }}>
            <h1 className="text-5xl sm:text-6xl font-black uppercase leading-tight text-white">{heroTitle}</h1>
            <p className="mt-4 text-lg text-white/85 max-w-2xl">{heroSub}</p>
            <Link href="/register" className="mt-8 inline-block px-8 py-3 font-black uppercase border-4 border-white text-white hover:bg-white hover:text-black transition">
              {tpl.hero.cta}
            </Link>
          </div>
        </section>
      )}
      {tpl.heroType === 'split' && (
        <section className="px-6 py-20 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-5xl font-bold leading-tight">{heroTitle}</h1>
            <p className="mt-4 text-lg" style={{ color: p.textSecondary }}>{heroSub}</p>
            <div className="mt-8 flex gap-3">
              <Link href="/register" className="px-7 py-3 font-semibold text-white" style={{ background: p.primary, borderRadius: radius }}>
                {tpl.hero.cta}
              </Link>
              <a href="#plans" className="px-7 py-3 font-semibold border" style={{ borderColor: `${p.text}30`, borderRadius: radius }}>
                View Plans
              </a>
            </div>
          </div>
          <div className="h-72 hidden lg:block" style={{ background: `linear-gradient(135deg, ${p.primary}44, ${p.accent}77)`, borderRadius: radius }} />
        </section>
      )}

      {/* ---------- Journey sections (labels from the template's story order) ---------- */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {journeySections.map((s, i) => (
            <div key={s} className="p-6 border"
              style={{
                borderRadius: radius,
                backgroundColor: dark ? '#ffffff0d' : p.surface,
                borderColor: tpl.family === 'bloc' ? p.text : `${p.textSecondary}25`,
                borderWidth: tpl.family === 'bloc' ? 3 : 1,
              }}>
              <span className="block h-1.5 w-10 mb-4" style={{ backgroundColor: i % 2 ? p.accent : p.primary }} />
              <h3 className="font-bold text-lg">{SECTION_LABELS[s] || s}</h3>
              <p className="mt-1 text-sm" style={{ color: p.textSecondary }}>
                Explore {SECTION_LABELS[s]?.toLowerCase() || s} at {name}.
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Plans (industry data slot) ---------- */}
      {plansSlot}

      {/* ---------- CTA ---------- */}
      <section className="px-4 py-20 text-center"
        style={tpl.family === 'bloc'
          ? { background: p.accent, color: '#000', borderTop: `4px solid ${p.text}`, borderBottom: `4px solid ${p.text}` }
          : { background: dark ? `linear-gradient(120deg, ${p.primary}33, transparent)` : p.accent, color: dark ? p.text : '#111' }}>
        <h2 className="text-3xl font-bold">{tpl.hero.subtitle}</h2>
        <Link href="/register" className="mt-6 inline-block px-8 py-3 font-semibold text-white"
          style={{ background: dark ? p.primary : '#000', borderRadius: tpl.family === 'bloc' ? 0 : radius }}>
          {tpl.hero.cta}
        </Link>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="py-10 text-center text-sm" style={{ color: p.textSecondary }}>
        {contact && (
          <p className="mb-2">
            {contact.branch}{contact.address ? ` · ${contact.address}` : ''}{contact.phone ? ` · ${contact.phone}` : ''}
          </p>
        )}
        <div className="space-x-3 mb-2">
          <Link href="/">Home</Link>
          <Link href="/about">About</Link>
          <Link href="/services">Services</Link>
          <Link href="/book">Book</Link>
          <Link href="/register">Join</Link>
          <Link href="/contact">Contact</Link>
        </div>
        <div>© {new Date().getFullYear()} {name} · {tpl.templateName} template · Powered by OneDexo</div>
      </footer>
    </div>
  );
}
