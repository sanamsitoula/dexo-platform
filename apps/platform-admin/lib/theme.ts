export interface ThemeConfig {
  primaryColor: string;
  primaryHoverColor: string;
  primaryLightColor: string;
  secondaryColor: string;
  accentColor: string;
  borderRadius: string;
  fontFamily: string;
  darkMode: boolean;
}

export const defaultTheme: ThemeConfig = {
  primaryColor: '#4f46e5',
  primaryHoverColor: '#4338ca',
  primaryLightColor: '#eef2ff',
  secondaryColor: '#6b7280',
  accentColor: '#10b981',
  borderRadius: '0.5rem',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  darkMode: false,
};

export const themeTemplates: Array<{
  id: string;
  name: string;
  description: string;
  preview: string;
  config: ThemeConfig;
}> = [
  {
    id: 'indigo-modern',
    name: 'Indigo Modern',
    description: 'Clean and professional with indigo tones',
    preview: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
    config: {
      primaryColor: '#4f46e5',
      primaryHoverColor: '#4338ca',
      primaryLightColor: '#eef2ff',
      secondaryColor: '#6b7280',
      accentColor: '#10b981',
      borderRadius: '0.5rem',
      fontFamily: 'Inter, system-ui, sans-serif',
      darkMode: false,
    },
  },
  {
    id: 'emerald-nature',
    name: 'Emerald Nature',
    description: 'Fresh and natural with green accents',
    preview: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    config: {
      primaryColor: '#059669',
      primaryHoverColor: '#047857',
      primaryLightColor: '#ecfdf5',
      secondaryColor: '#78716c',
      accentColor: '#f59e0b',
      borderRadius: '0.75rem',
      fontFamily: 'Inter, system-ui, sans-serif',
      darkMode: false,
    },
  },
  {
    id: 'rose-elegant',
    name: 'Rose Elegant',
    description: 'Sophisticated with rose and purple tones',
    preview: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
    config: {
      primaryColor: '#e11d48',
      primaryHoverColor: '#be123c',
      primaryLightColor: '#fff1f2',
      secondaryColor: '#64748b',
      accentColor: '#8b5cf6',
      borderRadius: '1rem',
      fontFamily: 'Inter, system-ui, sans-serif',
      darkMode: false,
    },
  },
  {
    id: 'slate-professional',
    name: 'Slate Professional',
    description: 'Corporate and trustworthy with blue slate',
    preview: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
    config: {
      primaryColor: '#1e40af',
      primaryHoverColor: '#1e3a8a',
      primaryLightColor: '#eff6ff',
      secondaryColor: '#475569',
      accentColor: '#0891b2',
      borderRadius: '0.375rem',
      fontFamily: 'Inter, system-ui, sans-serif',
      darkMode: false,
    },
  },
  {
    id: 'amber-warm',
    name: 'Amber Warm',
    description: 'Warm and inviting with amber tones',
    preview: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    config: {
      primaryColor: '#d97706',
      primaryHoverColor: '#b45309',
      primaryLightColor: '#fffbeb',
      secondaryColor: '#78716c',
      accentColor: '#dc2626',
      borderRadius: '0.625rem',
      fontFamily: 'Inter, system-ui, sans-serif',
      darkMode: false,
    },
  },
  {
    id: 'violet-creative',
    name: 'Violet Creative',
    description: 'Creative and bold with violet accents',
    preview: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    config: {
      primaryColor: '#7c3aed',
      primaryHoverColor: '#6d28d9',
      primaryLightColor: '#f5f3ff',
      secondaryColor: '#6b7280',
      accentColor: '#ec4899',
      borderRadius: '1.5rem',
      fontFamily: 'Inter, system-ui, sans-serif',
      darkMode: false,
    },
  },
  {
    id: 'dark-midnight',
    name: 'Dark Midnight',
    description: 'Dark mode with sleek aesthetics',
    preview: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
    config: {
      primaryColor: '#6366f1',
      primaryHoverColor: '#4f46e5',
      primaryLightColor: '#312e81',
      secondaryColor: '#9ca3af',
      accentColor: '#10b981',
      borderRadius: '0.5rem',
      fontFamily: 'Inter, system-ui, sans-serif',
      darkMode: true,
    },
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    description: 'Cool and calming with ocean blues',
    preview: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
    config: {
      primaryColor: '#0891b2',
      primaryHoverColor: '#0e7490',
      primaryLightColor: '#ecfeff',
      secondaryColor: '#64748b',
      accentColor: '#f59e0b',
      borderRadius: '0.75rem',
      fontFamily: 'Inter, system-ui, sans-serif',
      darkMode: false,
    },
  },
];

export function applyTheme(config: Partial<ThemeConfig>) {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  
  if (config.primaryColor) {
    root.style.setProperty('--color-primary', config.primaryColor);
  }
  if (config.primaryHoverColor) {
    root.style.setProperty('--color-primary-hover', config.primaryHoverColor);
  }
  if (config.primaryLightColor) {
    root.style.setProperty('--color-primary-light', config.primaryLightColor);
  }
  if (config.secondaryColor) {
    root.style.setProperty('--color-secondary', config.secondaryColor);
  }
  if (config.accentColor) {
    root.style.setProperty('--color-accent', config.accentColor);
  }
  if (config.borderRadius) {
    root.style.setProperty('--border-radius', config.borderRadius);
  }
  if (config.fontFamily) {
    root.style.setProperty('--font-family-base', config.fontFamily);
  }
  
  if (config.darkMode) {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }
}

export function loadTheme(): ThemeConfig {
  if (typeof window === 'undefined') return defaultTheme;
  
  const stored = localStorage.getItem('platform-theme');
  if (stored) {
    try {
      const config = { ...defaultTheme, ...JSON.parse(stored) };
      applyTheme(config);
      return config;
    } catch {
      applyTheme(defaultTheme);
      return defaultTheme;
    }
  }
  
  applyTheme(defaultTheme);
  return defaultTheme;
}

export function saveTheme(config: ThemeConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('platform-theme', JSON.stringify(config));
  applyTheme(config);
}

export function resetTheme() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('platform-theme');
  applyTheme(defaultTheme);
}
