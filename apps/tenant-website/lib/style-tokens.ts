import type { CSSProperties } from 'react';

/**
 * Workstream B item 4 (website_builder_remaining.md): card/button/icon
 * style tokens actually wired to rendering.
 *
 * Same vocabularies as WebsiteTemplate.cardStyle/ctaStyle/iconStyle in
 * packages/shared/src/themes/templates.ts, so an existing template's values
 * remain valid Theme Builder choices. Structural (non-color) Tailwind
 * classes only — callers supply color via inline style/CSS vars, same
 * convention already used throughout tenant-website (raw hex in
 * TemplateHome.tsx, `var(--site-*)` everywhere else).
 *
 * Each `default`/unrecognized branch below reproduces EXACTLY the class
 * string that was hardcoded inline before this token existed, so a caller
 * that never resolves a valid token value renders identically to before.
 */

export const KNOWN_CARD_STYLES = ['elevated', 'image-overlay', 'flat-bordered', 'glassmorphism', 'thick-border'] as const;
export const KNOWN_CTA_STYLES = ['gradient-banner', 'full-width-banner', 'inline-text', 'floating-glow', 'sticky-bar'] as const;
export const KNOWN_ICON_STYLES = ['outline', 'thin-line', 'geometric', 'duotone', 'filled'] as const;

export type CardStyleToken = (typeof KNOWN_CARD_STYLES)[number];
export type CtaStyleToken = (typeof KNOWN_CTA_STYLES)[number];
export type IconStyleToken = (typeof KNOWN_ICON_STYLES)[number];

/** Theme Builder's token (if ever set) wins; otherwise falls back to the
 * tenant's original template's value; otherwise undefined (caller's own
 * pre-existing default classes apply). Mirrors TemplateHome.tsx's
 * KNOWN_HERO_TYPES validation for heroLayout. */
export function resolveCardStyle(token?: string | null, templateDefault?: string): CardStyleToken | undefined {
  if (token && (KNOWN_CARD_STYLES as readonly string[]).includes(token)) return token as CardStyleToken;
  if (templateDefault && (KNOWN_CARD_STYLES as readonly string[]).includes(templateDefault)) return templateDefault as CardStyleToken;
  return undefined;
}
export function resolveCtaStyle(token?: string | null, templateDefault?: string): CtaStyleToken | undefined {
  if (token && (KNOWN_CTA_STYLES as readonly string[]).includes(token)) return token as CtaStyleToken;
  if (templateDefault && (KNOWN_CTA_STYLES as readonly string[]).includes(templateDefault)) return templateDefault as CtaStyleToken;
  return undefined;
}
export function resolveIconStyle(token?: string | null, templateDefault?: string): IconStyleToken | undefined {
  if (token && (KNOWN_ICON_STYLES as readonly string[]).includes(token)) return token as IconStyleToken;
  if (templateDefault && (KNOWN_ICON_STYLES as readonly string[]).includes(templateDefault)) return templateDefault as IconStyleToken;
  return undefined;
}

/** Legacy default: `rounded-xl border border-gray-200` — PageSectionRenderer's
 * pre-existing hardcoded card treatment for features/testimonials/pricing. */
const CARD_LEGACY = 'rounded-xl border border-gray-200';

export function cardClasses(style?: CardStyleToken | string): string {
  switch (style) {
    case 'elevated': return 'rounded-xl shadow-lg border-0';
    case 'image-overlay': return 'rounded-md overflow-hidden shadow-md border-0';
    case 'flat-bordered': return 'rounded-md border border-gray-200 shadow-none';
    case 'glassmorphism': return 'rounded-2xl border border-white/10 backdrop-blur-sm bg-white/5 shadow-none';
    case 'thick-border': return 'rounded-none border-[3px] shadow-none';
    default: return CARD_LEGACY;
  }
}

/** Legacy default: `rounded-lg font-semibold text-white` — every CTA anchor
 * in PageSectionRenderer/TemplateHome's bottom CTA section before this
 * token existed. */
export function ctaButtonClasses(style?: CtaStyleToken | string): string {
  switch (style) {
    case 'gradient-banner': return 'rounded-lg font-semibold text-white';
    case 'full-width-banner': return 'block w-full rounded-none font-bold uppercase tracking-wide text-white text-center';
    case 'inline-text': return 'font-semibold underline underline-offset-4 bg-transparent';
    case 'floating-glow': return 'rounded-full font-semibold text-white';
    case 'sticky-bar': return 'rounded-none font-black uppercase border-4 text-white';
    default: return 'rounded-lg font-semibold text-white';
  }
}

/** Inline style companion to ctaButtonClasses — colors can't be expressed
 * as static Tailwind classes since they come from the tenant's resolved
 * primary color (hex or CSS var). */
export function ctaButtonStyle(style: CtaStyleToken | string | undefined, color: string): CSSProperties {
  switch (style) {
    case 'inline-text':
      return { color };
    case 'gradient-banner':
      return { backgroundImage: `linear-gradient(90deg, ${color}, ${color}cc)` };
    case 'floating-glow':
      return { backgroundColor: color, boxShadow: `0 0 24px ${color}66` };
    case 'sticky-bar':
      return { backgroundColor: color, borderColor: color };
    default:
      return { backgroundColor: color };
  }
}

/** Small decorative accent element classes (e.g. the bullet/bar preceding a
 * feature card's title) — the only place iconStyle has anything to drive
 * today, since no icon library/rendering exists anywhere on the public site
 * (iconStyle was previously a fully inert label, unlike cardStyle/ctaStyle
 * which at least had partial per-family hardcoding). */
export function iconAccentClasses(style?: IconStyleToken | string): string {
  switch (style) {
    case 'outline': return 'rounded-full border-2 bg-transparent';
    case 'thin-line': return 'rounded-none h-px';
    case 'geometric': return 'rotate-45';
    case 'duotone': return 'rounded-full opacity-70';
    case 'filled': return 'rounded-md';
    default: return 'rounded-md';
  }
}

export function iconAccentStyle(style: IconStyleToken | string | undefined, color: string): CSSProperties {
  if (style === 'outline') return { borderColor: color };
  return { backgroundColor: color };
}
