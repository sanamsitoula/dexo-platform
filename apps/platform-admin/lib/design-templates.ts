/**
 * Dexo Design Template Library
 *
 * Premium design templates for each industry domain.
 * Each template includes complete design tokens (colors, typography, layout)
 * plus a config for the public website, customer portal, and admin dashboard.
 *
 * 2 domains × 5 templates each = 10 templates now.
 * Future domains added in design-templates-extra.ts.
 */

export interface DesignTokens {
  colors: {
    primary: string
    primaryDark: string
    primaryLight: string
    secondary: string
    secondaryDark: string
    accent: string
    background: string
    surface: string
    surfaceAlt: string
    text: string
    textMuted: string
    textInverse: string
    border: string
    success: string
    warning: string
    danger: string
  }
  typography: {
    fontFamily: string
    fontFamilyHeading: string
    headingWeight: '400' | '500' | '600' | '700' | '800' | '900'
    bodyWeight: '400' | '500'
    h1Size: string
    h2Size: string
    h3Size: string
    bodySize: string
    smallSize: string
    lineHeight: string
    letterSpacing: string
  }
  layout: {
    borderRadius: string
    borderRadiusLg: string
    spacing: string
    containerMaxWidth: string
  }
  shadows: {
    sm: string
    md: string
    lg: string
    xl: string
  }
  mode: 'light' | 'dark' | 'both'
}

export interface DesignTemplate {
  id: string
  domainCode: string
  name: string
  tagline: string
  description: string
  thumbnail: string // emoji icon
  personality: string
  targetAudience: string
  bestFor: string[]
  features: string[]
  // Hero mockup (emoji representation of layout)
  heroLayout: 'centered' | 'split' | 'full-width' | 'video-bg' | 'gradient' | 'side-image'
  cardStyle: 'flat' | 'elevated' | 'outlined' | 'glassmorphism'
  navigationStyle: 'top-bar' | 'side-drawer' | 'mega-menu' | 'minimal'
  spacing: 'compact' | 'comfortable' | 'spacious'
  mode: 'light' | 'dark' | 'both'
  tokens: DesignTokens
  // Page structure
  pages: string[]
  components: string[]
  // Optional preview gradient (built from tokens)
  previewGradient: string
}

// ============================================
// SALON & SPA — 5 TEMPLATES
// ============================================

const SALON_TEMPLATES: DesignTemplate[] = [
  {
    id: 'salon-luxury-beauty',
    domainCode: 'SALON_AND_SPA',
    name: 'Luxury Beauty',
    tagline: 'Refined elegance for premium salons',
    description: 'A royal, sophisticated design with deep purples and gold accents. Perfect for high-end salons, premium beauty clinics, and luxury spa resorts.',
    thumbnail: '👑',
    personality: 'Royal, refined, opulent, sophisticated',
    targetAudience: 'High-end clientele, premium beauty seekers',
    bestFor: ['5-star salons', 'Luxury beauty clinics', 'Premium spas'],
    features: ['Gold leaf accents', 'Serif headlines', 'Image gallery focus', 'Service pricing tables', 'Loyalty program'],
    heroLayout: 'centered',
    cardStyle: 'elevated',
    navigationStyle: 'top-bar',
    spacing: 'spacious',
    mode: 'light',
    pages: ['Home', 'Services', 'Stylists', 'Gallery', 'Pricing', 'Booking', 'About', 'Contact'],
    components: ['Hero with rotating CTA', 'Service grid with pricing', 'Stylist cards', 'Testimonial carousel', 'Gallery masonry', 'Booking calendar', 'Contact map'],
    tokens: {
      colors: {
        primary: '#7C3AED', primaryDark: '#5B21B6', primaryLight: '#A78BFA',
        secondary: '#1E1B4B', secondaryDark: '#0F0E2E',
        accent: '#F59E0B',
        background: '#FAF5FF', surface: '#FFFFFF', surfaceAlt: '#F5F3FF',
        text: '#1E1B4B', textMuted: '#6B7280', textInverse: '#FFFFFF',
        border: '#E9D5FF',
        success: '#10B981', warning: '#F59E0B', danger: '#EF4444',
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
        fontFamilyHeading: 'Playfair Display, Georgia, serif',
        headingWeight: '700',
        bodyWeight: '400',
        h1Size: '4rem', h2Size: '3rem', h3Size: '2.25rem',
        bodySize: '1.0625rem', smallSize: '0.875rem',
        lineHeight: '1.7', letterSpacing: '-0.01em',
      },
      layout: { borderRadius: '0.5rem', borderRadiusLg: '1rem', spacing: '2rem', containerMaxWidth: '1280px' },
      shadows: { sm: '0 1px 2px rgba(124,58,237,0.08)', md: '0 4px 12px rgba(124,58,237,0.12)', lg: '0 12px 32px rgba(124,58,237,0.16)', xl: '0 24px 64px rgba(124,58,237,0.2)' },
      mode: 'light',
    },
    previewGradient: 'linear-gradient(135deg, #7C3AED 0%, #F59E0B 100%)',
  },
  {
    id: 'salon-modern-studio',
    domainCode: 'SALON_AND_SPA',
    name: 'Modern Studio',
    tagline: 'Fresh, clean & contemporary',
    description: 'A bright, minimal design with soft pinks and crisp whites. Ideal for trendy modern salons, nail bars, and boutique beauty studios.',
    thumbnail: '🌸',
    personality: 'Fresh, friendly, modern, approachable',
    targetAudience: 'Millennials, Gen Z, urban professionals',
    bestFor: ['Modern salons', 'Nail bars', 'Boutique beauty studios', 'Lash & brow bars'],
    features: ['Rounded shapes', 'Soft pastels', 'Instagram-ready', 'Service-first navigation', 'Online booking emphasis'],
    heroLayout: 'gradient',
    cardStyle: 'flat',
    navigationStyle: 'minimal',
    spacing: 'comfortable',
    mode: 'light',
    pages: ['Home', 'Services', 'Team', 'Booking', 'Shop', 'Blog', 'Contact'],
    components: ['Soft gradient hero', 'Service category pills', 'Stylist grid', 'Testimonial slider', 'Booking calendar', 'Shop grid', 'Blog cards'],
    tokens: {
      colors: {
        primary: '#EC4899', primaryDark: '#BE185D', primaryLight: '#F9A8D4',
        secondary: '#FDF2F8', secondaryDark: '#FCE7F3',
        accent: '#8B5CF6',
        background: '#FFFFFF', surface: '#FFFFFF', surfaceAlt: '#FDF2F8',
        text: '#831843', textMuted: '#9D174D', textInverse: '#FFFFFF',
        border: '#FBCFE8',
        success: '#10B981', warning: '#F59E0B', danger: '#EF4444',
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
        fontFamilyHeading: 'Inter, sans-serif',
        headingWeight: '600',
        bodyWeight: '400',
        h1Size: '3.5rem', h2Size: '2.5rem', h3Size: '1.875rem',
        bodySize: '1rem', smallSize: '0.875rem',
        lineHeight: '1.6', letterSpacing: '-0.01em',
      },
      layout: { borderRadius: '9999px', borderRadiusLg: '1.5rem', spacing: '1.5rem', containerMaxWidth: '1200px' },
      shadows: { sm: '0 1px 2px rgba(236,72,153,0.06)', md: '0 4px 16px rgba(236,72,153,0.1)', lg: '0 12px 32px rgba(236,72,153,0.14)', xl: '0 24px 48px rgba(236,72,153,0.18)' },
      mode: 'light',
    },
    previewGradient: 'linear-gradient(135deg, #FDF2F8 0%, #EC4899 100%)',
  },
  {
    id: 'salon-organic-wellness',
    domainCode: 'SALON_AND_SPA',
    name: 'Organic Wellness',
    tagline: 'Natural, calming & holistic',
    description: 'An earthy, calm design with sage greens and warm neutrals. Perfect for wellness spas, organic beauty brands, and holistic health centers.',
    thumbnail: '🌿',
    personality: 'Calm, natural, healing, mindful',
    targetAudience: 'Wellness enthusiasts, organic beauty seekers, holistic health clients',
    bestFor: ['Wellness spas', 'Organic beauty brands', 'Holistic health centers', 'Meditation centers'],
    features: ['Earth tones', 'Generous whitespace', 'Mindful micro-copy', 'Treatment journey visualization', 'Wellness blog'],
    heroLayout: 'split',
    cardStyle: 'flat',
    navigationStyle: 'minimal',
    spacing: 'spacious',
    mode: 'light',
    pages: ['Home', 'Treatments', 'Wellness Journey', 'Pricing', 'About', 'Contact'],
    components: ['Split hero with image', 'Treatment journey steps', 'Wellness programs', 'Testimonial cards', 'Blog list', 'Newsletter signup'],
    tokens: {
      colors: {
        primary: '#65A30D', primaryDark: '#3F6212', primaryLight: '#BEF264',
        secondary: '#F0FDF4', secondaryDark: '#DCFCE7',
        accent: '#CA8A04',
        background: '#FEFCE8', surface: '#FFFFFF', surfaceAlt: '#F7FEE7',
        text: '#365314', textMuted: '#65A30D', textInverse: '#FFFFFF',
        border: '#D9F99D',
        success: '#10B981', warning: '#F59E0B', danger: '#EF4444',
      },
      typography: {
        fontFamily: 'Nunito, sans-serif',
        fontFamilyHeading: 'Cormorant Garamond, serif',
        headingWeight: '600',
        bodyWeight: '400',
        h1Size: '4rem', h2Size: '2.75rem', h3Size: '2rem',
        bodySize: '1.0625rem', smallSize: '0.875rem',
        lineHeight: '1.8', letterSpacing: '0',
      },
      layout: { borderRadius: '0.75rem', borderRadiusLg: '1.25rem', spacing: '2.5rem', containerMaxWidth: '1240px' },
      shadows: { sm: '0 1px 2px rgba(101,163,13,0.05)', md: '0 4px 12px rgba(101,163,13,0.08)', lg: '0 12px 24px rgba(101,163,13,0.1)', xl: '0 24px 48px rgba(101,163,13,0.12)' },
      mode: 'light',
    },
    previewGradient: 'linear-gradient(135deg, #FEFCE8 0%, #65A30D 100%)',
  },
  {
    id: 'salon-premium-spa-resort',
    domainCode: 'SALON_AND_SPA',
    name: 'Premium Spa Resort',
    tagline: 'Five-star luxury, dark & cinematic',
    description: 'A dark, cinematic design with rose gold accents. Built for destination spas, premium resort spas, and high-end wellness retreats.',
    thumbnail: '🌙',
    personality: 'Cinematic, opulent, indulgent, exclusive',
    targetAudience: 'Affluent travelers, luxury seekers, premium subscribers',
    bestFor: ['Resort spas', 'Hotel spas', 'Wellness retreats', 'Day spas'],
    features: ['Full-bleed video hero', 'Cinematic scroll', 'Parallax sections', 'Dark/light toggle', 'Resort booking engine'],
    heroLayout: 'video-bg',
    cardStyle: 'glassmorphism',
    navigationStyle: 'mega-menu',
    spacing: 'spacious',
    mode: 'both',
    pages: ['Home', 'The Spa', 'Treatments', 'Residences', 'Dining', 'Wellness', 'Booking', 'Contact'],
    components: ['Video hero overlay', 'Treatment carousel', 'Room gallery', 'Spa journey timeline', 'Wellness programs', 'Concierge booking'],
    tokens: {
      colors: {
        primary: '#F43F5E', primaryDark: '#BE123C', primaryLight: '#FDA4AF',
        secondary: '#0F172A', secondaryDark: '#020617',
        accent: '#FBBF24',
        background: '#0F172A', surface: '#1E293B', surfaceAlt: '#334155',
        text: '#F8FAFC', textMuted: '#94A3B8', textInverse: '#0F172A',
        border: '#334155',
        success: '#34D399', warning: '#FBBF24', danger: '#F87171',
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
        fontFamilyHeading: 'Cormorant Garamond, serif',
        headingWeight: '700',
        bodyWeight: '300',
        h1Size: '5rem', h2Size: '3.5rem', h3Size: '2.5rem',
        bodySize: '1.0625rem', smallSize: '0.875rem',
        lineHeight: '1.8', letterSpacing: '0.02em',
      },
      layout: { borderRadius: '0.25rem', borderRadiusLg: '0.5rem', spacing: '3rem', containerMaxWidth: '1440px' },
      shadows: { sm: '0 2px 4px rgba(0,0,0,0.3)', md: '0 8px 24px rgba(0,0,0,0.4)', lg: '0 16px 48px rgba(0,0,0,0.5)', xl: '0 32px 80px rgba(0,0,0,0.6)' },
      mode: 'both',
    },
    previewGradient: 'linear-gradient(135deg, #0F172A 0%, #F43F5E 50%, #FBBF24 100%)',
  },
  {
    id: 'salon-boutique',
    domainCode: 'SALON_AND_SPA',
    name: 'Boutique Salon',
    tagline: 'Intimate, handcrafted, personal',
    description: 'A warm, handcrafted design with terracotta and cream. Designed for neighborhood boutique salons, family-run businesses, and artisan stylists.',
    thumbnail: '🌻',
    personality: 'Warm, intimate, personal, handcrafted',
    targetAudience: 'Local community, regulars, neighborhood clientele',
    bestFor: ['Boutique salons', 'Family-run salons', 'Local stylists', 'Community favorites'],
    features: ['Handwritten touches', 'Personal stylist bios', 'Local focus', 'Warm color palette', 'Photo stories'],
    heroLayout: 'centered',
    cardStyle: 'outlined',
    navigationStyle: 'top-bar',
    spacing: 'comfortable',
    mode: 'light',
    pages: ['Home', 'About', 'Services', 'Stylists', 'Gallery', 'Visit Us'],
    components: ['Hero with personal touch', 'Personal stylist cards', 'Visit us section with map', 'Photo gallery', 'Hours & location'],
    tokens: {
      colors: {
        primary: '#C2410C', primaryDark: '#9A3412', primaryLight: '#FDBA74',
        secondary: '#FFF7ED', secondaryDark: '#FFEDD5',
        accent: '#92400E',
        background: '#FFFBF5', surface: '#FFFFFF', surfaceAlt: '#FFF7ED',
        text: '#7C2D12', textMuted: '#9A3412', textInverse: '#FFFFFF',
        border: '#FED7AA',
        success: '#16A34A', warning: '#EAB308', danger: '#DC2626',
      },
      typography: {
        fontFamily: 'Lora, Georgia, serif',
        fontFamilyHeading: 'Caveat, cursive',
        headingWeight: '500',
        bodyWeight: '400',
        h1Size: '3.5rem', h2Size: '2.5rem', h3Size: '1.875rem',
        bodySize: '1.0625rem', smallSize: '0.875rem',
        lineHeight: '1.7', letterSpacing: '0',
      },
      layout: { borderRadius: '0.5rem', borderRadiusLg: '1rem', spacing: '2rem', containerMaxWidth: '1200px' },
      shadows: { sm: '0 1px 2px rgba(194,65,12,0.06)', md: '0 4px 12px rgba(194,65,12,0.1)', lg: '0 12px 24px rgba(194,65,12,0.14)', xl: '0 24px 48px rgba(194,65,12,0.18)' },
      mode: 'light',
    },
    previewGradient: 'linear-gradient(135deg, #FED7AA 0%, #C2410C 100%)',
  },
]

// ============================================
// FITNESS CENTER — 5 TEMPLATES
// ============================================

const FITNESS_TEMPLATES: DesignTemplate[] = [
  {
    id: 'fitness-premium-gym',
    domainCode: 'FITNESS_CENTER',
    name: 'Premium Gym',
    tagline: 'Bold, energetic, dark & modern',
    description: 'A dark, high-impact design with bold orange accents. Built for premium gyms, performance centers, and members who want to feel the energy.',
    thumbnail: '🔥',
    personality: 'Bold, intense, motivating, powerful',
    targetAudience: 'Serious athletes, performance enthusiasts, premium members',
    bestFor: ['Premium gyms', 'Performance centers', 'Athletic clubs'],
    features: ['Dark mode default', 'Bold CTAs', 'Performance stats', 'Achievement badges', 'Live class schedules'],
    heroLayout: 'full-width',
    cardStyle: 'elevated',
    navigationStyle: 'top-bar',
    spacing: 'spacious',
    mode: 'dark',
    pages: ['Home', 'Classes', 'Trainers', 'Memberships', 'Schedule', 'Results', 'About'],
    components: ['Dark hero with video', 'Class schedule grid', 'Trainer profiles', 'Membership pricing', 'Results stats', 'Achievement showcase'],
    tokens: {
      colors: {
        primary: '#FF6B35', primaryDark: '#C2410C', primaryLight: '#FFA577',
        secondary: '#1A1A2E', secondaryDark: '#0F0F1E',
        accent: '#E94560',
        background: '#0F0F1E', surface: '#1A1A2E', surfaceAlt: '#252540',
        text: '#FFFFFF', textMuted: '#A1A1AA', textInverse: '#0F0F1E',
        border: '#2A2A45',
        success: '#10B981', warning: '#F59E0B', danger: '#EF4444',
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
        fontFamilyHeading: 'Inter, sans-serif',
        headingWeight: '900',
        bodyWeight: '400',
        h1Size: '5rem', h2Size: '3.5rem', h3Size: '2.5rem',
        bodySize: '1.0625rem', smallSize: '0.875rem',
        lineHeight: '1.2', letterSpacing: '-0.03em',
      },
      layout: { borderRadius: '0.5rem', borderRadiusLg: '0.75rem', spacing: '2rem', containerMaxWidth: '1320px' },
      shadows: { sm: '0 1px 2px rgba(0,0,0,0.4)', md: '0 4px 12px rgba(255,107,53,0.15)', lg: '0 12px 32px rgba(255,107,53,0.25)', xl: '0 24px 64px rgba(0,0,0,0.5)' },
      mode: 'dark',
    },
    previewGradient: 'linear-gradient(135deg, #0F0F1E 0%, #FF6B35 100%)',
  },
  {
    id: 'fitness-crossfit-studio',
    domainCode: 'FITNESS_CENTER',
    name: 'CrossFit Studio',
    tagline: 'Raw, gritty, performance-driven',
    description: 'A bold, industrial design with high-contrast colors. Built for CrossFit boxes, Olympic lifting gyms, and serious strength training facilities.',
    thumbnail: '🏋️',
    personality: 'Raw, intense, no-nonsense, focused',
    targetAudience: 'CrossFit athletes, powerlifters, Olympic lifters, performance seekers',
    bestFor: ['CrossFit boxes', 'Powerlifting gyms', 'Olympic lifting clubs', 'Strongman gyms'],
    features: ['Industrial design', 'High contrast', 'Bold typography', 'WOD (Workout of the Day) section', 'Leaderboard', 'PR tracking'],
    heroLayout: 'full-width',
    cardStyle: 'flat',
    navigationStyle: 'minimal',
    spacing: 'compact',
    mode: 'dark',
    pages: ['Home', 'WOD', 'Coaches', 'Schedule', 'Leaderboard', 'Pricing'],
    components: ['Bold hero with WOD display', 'Workout of the day board', 'Leaderboard', 'Coach profiles', 'Class schedule', 'Pricing tiers'],
    tokens: {
      colors: {
        primary: '#FACC15', primaryDark: '#CA8A04', primaryLight: '#FDE047',
        secondary: '#000000', secondaryDark: '#0A0A0A',
        accent: '#DC2626',
        background: '#0A0A0A', surface: '#171717', surfaceAlt: '#262626',
        text: '#FFFFFF', textMuted: '#A3A3A3', textInverse: '#0A0A0A',
        border: '#404040',
        success: '#22C55E', warning: '#FACC15', danger: '#DC2626',
      },
      typography: {
        fontFamily: 'Roboto, sans-serif',
        fontFamilyHeading: 'Oswald, sans-serif',
        headingWeight: '900',
        bodyWeight: '400',
        h1Size: '6rem', h2Size: '4rem', h3Size: '2.5rem',
        bodySize: '1.125rem', smallSize: '0.875rem',
        lineHeight: '1.1', letterSpacing: '0.02em',
      },
      layout: { borderRadius: '0', borderRadiusLg: '0.25rem', spacing: '1.5rem', containerMaxWidth: '1400px' },
      shadows: { sm: '0 0 0 rgba(0,0,0,0)', md: '0 2px 8px rgba(0,0,0,0.5)', lg: '0 8px 24px rgba(250,204,21,0.2)', xl: '0 16px 48px rgba(250,204,21,0.3)' },
      mode: 'dark',
    },
    previewGradient: 'linear-gradient(135deg, #0A0A0A 0%, #FACC15 100%)',
  },
  {
    id: 'fitness-yoga-wellness',
    domainCode: 'FITNESS_CENTER',
    name: 'Yoga Wellness',
    tagline: 'Calm, mindful & flowy',
    description: 'A serene, peaceful design with sage greens and soft pastels. Built for yoga studios, meditation centers, and wellness-focused fitness.',
    thumbnail: '🧘',
    personality: 'Calm, mindful, balanced, healing',
    targetAudience: 'Yoga practitioners, wellness seekers, mind-body enthusiasts',
    bestFor: ['Yoga studios', 'Meditation centers', 'Pilates studios', 'Wellness-focused gyms'],
    features: ['Generous whitespace', 'Calming animations', 'Class flow visualization', 'Mindful micro-copy', 'Meditation timer'],
    heroLayout: 'split',
    cardStyle: 'flat',
    navigationStyle: 'minimal',
    spacing: 'spacious',
    mode: 'light',
    pages: ['Home', 'Classes', 'Instructors', 'Pricing', 'Retreats', 'Journal', 'Contact'],
    components: ['Soft hero with breathing animation', 'Class types (Vinyasa, Hatha, Yin)', 'Instructor bios', 'Pricing plans', 'Retreats calendar', 'Journal/blog'],
    tokens: {
      colors: {
        primary: '#7C9885', primaryDark: '#5C7A6C', primaryLight: '#B5C9B8',
        secondary: '#F0EDE5', secondaryDark: '#E8E2D5',
        accent: '#D4A574',
        background: '#FAF8F4', surface: '#FFFFFF', surfaceAlt: '#F5F0E5',
        text: '#2C3E36', textMuted: '#6B7E72', textInverse: '#FFFFFF',
        border: '#E0D8C5',
        success: '#7C9885', warning: '#D4A574', danger: '#C44536',
      },
      typography: {
        fontFamily: 'Nunito, sans-serif',
        fontFamilyHeading: 'Cormorant Garamond, serif',
        headingWeight: '500',
        bodyWeight: '400',
        h1Size: '4rem', h2Size: '2.75rem', h3Size: '2rem',
        bodySize: '1.0625rem', smallSize: '0.875rem',
        lineHeight: '1.8', letterSpacing: '0',
      },
      layout: { borderRadius: '0.75rem', borderRadiusLg: '1.5rem', spacing: '3rem', containerMaxWidth: '1240px' },
      shadows: { sm: '0 1px 3px rgba(124,152,133,0.05)', md: '0 4px 16px rgba(124,152,133,0.08)', lg: '0 16px 32px rgba(124,152,133,0.1)', xl: '0 32px 64px rgba(124,152,133,0.12)' },
      mode: 'light',
    },
    previewGradient: 'linear-gradient(135deg, #F5F0E5 0%, #7C9885 100%)',
  },
  {
    id: 'fitness-personal-training',
    domainCode: 'FITNESS_CENTER',
    name: 'Personal Training Center',
    tagline: 'Modern, professional, results-focused',
    description: 'A clean, modern design with vibrant blues and high-contrast. Perfect for personal training studios, transformation centers, and 1-on-1 coaching.',
    thumbnail: '💪',
    personality: 'Professional, results-driven, modern, supportive',
    targetAudience: 'Personal training clients, transformation seekers, busy professionals',
    bestFor: ['Personal training studios', 'Transformation centers', '1-on-1 coaching', 'Boutique fitness'],
    features: ['Transformation stories', 'Before/after showcases', 'Online booking', 'Progress tracking', 'Nutrition plans'],
    heroLayout: 'centered',
    cardStyle: 'elevated',
    navigationStyle: 'top-bar',
    spacing: 'comfortable',
    mode: 'light',
    pages: ['Home', 'Coaches', 'Programs', 'Results', 'Pricing', 'Start Now'],
    components: ['Hero with transformation CTA', 'Coach profiles', 'Program cards', 'Results carousel', 'Pricing comparison', 'Booking widget'],
    tokens: {
      colors: {
        primary: '#2563EB', primaryDark: '#1D4ED8', primaryLight: '#60A5FA',
        secondary: '#1E293B', secondaryDark: '#0F172A',
        accent: '#06B6D4',
        background: '#FFFFFF', surface: '#FFFFFF', surfaceAlt: '#F1F5F9',
        text: '#0F172A', textMuted: '#64748B', textInverse: '#FFFFFF',
        border: '#E2E8F0',
        success: '#10B981', warning: '#F59E0B', danger: '#EF4444',
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
        fontFamilyHeading: 'Inter, sans-serif',
        headingWeight: '700',
        bodyWeight: '400',
        h1Size: '4rem', h2Size: '2.75rem', h3Size: '2rem',
        bodySize: '1.0625rem', smallSize: '0.875rem',
        lineHeight: '1.6', letterSpacing: '-0.02em',
      },
      layout: { borderRadius: '0.5rem', borderRadiusLg: '0.75rem', spacing: '2rem', containerMaxWidth: '1280px' },
      shadows: { sm: '0 1px 2px rgba(15,23,42,0.05)', md: '0 4px 12px rgba(37,99,235,0.1)', lg: '0 12px 24px rgba(37,99,235,0.15)', xl: '0 24px 48px rgba(15,23,42,0.2)' },
      mode: 'light',
    },
    previewGradient: 'linear-gradient(135deg, #60A5FA 0%, #2563EB 50%, #06B6D4 100%)',
  },
  {
    id: 'fitness-luxury-club',
    domainCode: 'FITNESS_CENTER',
    name: 'Luxury Fitness Club',
    tagline: 'Exclusive, premium, members-only',
    description: 'A sophisticated dark design with gold accents. Built for exclusive fitness clubs, members-only gyms, and high-end health clubs.',
    thumbnail: '✨',
    personality: 'Exclusive, refined, prestigious, members-only',
    targetAudience: 'Affluent members, executives, premium subscribers',
    bestFor: ['Members-only clubs', 'Executive gyms', 'Hotel fitness clubs', 'Country club gyms'],
    features: ['Application-only access', 'Concierge focus', 'Member directory', 'Event calendar', 'Premium amenities showcase'],
    heroLayout: 'centered',
    cardStyle: 'elevated',
    navigationStyle: 'mega-menu',
    spacing: 'spacious',
    mode: 'dark',
    pages: ['Home', 'The Club', 'Amenities', 'Membership', 'Events', 'Members', 'Apply'],
    components: ['Hero with member login', 'Amenities showcase', 'Member testimonials', 'Event calendar', 'Application form', 'Concierge contact'],
    tokens: {
      colors: {
        primary: '#D4AF37', primaryDark: '#B8860B', primaryLight: '#FFD700',
        secondary: '#0A0A0A', secondaryDark: '#000000',
        accent: '#E5C547',
        background: '#0A0A0A', surface: '#171717', surfaceAlt: '#262626',
        text: '#FAFAFA', textMuted: '#A3A3A3', textInverse: '#0A0A0A',
        border: '#404040',
        success: '#22C55E', warning: '#EAB308', danger: '#DC2626',
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
        fontFamilyHeading: 'Cormorant Garamond, serif',
        headingWeight: '600',
        bodyWeight: '300',
        h1Size: '5rem', h2Size: '3.5rem', h3Size: '2.5rem',
        bodySize: '1rem', smallSize: '0.8125rem',
        lineHeight: '1.8', letterSpacing: '0.05em',
      },
      layout: { borderRadius: '0', borderRadiusLg: '0.25rem', spacing: '3rem', containerMaxWidth: '1280px' },
      shadows: { sm: '0 1px 2px rgba(212,175,55,0.05)', md: '0 4px 12px rgba(212,175,55,0.1)', lg: '0 12px 32px rgba(212,175,55,0.15)', xl: '0 24px 64px rgba(212,175,55,0.2)' },
      mode: 'dark',
    },
    previewGradient: 'linear-gradient(135deg, #000000 0%, #D4AF37 100%)',
  },
]

// ============================================
// ALL TEMPLATES COMBINED
// ============================================

export const ALL_DESIGN_TEMPLATES: DesignTemplate[] = [
  ...SALON_TEMPLATES,
  ...FITNESS_TEMPLATES,
]

export const TEMPLATES_BY_DOMAIN: Record<string, DesignTemplate[]> = {
  SALON_AND_SPA: SALON_TEMPLATES,
  FITNESS_CENTER: FITNESS_TEMPLATES,
}

export const DEFAULT_TEMPLATE_IDS: Record<string, string> = {
  SALON_AND_SPA: 'salon-luxury-beauty',
  FITNESS_CENTER: 'fitness-premium-gym',
}

export function getTemplatesForDomain(domainCode: string): DesignTemplate[] {
  return TEMPLATES_BY_DOMAIN[domainCode] || []
}

export function getTemplateById(id: string): DesignTemplate | undefined {
  return ALL_DESIGN_TEMPLATES.find((t) => t.id === id)
}
