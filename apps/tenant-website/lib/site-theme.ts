import { getTemplate, type WebsiteTemplate } from '@dexo/shared/src/themes';
import { getTenantBySubdomain } from './api';

/**
 * Site-wide theme resolved from the tenant's chosen website template
 * (settings.branding.templateId) + branding color overrides. Every public page
 * consumes this through CSS variables set on <body> in the root layout, so the
 * whole site — not just the homepage — follows the selected template.
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
const LEGACY: Omit<SiteTheme, 'primary' | 'onPrimary' | 'accent' | 'onAccent'> = {
  dark: true,
  bg: '#0f0f10',
  surface: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.10)',
  text: '#ffffff',
  sub: 'rgba(255,255,255,0.70)',
  radius: '12px',
};

export async function getSiteTheme(
  subdomain: string,
  fallbackPrimary = '#E85D24',
  fallbackAccent = '#F2A623',
): Promise<SiteTheme> {
  const tenant = await getTenantBySubdomain(subdomain).catch(() => null);
  const branding = ((tenant?.settings as any) || {}).branding || {};
  const tpl: WebsiteTemplate | undefined = branding.templateId ? getTemplate(branding.templateId) : undefined;

  const primary = branding.colorPrimary || tpl?.palette.primary || fallbackPrimary;
  const accent = branding.colorAccent || tpl?.palette.accent || fallbackAccent;

  if (tpl) {
    const dark = isDarkBg(tpl.palette.background);
    return {
      tpl,
      dark,
      bg: tpl.palette.background,
      surface: dark ? 'rgba(255,255,255,0.06)' : tpl.palette.surface,
      border: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
      text: tpl.palette.text,
      sub: tpl.palette.textSecondary,
      primary,
      onPrimary: onColor(primary),
      accent,
      onAccent: onColor(accent),
      radius: `${Math.min(tpl.borderRadius, 14)}px`,
    };
  }

  return { ...LEGACY, primary, onPrimary: onColor(primary), accent, onAccent: onColor(accent) };
}

/** CSS custom properties consumed by every page (server and client). */
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
  };
}
