import Link from 'next/link';
import type { SiteTheme } from '@/lib/site-theme';

/**
 * Shared template-aware navigation for all public pages. Renders the nav
 * variant of the tenant's chosen design family (centered / minimal /
 * bottom-bar / classic) so inner pages match the homepage.
 */
export default function SiteNav({ theme, name, active, memberLoginUrl }: {
  theme: SiteTheme;
  name: string;
  active?: string;
  memberLoginUrl?: string;
}) {
  const t = theme;
  const nav = t.tpl?.navigationStyle || 'classic';
  const links: Array<[href: string, label: string]> = [
    ['/about', 'About'],
    ['/services', 'Services'],
    ['/book', 'Book'],
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
  const cta = (
    <Link
      href="/register"
      className="px-4 py-2 font-semibold"
      style={{ background: 'var(--site-primary)', color: 'var(--site-on-primary)', borderRadius: 'var(--site-radius)' }}
    >
      Join Now
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
          {linkEls}{login}{cta}
        </div>
      </nav>
    );
  }
  if (nav === 'bottom-bar') {
    return (
      <nav className="flex items-center justify-between px-6 py-4 border-b-4" style={{ borderColor: 'var(--site-text)' }}>
        <Link href="/" className="text-xl font-black uppercase">{name}</Link>
        <div className="flex gap-4 text-sm font-bold uppercase items-center">{linkEls}{login}{cta}</div>
      </nav>
    );
  }
  if (nav === 'minimal') {
    return (
      <nav className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto">
        <Link href="/" className="text-lg font-bold">{name}</Link>
        <div className="flex gap-5 text-sm items-center">{linkEls}{login}{cta}</div>
      </nav>
    );
  }
  // classic / transparent / legacy
  return (
    <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
      <Link href="/" className="text-xl font-extrabold" style={{ color: 'var(--site-primary)' }}>{name}</Link>
      <div className="flex gap-4 text-sm items-center">{linkEls}{login}{cta}</div>
    </nav>
  );
}
