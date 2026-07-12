/**
 * Self-hosted DEXO brand fonts (next/font/local) — no network fetch at
 * build time. Replaces next/font/google, which failed intermittently on
 * the production VM (Google Fonts fetch timeouts under concurrent Turbo
 * builds). Font files sourced from @fontsource — see packages/ui/fonts/.
 */
import localFont from 'next/font/local';

export const inter = localFont({
  src: '../fonts/Inter-Variable.woff2',
  variable: '--font-inter',
  weight: '100 900',
  display: 'swap',
});

export const grotesk = localFont({
  src: '../fonts/SpaceGrotesk-Variable.woff2',
  variable: '--font-grotesk',
  weight: '300 700',
  display: 'swap',
});

export const jbMono = localFont({
  src: [
    { path: '../fonts/JetBrainsMono-400.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/JetBrainsMono-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-jbmono',
  display: 'swap',
});
