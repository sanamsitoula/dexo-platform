import Link from 'next/link';
import type { WebsiteTemplate } from '@dexo/shared/src/themes';
import type { PublicPageSection, SiteNavLink } from '@/lib/api';
import type { SiteTheme, FooterConfig } from '@/lib/site-theme';
import { resolveCardStyle, resolveCtaStyle, resolveIconStyle, cardClasses, ctaButtonClasses, ctaButtonStyle, iconAccentClasses, iconAccentStyle } from '@/lib/style-tokens';
import PageSectionRenderer from './PageSectionRenderer';
import SiteNav from './SiteNav';
import SiteFooter from './SiteFooter';

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
  /** Theme Builder overrides — previously only colorPrimary/colorAccent
   * could override the fixed template at all; background/surface/text/
   * radius always came straight from tpl.palette regardless of what a
   * tenant set in Theme Builder, so those tokens never reached this page. */
  colorBackground?: string | null;
  colorSurface?: string | null;
  colorText?: string | null;
  colorTextSecondary?: string | null;
  themeBorderRadius?: number | null;
  /** Workstream B item 1 (website_builder_remaining.md): Theme Builder's
   * `heroLayout` token, if the tenant has ever set one — overrides
   * `tpl.heroType` (the original template's permanently-fixed choice) so a
   * tenant can change hero layout independent of which of the 60 base
   * templates they originally picked at signup. Falls back to `tpl.heroType`
   * when unset (backward compatible, zero behavior change otherwise). */
  heroLayout?: string | null;
  /** Workstream B item 3 (website_builder_remaining.md): Theme Builder's
   * `footerConfig` token, if the tenant has ever set one — passed straight
   * through to the SAME shared `SiteFooter` component every other public
   * page already renders. Falls back to SiteFooter's own hardcoded default
   * when unset. */
  footerConfig?: FooterConfig | null;
  /** Workstream B item 4 (website_builder_remaining.md): Theme Builder's
   * `cardStyle`/`ctaStyle`/`iconStyle` tokens, if the tenant has ever set
   * them — override `tpl.cardStyle`/`tpl.ctaStyle`/`tpl.iconStyle` (the
   * original template's permanently-fixed choices). Fall back to the
   * template's own values when unset, same pattern as heroLayout. */
  cardStyle?: string | null;
  ctaStyle?: string | null;
  iconStyle?: string | null;
  contact?: { branch?: string; address?: string; phone?: string; email?: string } | null;
  /** Pre-rendered pricing/plans section (industry-specific), slotted into the journey. */
  plansSlot?: React.ReactNode;
  /** Published Menu Builder sections (Services/Team/Locations/FAQ/...), rendered after plans. */
  menusSlot?: React.ReactNode;
  /** Real, tenant-editable Page Builder sections (from the auto-seeded "Home"
   * page — see provisioning.service.ts) rendered via the SAME PageSectionRenderer
   * used by custom /<slug> pages, in place of the old hardcoded placeholder
   * "journey" cards below ("Explore trainers at {name}."). Falls back to the
   * placeholder cards only if a tenant genuinely has none yet (e.g. provisioned
   * before this existed and not yet backfilled), so nothing regresses. */
  realSections?: PublicPageSection[];
  subdomain?: string;
  /** settings.branding.navFlags.bookEnabled — defaults to true (enabled)
   * when the tenant hasn't touched the toggle. Only used as a legacy
   * fallback now that navItems (below) is the preferred source. */
  bookEnabled?: boolean;
  /** Workstream A: resolved Site Navigation links (lib/api.ts getSiteNav) —
   * the SAME list SiteNav.tsx renders on every inner page, replacing this
   * shell's own previously-separate hardcoded nav links. */
  navItems?: SiteNavLink[];
  /** Ecommerce-domain tenants only — adds a cart/orders badge. */
  showShop?: boolean;
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

export default function TemplateHome({
  tpl, name, tagline, description, colorPrimary, colorAccent,
  colorBackground, colorSurface, colorText, colorTextSecondary, themeBorderRadius, heroLayout, footerConfig,
  cardStyle, ctaStyle, iconStyle,
  contact, plansSlot, menusSlot, realSections, subdomain, bookEnabled = true, navItems, showShop,
}: TemplateHomeProps) {
  // Resolved hero layout: Theme Builder's heroLayout token (if ever set)
  // wins over the original template's hardcoded heroType. Validated against
  // the same 5 known HeroType values so a corrupt/stale token never falls
  // through to "no hero rendered".
  const KNOWN_HERO_TYPES = ['split', 'fullscreen', 'floating-cards', 'editorial', 'bold-block'];
  const resolvedHeroType = (heroLayout && KNOWN_HERO_TYPES.includes(heroLayout) ? heroLayout : tpl.heroType) as typeof tpl.heroType;
  // Workstream B item 4: card/button/icon style tokens (Theme Builder's, if
  // ever set — otherwise the tenant's original template's own values).
  const resolvedCardStyle = resolveCardStyle(cardStyle, tpl.cardStyle);
  const resolvedCtaStyle = resolveCtaStyle(ctaStyle, tpl.ctaStyle);
  const resolvedIconStyle = resolveIconStyle(iconStyle, tpl.iconStyle);
  const p = {
    ...tpl.palette,
    primary: colorPrimary || tpl.palette.primary,
    accent: colorAccent || tpl.palette.accent,
    background: colorBackground || tpl.palette.background,
    surface: colorSurface || tpl.palette.surface,
    text: colorText || tpl.palette.text,
    textSecondary: colorTextSecondary || tpl.palette.textSecondary,
  };
  const dark = tpl.family === 'nocturne';
  const radius = Math.min(themeBorderRadius ?? tpl.borderRadius, 16);
  const heroTitle = tagline || tpl.hero.title;
  const heroSub = description || tpl.hero.subtitle;
  const journeySections = tpl.sections.filter((s) => !['hero', 'footer', 'pricing', 'contact'].includes(s)).slice(0, 4);

  // Minimal SiteTheme-shaped object so this shell can share the SAME nav
  // component/markup every inner page uses (SiteNav.tsx) instead of its own
  // second, separately-hardcoded nav (Workstream A unification). Only the
  // fields SiteNav actually reads are populated; colors are already applied
  // globally via CSS vars set in the root layout from the real getSiteTheme().
  const navTheme: SiteTheme = {
    tpl,
    dark,
    bg: p.background, surface: p.surface, border: `${p.textSecondary}25`, text: p.text, sub: p.textSecondary,
    primary: p.primary, onPrimary: '#ffffff', accent: p.accent, onAccent: '#ffffff',
    radius: `${radius}px`,
    blogEnabled: (navItems?.some((i) => i.href === '/blog')) ?? false,
    bookEnabled,
    footerConfig: footerConfig || undefined,
  };

  return (
    <div style={{ background: p.background, color: p.text, minHeight: '100vh', fontFamily: `var(--site-body-font, ${tpl.family === 'maison' ? 'Georgia, serif' : 'inherit'})` }}>
      {/* ---------- Navigation (shared with every inner page — see SiteNav.tsx) ---------- */}
      <SiteNav theme={navTheme} name={name} showShop={showShop} navItems={navItems} ctaLabel={tpl.hero.cta} memberLoginUrl="/login" />

      {/* ---------- Hero ---------- */}
      {resolvedHeroType === 'fullscreen' && (
        <section className="text-center px-4 py-32 text-white" style={{ background: `linear-gradient(180deg, ${p.primary}E6, ${dark ? '#000' : '#1c1917'}E6)` }}>
          <h1 className="text-5xl sm:text-6xl font-bold leading-tight max-w-3xl mx-auto">{heroTitle}</h1>
          <p className="mt-5 text-lg opacity-80 max-w-xl mx-auto">{heroSub}</p>
          <Link href="/register" className="mt-8 inline-block px-8 py-3 font-semibold border-2 border-white hover:bg-white hover:text-black transition" style={{ borderRadius: radius }}>
            {tpl.hero.cta}
          </Link>
        </section>
      )}
      {resolvedHeroType === 'floating-cards' && (
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
      {resolvedHeroType === 'editorial' && (
        <section className="px-6 py-20 max-w-4xl mx-auto">
          <h1 className="text-6xl font-bold tracking-tight leading-[1.05]">{heroTitle}</h1>
          <div className="h-px w-full my-8" style={{ backgroundColor: `${p.textSecondary}55` }} />
          <p className="text-lg max-w-2xl" style={{ color: p.textSecondary }}>{heroSub}</p>
          <Link href="/register" className="mt-6 inline-block text-lg font-semibold underline underline-offset-4">
            {tpl.hero.cta} →
          </Link>
        </section>
      )}
      {resolvedHeroType === 'bold-block' && (
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
      {resolvedHeroType === 'split' && (
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

      {/* ---------- Real, editable Page Builder sections (preferred) ---------- */}
      {realSections && realSections.length > 0 ? (
        realSections.map((section) => (
          <PageSectionRenderer key={section.id} section={section} colorPrimary={p.primary} subdomain={subdomain || ''}
            cardStyle={resolvedCardStyle} ctaStyle={resolvedCtaStyle} iconStyle={resolvedIconStyle} />
        ))
      ) : (
        /* ---------- Fallback: placeholder "journey" cards ----------
         * Only reached when a tenant has no real Home-page sections yet
         * (provisioned before this existed, not yet backfilled) — see
         * scripts/backfill-homepage.ts.
         *
         * Workstream B item 4: card surface + icon accent now driven by
         * the resolved cardStyle/iconStyle tokens (`style-tokens.ts`)
         * instead of the single ad-hoc `tpl.family === 'bloc'` special
         * case that used to be the only per-family variance here. */
        <section className="px-6 py-16 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {journeySections.map((s, i) => (
              <div key={s} className={`p-6 ${cardClasses(resolvedCardStyle)}`}
                style={{
                  borderRadius: radius,
                  backgroundColor: dark ? '#ffffff0d' : p.surface,
                  borderColor: resolvedCardStyle === 'thick-border' ? p.text : `${p.textSecondary}25`,
                }}>
                <span className={`block w-8 h-8 mb-4 ${iconAccentClasses(resolvedIconStyle)}`}
                  style={iconAccentStyle(resolvedIconStyle, i % 2 ? p.accent : p.primary)} />
                <h3 className="font-bold text-lg">{SECTION_LABELS[s] || s}</h3>
                <p className="mt-1 text-sm" style={{ color: p.textSecondary }}>
                  Explore {SECTION_LABELS[s]?.toLowerCase() || s} at {name}.
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------- Plans (industry data slot) ---------- */}
      {plansSlot}

      {/* ---------- Menu Builder sections (Services/Team/Locations/...) ---------- */}
      {menusSlot}

      {/* ---------- CTA ---------- */}
      {/* Workstream B item 4: section + button treatment now keyed on the
       * resolved ctaStyle token instead of the previous ad-hoc
       * `tpl.family === 'bloc'` / `dark` special-casing — the fallback
       * (resolvedCtaStyle === tpl.ctaStyle, since no theme override is set)
       * reproduces each family's existing look 1:1 (sticky-bar === bloc's
       * thick-border banner, floating-glow === nocturne's dark gradient +
       * glow button, gradient-banner/full-width-banner/inline-text render
       * the same solid-accent-section look every other family already had,
       * now differentiated by button treatment). */}
      <section className="px-4 py-20 text-center"
        style={resolvedCtaStyle === 'sticky-bar'
          ? { background: p.accent, color: '#000', borderTop: `4px solid ${p.text}`, borderBottom: `4px solid ${p.text}` }
          : resolvedCtaStyle === 'floating-glow'
            ? { background: `linear-gradient(120deg, ${p.primary}33, transparent)`, color: p.text }
            : { background: p.accent, color: '#111' }}>
        <h2 className="text-3xl font-bold">{tpl.hero.subtitle}</h2>
        <Link href="/register" className={`mt-6 inline-block px-8 py-3 ${ctaButtonClasses(resolvedCtaStyle)}`}
          style={ctaButtonStyle(resolvedCtaStyle, dark ? p.primary : '#000')}>
          {tpl.hero.cta}
        </Link>
      </section>

      {/* ---------- Footer ---------- */}
      {/* Workstream B item 3 (website_builder_remaining.md): this shell now
       * renders the SAME shared SiteFooter component every other public
       * page (about/services/contact/shop/...) already uses, instead of its
       * own separately-hardcoded <footer> block — this collapses the
       * "second hardcoded footer" the same way Workstream A collapsed the
       * second hardcoded nav. `navTheme.footerConfig` carries the resolved
       * Theme Builder token through; SiteFooter falls back to its own
       * hardcoded default (which matches what this block used to render)
       * when unset, so nothing changes for tenants who never touch it. */}
      <SiteFooter theme={navTheme} name={name} contact={contact} />
    </div>
  );
}
