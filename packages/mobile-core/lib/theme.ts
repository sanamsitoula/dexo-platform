/**
 * Dexo Fitness — design tokens (mobile)
 *
 * Premium consumer-fitness system (Material 3 base, Apple-Fitness / Linear polish).
 * Fully backward compatible: every legacy key (Colors.primary, Spacing.md,
 * BorderRadius.md, FontSize.md, …) is preserved. New tokens are additive.
 *
 * Brand color is per-gym; screens pass the resolved tenant color where a brand
 * accent is wanted and fall back to Colors.primary.
 */

export const Colors = {
  // Brand (default; overridden per-tenant at runtime)
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  primaryDark: '#1D4ED8',
  onPrimary: '#FFFFFF',

  // Surfaces
  background: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F3F6',
  card: '#FFFFFF',

  // Text
  text: '#0B0F19',
  textSecondary: '#5B6472',
  textLight: '#9AA3AF',
  textMuted: '#9AA3AF',
  onDark: '#FFFFFF',

  border: '#EAECEF',
  divider: '#F0F2F5',

  // Semantic
  success: '#16A34A',
  successBg: '#DCFCE7',
  warning: '#F59E0B',
  warningBg: '#FEF3C7',
  error: '#EF4444',
  errorBg: '#FEE2E2',
  info: '#2563EB',

  // Accents for rings / charts / streaks
  move: '#FF375F', // activity / calories (Apple move ring vibe)
  exercise: '#7AF13B',
  stand: '#38E0E0',
  streak: '#FB923C',

  white: '#FFFFFF',
  black: '#000000',
  scrim: 'rgba(11,15,25,0.5)',
};

/** Dark theme palette (used when the app is in dark mode). */
export const DarkColors = {
  ...Colors,
  background: '#0B0F19',
  surface: '#141926',
  surfaceAlt: '#1B2130',
  card: '#141926',
  text: '#F4F6FA',
  textSecondary: '#A6B0C0',
  textLight: '#6B7686',
  textMuted: '#6B7686',
  border: '#232A38',
  divider: '#1C2331',
  onDark: '#0B0F19',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 56,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xl2: 24,
  xl3: 28,
  hero: 32,
  full: 9999,
};

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  title: 28,
  hero: 32,
  display: 40,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};

/** Shadow-light elevation (soft, low-contrast — never heavy/glassy). */
export const Shadows = {
  none: {},
  sm: {
    shadowColor: '#0B0F19',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#0B0F19',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  lg: {
    shadowColor: '#0B0F19',
    shadowOpacity: 0.12,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
};

/** Motion — durations (ms) + easing intent. Keep interactions subtle & fast. */
export const Motion = {
  fast: 160,
  base: 240,
  slow: 380,
  celebrate: 900,
  spring: { damping: 16, stiffness: 180, mass: 0.9 },
};

export const Layout = {
  screenPadding: 20,
  maxContentWidth: 480,
  touchTarget: 48,
};

export const Theme = {
  Colors,
  DarkColors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  Shadows,
  Motion,
  Layout,
};

export default Theme;
