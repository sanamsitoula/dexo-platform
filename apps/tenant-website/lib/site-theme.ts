import { getTemplate, type WebsiteTemplate } from '@dexo/shared/src/themes';
import { getTenantBySubdomain } from './api';

const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '')
const API_BASE_URL = `${API_HOST}/api`

/**
 * Site-wide theme resolution order (each layer overrides the one before it,
 * token by token — not all-or-nothing):
 *   1. Legacy dark default (no template chosen at all)
 *   2. Fixed WebsiteTemplate (settings.branding.templateId) — the 60-design registry
 *   3. Ad-hoc branding override (settings.branding.colorPrimary/colorAccent) — predates Theme Builder
 *   4. Theme Builder's active TenantTheme, if one exists — full token set (colors, fonts, radius)
 *
 * Every public page consumes the result through CSS variables set on <body>
 * in the root layout, so the whole site follows it, not just the homepage.
 */
export interface SiteTheme {
  tpl?: WebsiteTemplate;
  dark: boolean;
  bg: string;
  surface: string;
  border: string;
  text: string;
  sub: string;
  primary: string;
  onPrimary: string;
  accent: string;
  onAccent: string;
  radius: string;
  /** Nav-item visibility flags (settings.branding.navFlags, tenant-admin
   * Website Builder → Navigation) — SiteNav.tsx reads these instead of
   * always showing Blog/Book for every tenant regardless of relevance.
   * Enabled by default (absent/undefined => true) so nothing changes for
   * tenants who never touch the new toggle. */
  blogEnabled: boolean;
  bookEnabled: boolean;
  /** Only set when a Theme Builder theme overrides fonts — undefined lets
   * per-template CSS fallbacks (e.g. TemplateHome's family-based serif
   * choice) keep working via CSS var(--x, fallback). */
  headingFont?: string;
  bodyFont?: string;
  /** Workstream B item 1 (website_builder_remaining.md): resolved hero
   * layout choice — the active Theme Builder theme's `heroLayout` token if
   * it's ever been set, otherwise undefined so callers (TemplateHome.tsx)
   * fall back to the tenant's original template's `heroType`. Same
   * published/draft/preview resolution as every other token above. */
  heroLayout?: string;
  /** Workstream B item 3 (website_builder_remaining.md): resolved footer
   * structure — the active Theme Builder theme's `footerConfig` JSON token
   * if it's ever been set, otherwise undefined so callers (SiteFooter.tsx)
   * fall back to the site's original hardcoded footer content. Same
   * published/draft/preview resolution as every other token above. */
  footerConfig?: FooterConfig;
  /** Settings page's plain `branding.social` (Facebook/Instagram/TikTok/
   * YouTube URLs) — a separate, older mechanism than Theme Builder's
   * `footerConfig.socialLinks`. Only used as a fallback by SiteFooter.tsx
   * when footerConfig (or its socialLinks) is unset, so a tenant who only
   * ever used the Settings page's social fields still sees them rendered. */
  brandingSocial?: { facebook?: string; instagram?: string; tiktok?: string; youtube?: string };
  /** Workstream B item 4 (website_builder_remaining.md): resolved card/
   * button/icon style tokens — the active Theme Builder theme's
   * `cardStyle`/`ctaStyle`/`iconStyle` values if ever set, otherwise
   * undefined so callers (TemplateHome.tsx, PageSectionRenderer.tsx,
   * EcommerceHome.tsx) fall back to the tenant's original template's
   * cardStyle/ctaStyle/iconStyle. Same published/draft/preview resolution
   * as every other token above. */
  cardStyle?: string;
  ctaStyle?: string;
  iconStyle?: string;
}

export interface FooterConfig {
  columns: Array<{ title: string; links: Array<{ label: string; url: string }> }>;
  socialLinks: Array<{ platform: string; url: string }>;
  showNewsletter: boolean;
  copyrightText: string;
}

interface ActiveTheme {
  colorPrimary: string | null;
  colorAccent: string | null;
  colorBackground: string | null;
  colorSurface: string | null;
  colorText: string | null;
  colorTextSecondary: string | null;
  headingFont: string | null;
  bodyFont: string | null;
  borderRadius: number | null;
  heroLayout: string | null;
  footerConfig: FooterConfig | null;
  cardStyle: string | null;
  ctaStyle: string | null;
  iconStyle: string | null;
}

async function getActiveTheme(subdomain: string, previewToken?: string): Promise<ActiveTheme | null> {
  try {
    const qs = previewToken ? `?preview=${encodeURIComponent(previewToken)}` : '';
    const res = await fetch(`${API_BASE_URL}/themes/public/${subdomain}/active${qs}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) || null;
  } catch {
    return null;
  }
}

/** Perceived luminance → readable text color on a colored background. */
function onColor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? '#111111' : '#ffffff';
}

function isDarkBg(hex: string): boolean {
  return onColor(hex) === '#ffffff';
}

/** Legacy look for tenants without a template — matches the original dark site. */
const LEGACY: Omit<SiteTheme, 'primary' | 'onPrimary' | 'accent' | 'onAccent' | 'headingFont' | 'bodyFont'> = {
  dark: true,
  bg: '#0f0f10',
  surface: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.10)',
  text: '#ffffff',
  sub: 'rgba(255,255,255,0.70)',
  radius: '12px',
  blogEnabled: true,
  bookEnabled: true,
};

export async function getSiteTheme(
  subdomain: string,
  fallbackPrimary = '#E85D24',
  fallbackAccent = '#F2A623',
  /** Signed admin preview token (Theme Builder Phase 3) — when present and
   * valid, bypasses the published-only filter so an admin can preview
   * unpublished draft token edits before hitting "Publish theme". Passed
   * through as a `?theme_preview=` query param on the public site by the
   * tenant-admin theme editor's "Preview" link. */
  previewToken?: string,
): Promise<SiteTheme> {
  const [tenant, activeTheme] = await Promise.all([
    getTenantBySubdomain(subdomain).catch(() => null),
    getActiveTheme(subdomain, previewToken),
  ]);
  const branding = ((tenant?.settings as any) || {}).branding || {};
  const tpl: WebsiteTemplate | undefined = branding.templateId ? getTemplate(branding.templateId) : undefined;
  const navFlags = branding.navFlags || {};
  const blogEnabled = navFlags.blogEnabled ?? true;
  const bookEnabled = navFlags.bookEnabled ?? true;

  const primary = activeTheme?.colorPrimary || branding.colorPrimary || tpl?.palette.primary || fallbackPrimary;
  const accent = activeTheme?.colorAccent || branding.colorAccent || tpl?.palette.accent || fallbackAccent;
  const headingFont = activeTheme?.headingFont || undefined;
  const bodyFont = activeTheme?.bodyFont || undefined;
  const radiusPx = activeTheme?.borderRadius ?? (tpl ? Math.min(tpl.borderRadius, 14) : 12);
  const heroLayout = activeTheme?.heroLayout || undefined;
  const footerConfig = activeTheme?.footerConfig || undefined;
  const brandingSocial = branding.social && Object.values(branding.social).some(Boolean) ? branding.social : undefined;
  const cardStyle = activeTheme?.cardStyle || undefined;
  const ctaStyle = activeTheme?.ctaStyle || undefined;
  const iconStyle = activeTheme?.iconStyle || undefined;

  const base = tpl
    ? { bg: tpl.palette.background, text: tpl.palette.text, sub: tpl.palette.textSecondary }
    : { bg: LEGACY.bg, text: LEGACY.text, sub: LEGACY.sub };

  const bg = activeTheme?.colorBackground || base.bg;
  const dark = isDarkBg(bg);
  const surface = activeTheme?.colorSurface || (tpl ? (dark ? 'rgba(255,255,255,0.06)' : tpl.palette.surface) : LEGACY.surface);
  const text = activeTheme?.colorText || base.text;
  const sub = activeTheme?.colorTextSecondary || base.sub;
  const border = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';

  return {
    tpl,
    dark,
    bg,
    surface,
    border,
    text,
    sub,
    primary,
    onPrimary: onColor(primary),
    accent,
    onAccent: onColor(accent),
    radius: `${radiusPx}px`,
    headingFont,
    bodyFont,
    heroLayout,
    footerConfig,
    brandingSocial,
    cardStyle,
    ctaStyle,
    iconStyle,
    blogEnabled,
    bookEnabled,
  };
}

/** CSS custom properties consumed by every page (server and client). Font
 * vars are omitted entirely when not overridden, so `var(--site-body-font,
 * <per-template-fallback>)` in component styles still falls through
 * correctly instead of resolving to an empty string. */
export function themeVars(t: SiteTheme): Record<string, string> {
  return {
    '--site-bg': t.bg,
    '--site-surface': t.surface,
    '--site-border': t.border,
    '--site-text': t.text,
    '--site-sub': t.sub,
    '--site-primary': t.primary,
    '--site-on-primary': t.onPrimary,
    '--site-accent': t.accent,
    '--site-on-accent': t.onAccent,
    '--site-radius': t.radius,
    ...(t.headingFont ? { '--site-heading-font': t.headingFont } : {}),
    ...(t.bodyFont ? { '--site-body-font': t.bodyFont } : {}),
  };
}
