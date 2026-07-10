import React from 'react';

/**
 * DEXO logo — the "Tenant Cube": three stacked isometric planes forming a
 * negative-space D (brand/Brand/02-visual-guidelines.md, 07-logo-design.md).
 *
 * variant:
 *  - "light"  → Ink symbol + Indigo accent plane (for light backgrounds)
 *  - "dark"   → Paper symbol + Volt Lime accent plane (for dark backgrounds)
 *  - "mono"   → single currentColor, no accent plane
 * withWordmark renders the horizontal lockup (wordmark = Space Grotesk Bold,
 * all-caps, +2% tracking; gap = 0.5× symbol width).
 */
export interface DexoLogoProps {
  size?: number;
  variant?: 'light' | 'dark' | 'mono';
  withWordmark?: boolean;
  className?: string;
}

export function DexoMark({ size = 24, variant = 'light', className }: DexoLogoProps) {
  const base = variant === 'dark' ? '#FAFAFA' : variant === 'mono' ? 'currentColor' : '#09090B';
  const accent = variant === 'dark' ? '#A3E635' : variant === 'mono' ? 'currentColor' : '#4F46E5';
  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="DEXO logo mark"
    >
      <path d="M16 62 48 46l32 16-32 16z" fill={base} />
      <path d="M16 48 48 32l32 16-32 16z" fill={base} opacity={0.7} />
      <path d="M16 34 48 18l32 16-32 16z" fill={accent} />
    </svg>
  );
}

export function DexoLogo({ size = 24, variant = 'light', withWordmark = true, className }: DexoLogoProps) {
  if (!withWordmark) return <DexoMark size={size} variant={variant} className={className} />;
  const textColor = variant === 'dark' ? '#FAFAFA' : variant === 'mono' ? 'currentColor' : '#09090B';
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.5 }}>
      <DexoMark size={size} variant={variant} />
      <span
        style={{
          fontFamily: 'var(--font-display, "Space Grotesk", system-ui, sans-serif)',
          fontWeight: 700,
          fontSize: size * 0.75,
          letterSpacing: '0.02em',
          color: textColor,
          lineHeight: 1,
        }}
      >
        DEXO
      </span>
    </span>
  );
}

export default DexoLogo;
