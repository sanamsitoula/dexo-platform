import Link from 'next/link';
import type { SiteTheme } from '@/lib/site-theme';

/**
 * Shared template-aware footer for all public pages.
 *
 * Workstream B item 3 (website_builder_remaining.md): footer content is now
 * data-driven via `theme.footerConfig` (Theme Builder's `footerConfig`
 * token) when a tenant has ever set one — multi-column link groups, social
 * links, an optional newsletter line, and a custom copyright line. When
 * unset (the common case — nothing changes for tenants who never touch
 * Theme Builder's footer editor), this renders EXACTLY the same fixed
 * Home/About/Services/Book/Join/Contact link row + plain copyright line
 * that was hardcoded here before, so nothing regresses visually.
 */
export default function SiteFooter({ theme, name, contact }: {
  theme: SiteTheme;
  name: string;
  contact?: { branch?: string; address?: string; phone?: string } | null;
}) {
  const cfg = theme.footerConfig;

  // Fallback social links from the Settings page's plain branding.social
  // fields — only used when Theme Builder's own footerConfig.socialLinks
  // (the newer, more capable system) hasn't been set for this platform/url.
  const brandingSocialLinks: Array<{ platform: string; url: string }> = theme.brandingSocial
    ? (['facebook', 'instagram', 'tiktok', 'youtube'] as const)
        .filter((k) => theme.brandingSocial?.[k])
        .map((k) => ({ platform: k.charAt(0).toUpperCase() + k.slice(1), url: theme.brandingSocial![k] as string }))
    : [];

  if (!cfg) {
    return (
      <footer className="py-10 text-center text-sm" style={{ color: 'var(--site-sub)' }}>
        {contact && (contact.branch || contact.address || contact.phone) && (
          <p className="mb-2">
            {contact.branch}{contact.address ? ` · ${contact.address}` : ''}{contact.phone ? ` · ${contact.phone}` : ''}
          </p>
        )}
        <div className="space-x-3 mb-2">
          <Link href="/" className="hover:opacity-70">Home</Link>
          <Link href="/about" className="hover:opacity-70">About</Link>
          <Link href="/services" className="hover:opacity-70">Services</Link>
          <Link href="/book" className="hover:opacity-70">Book</Link>
          <Link href="/register" className="hover:opacity-70">Join</Link>
          <Link href="/contact" className="hover:opacity-70">Contact</Link>
        </div>
        {brandingSocialLinks.length > 0 && (
          <div className="flex justify-center gap-4 mb-2">
            {brandingSocialLinks.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="hover:opacity-70">{s.platform}</a>
            ))}
          </div>
        )}
        <div>
          © {new Date().getFullYear()} {name}
          {theme.tpl ? ` · ${theme.tpl.templateName} template` : ''} · Powered by OneDexo
        </div>
      </footer>
    );
  }

  const columns = Array.isArray(cfg.columns) ? cfg.columns.filter((c) => c && (c.title || c.links?.length)) : [];
  const socialLinks = (Array.isArray(cfg.socialLinks) ? cfg.socialLinks.filter((s) => s && s.url) : []).concat(
    // Only fall back to branding.social when Theme Builder's own list is empty.
    Array.isArray(cfg.socialLinks) && cfg.socialLinks.some((s) => s?.url) ? [] : brandingSocialLinks,
  );
  const copyright = cfg.copyrightText?.trim() || `© ${new Date().getFullYear()} ${name}`;

  return (
    <footer className="pt-12 pb-8 text-sm" style={{ color: 'var(--site-sub)' }}>
      <div className="max-w-6xl mx-auto px-6">
        {contact && (contact.branch || contact.address || contact.phone) && (
          <p className="mb-6 text-center">
            {contact.branch}{contact.address ? ` · ${contact.address}` : ''}{contact.phone ? ` · ${contact.phone}` : ''}
          </p>
        )}

        {columns.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8 text-left">
            {columns.map((col, i) => (
              <div key={i}>
                {col.title && <div className="font-semibold mb-2" style={{ color: 'var(--site-text)' }}>{col.title}</div>}
                <ul className="space-y-1">
                  {(col.links || []).map((link, j) => (
                    <li key={j}>
                      <Link href={link.url || '#'} className="hover:opacity-70">{link.label || link.url}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {cfg.showNewsletter && (
          <div className="mb-8 text-center">
            <div className="font-semibold mb-2" style={{ color: 'var(--site-text)' }}>Stay in touch</div>
            <p className="text-xs opacity-70">Sign up under Contact / Newsletter to get updates from {name}.</p>
          </div>
        )}

        {socialLinks.length > 0 && (
          <div className="flex justify-center gap-4 mb-6">
            {socialLinks.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="hover:opacity-70">
                {s.platform || s.url}
              </a>
            ))}
          </div>
        )}

        <div className="text-center">{copyright}</div>
      </div>
    </footer>
  );
}
