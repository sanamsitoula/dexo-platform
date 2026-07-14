import Link from 'next/link';
import type { SiteTheme } from '@/lib/site-theme';
import type { SiteNavLink } from '@/lib/api';
import CartBadge from './CartBadge';

/**
 * Shared template-aware navigation for all public pages AND the homepage
 * shell (TemplateHome.tsx) — previously those were two separate, fully
 * hardcoded link lists (Workstream A). Both now read the same
 * `navItems` (from Site Navigation, tenant-admin Website Builder →
 * Navigation, auto-populated from real Pages/Blog/ecommerce-domain status)
 * and only differ in the per-template-family visual style (centered /
 * minimal / bottom-bar / classic), which this component still fully owns.
 */
export default function SiteNav({ theme, name, active, memberLoginUrl, showShop, navItems, ctaLabel }: {
  theme: SiteTheme;
  name: string;
  active?: string;
  memberLoginUrl?: string;
  /** Ecommerce-domain tenants only — adds a cart/orders badge alongside
   * whatever nav item links to /shop. */
  showShop?: boolean;
  /** Resolved, enabled, ordered nav links — see lib/api.ts getSiteNav().
   * Falls back to the legacy hardcoded About/Services/Blog/Book/Contact
   * list (gated by theme.blogEnabled/bookEnabled) only when empty, so
   * nothing regresses for a subdomain the nav API can't reach. */
  navItems?: SiteNavLink[];
  /** Per-template-family CTA copy (tpl.hero.cta, e.g. "Get Started") when
   * rendered from TemplateHome — defaults to "Join Now" for inner pages,
   * matching this component's original behavior. */
  ctaLabel?: string;
}) {
  const t = theme;
  const nav = t.tpl?.navigationStyle || 'classic';
  const links: Array<[href: string, label: string]> = navItems && navItems.length > 0
    ? navItems.map((i) => [i.href, i.label] as [string, string])
    : [
      ['/about', 'About'],
      ['/services', 'Services'],
      ...(t.blogEnabled ? ([['/blog', 'Blog']] as Array<[string, string]>) : []),
      ...(t.bookEnabled ? ([['/book', 'Book']] as Array<[string, string]>) : []),
      ['/contact', 'Contact'],
    ];

  const linkEls = links.map(([href, label]) => (
    <Link
      key={href}
      href={href}
      className={active === href ? 'font-semibold' : 'opacity-75 hover:opacity-100'}
      style={active === href ? { color: 'var(--site-primary)' } : undefined}
    >
      {label}
    </Link>
  ));
  const cartBadge = showShop ? (
    <>
      <Link href="/orders" className="opacity-75 hover:opacity-100" aria-label="Your orders">
        📦
      </Link>
      <CartBadge />
    </>
  ) : null;
  const cta = (
    <Link
      href="/register"
      className="px-4 py-2 font-semibold"
      style={{ background: 'var(--site-primary)', color: 'var(--site-on-primary)', borderRadius: 'var(--site-radius)' }}
    >
      {ctaLabel || 'Join Now'}
    </Link>
  );
  const login = memberLoginUrl && (
    <a
      href={memberLoginUrl}
      className="px-4 py-2 font-semibold border hover:opacity-80"
      style={{ borderColor: 'var(--site-border)', borderRadius: 'var(--site-radius)' }}
    >
      Member Login
    </a>
  );

  if (nav === 'centered') {
    return (
      <nav className="px-6 py-5 text-center border-b" style={{ borderColor: 'var(--site-border)' }}>
        <Link href="/" className="text-xl font-bold tracking-[0.25em] uppercase">{name}</Link>
        <div className="mt-3 flex justify-center items-center gap-5 text-xs tracking-widest uppercase">
          {linkEls}{cartBadge}{login}{cta}
        </div>
      </nav>
    );
  }
  if (nav === 'bottom-bar') {
    return (
      <nav className="flex items-center justify-between px-6 py-4 border-b-4" style={{ borderColor: 'var(--site-text)' }}>
        <Link href="/" className="text-xl font-black uppercase">{name}</Link>
        <div className="flex gap-4 text-sm font-bold uppercase items-center">{linkEls}{cartBadge}{login}{cta}</div>
      </nav>
    );
  }
  if (nav === 'minimal') {
    return (
      <nav className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto">
        <Link href="/" className="text-lg font-bold">{name}</Link>
        <div className="flex gap-5 text-sm items-center">{linkEls}{cartBadge}{login}{cta}</div>
      </nav>
    );
  }
  // classic / transparent / legacy
  return (
    <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
      <Link href="/" className="text-xl font-extrabold" style={{ color: 'var(--site-primary)' }}>{name}</Link>
      <div className="flex gap-4 text-sm items-center">{linkEls}{cartBadge}{login}{cta}</div>
    </nav>
  );
}
