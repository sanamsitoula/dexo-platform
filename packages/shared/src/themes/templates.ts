/**
 * OneDexo plug-and-play website template ecosystem.
 *
 * 5 design families x 12 business types = 60 templates. Each family is a
 * complete design system (hero structure, navigation, journey, cards, forms,
 * animation, admin theme) so two templates for the same business look like
 * they came from different agencies — not recolors of one layout.
 *
 * Pure data: safe to deep-import from client bundles.
 */

export type TemplateFamilyId = 'aurora' | 'maison' | 'slate' | 'nocturne' | 'bloc';

export type HeroType = 'split' | 'fullscreen' | 'floating-cards' | 'editorial' | 'bold-block';
export type NavigationStyle = 'classic' | 'centered' | 'minimal' | 'transparent' | 'bottom-bar';

export interface TemplatePalette {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
}

export interface WebsiteTemplate {
  id: string;
  businessType: string;
  businessLabel: string;
  templateName: string;
  family: TemplateFamilyId;
  style: string;
  description: string;
  recommendedBrand: string;
  palette: TemplatePalette;
  fonts: [heading: string, body: string];
  heroType: HeroType;
  navigationStyle: NavigationStyle;
  animationStyle: string;
  cardStyle: string;
  ctaStyle: string;
  iconStyle: string;
  borderRadius: number;
  sections: string[];
  forms: string[];
  adminTheme: string;
  hero: { title: string; subtitle: string; cta: string };
  premium: boolean;
}

/* ------------------------------------------------------------------ */
/* Industry content packs                                              */
/* ------------------------------------------------------------------ */

interface IndustryPack {
  key: string;
  label: string;
  emoji: string;
  /** Brand hue seeds: [primary, accent] */
  colors: [string, string];
  /** e.g. "bespoke tailoring" — the craft, lowercase */
  craft: string;
  /** e.g. "garment" — the thing being sold/served, singular lowercase */
  item: string;
  /** e.g. "clients" */
  audience: string;
  /** Primary conversion action, imperative */
  action: string;
  /** Industry-specific homepage sections woven into each journey */
  specialSections: string[];
  /** Industry-specific forms */
  forms: string[];
}

const INDUSTRIES: IndustryPack[] = [
  {
    key: 'tailor', label: 'Tailor Shop', emoji: '🧵',
    colors: ['#8B5A2B', '#C9A227'],
    craft: 'bespoke tailoring', item: 'garment', audience: 'clients', action: 'Book a Fitting',
    specialSections: ['collections', 'fabric-gallery', 'measurements', 'custom-orders'],
    forms: ['Measurement Form', 'Custom Order Form', 'Appointment Form'],
  },
  {
    key: 'restaurant', label: 'Restaurant & Cafe', emoji: '🍽️',
    colors: ['#C0392B', '#F39C12'],
    craft: 'culinary excellence', item: 'dish', audience: 'guests', action: 'Reserve a Table',
    specialSections: ['food-menu', 'chef-story', 'offers', 'gallery'],
    forms: ['Reservation Form', 'Catering Inquiry', 'Feedback Form'],
  },
  {
    key: 'salon', label: 'Salon & Spa', emoji: '💇',
    colors: ['#BE185D', '#F472B6'],
    craft: 'beauty & wellness', item: 'treatment', audience: 'clients', action: 'Book an Appointment',
    specialSections: ['stylists', 'treatments', 'packages', 'gallery'],
    forms: ['Appointment Form', 'Package Inquiry', 'Gift Card Form'],
  },
  {
    key: 'fitness', label: 'Fitness Center', emoji: '🏋️',
    colors: ['#EA580C', '#FACC15'],
    craft: 'strength & performance', item: 'program', audience: 'members', action: 'Start Training',
    specialSections: ['trainers', 'classes', 'membership', 'transformations'],
    forms: ['Membership Form', 'Trial Class Form', 'Trainer Booking'],
  },
  {
    key: 'healthcare', label: 'Healthcare Clinic', emoji: '🏥',
    colors: ['#0E7490', '#22D3EE'],
    craft: 'compassionate care', item: 'treatment', audience: 'patients', action: 'Book an Appointment',
    specialSections: ['doctors', 'departments', 'treatments', 'emergency'],
    forms: ['Appointment Form', 'Patient Registration', 'Report Request'],
  },
  {
    key: 'school', label: 'School & Education', emoji: '🏫',
    colors: ['#1D4ED8', '#60A5FA'],
    craft: 'learning excellence', item: 'course', audience: 'students', action: 'Apply for Admission',
    specialSections: ['courses', 'teachers', 'campus-life', 'events'],
    forms: ['Admission Form', 'Campus Visit Form', 'Scholarship Inquiry'],
  },
  {
    key: 'coaching', label: 'Coaching Institute', emoji: '🎓',
    colors: ['#6D28D9', '#A78BFA'],
    craft: 'exam success', item: 'batch', audience: 'students', action: 'Enroll Now',
    specialSections: ['courses', 'results', 'faculty', 'batches'],
    forms: ['Course Enrollment', 'Demo Class Form', 'Counselling Form'],
  },
  {
    key: 'ecommerce', label: 'Ecommerce', emoji: '🛒',
    colors: ['#059669', '#34D399'],
    craft: 'curated shopping', item: 'product', audience: 'shoppers', action: 'Shop Now',
    specialSections: ['categories', 'products', 'offers', 'new-arrivals'],
    forms: ['Order Form', 'Return Request', 'Support Ticket'],
  },
  {
    key: 'hotel', label: 'Hotel & Hospitality', emoji: '🏨',
    colors: ['#92400E', '#D4A853'],
    craft: 'refined hospitality', item: 'room', audience: 'guests', action: 'Book Your Stay',
    specialSections: ['rooms', 'amenities', 'experiences', 'dining'],
    forms: ['Booking Form', 'Event Inquiry', 'Concierge Request'],
  },
  {
    key: 'logistics', label: 'Logistics & Delivery', emoji: '🚚',
    colors: ['#B45309', '#FBBF24'],
    craft: 'reliable delivery', item: 'shipment', audience: 'businesses', action: 'Get a Quote',
    specialSections: ['delivery-tracking', 'coverage', 'fleet', 'case-studies'],
    forms: ['Quote Form', 'Delivery Request', 'Track Shipment'],
  },
  {
    key: 'corporate', label: 'SME / Corporate', emoji: '🏢',
    colors: ['#1E3A5F', '#3B82F6'],
    craft: 'business growth', item: 'solution', audience: 'partners', action: 'Talk to Us',
    specialSections: ['case-studies', 'timeline', 'achievements', 'team'],
    forms: ['Inquiry Form', 'Quote Form', 'Career Application'],
  },
  {
    key: 'ngo', label: 'Non-Profit', emoji: '❤️',
    colors: ['#B91C1C', '#F87171'],
    craft: 'community impact', item: 'cause', audience: 'supporters', action: 'Donate Now',
    specialSections: ['causes', 'impact-stats', 'events', 'volunteers'],
    forms: ['Donation Form', 'Volunteer Form', 'Partnership Inquiry'],
  },
];

/* ------------------------------------------------------------------ */
/* Design families                                                     */
/* ------------------------------------------------------------------ */

interface TemplateFamily {
  id: TemplateFamilyId;
  suffix: string;
  style: string;
  recommendedBrand: string;
  heroType: HeroType;
  navigationStyle: NavigationStyle;
  animationStyle: string;
  cardStyle: string;
  ctaStyle: string;
  iconStyle: string;
  borderRadius: number;
  fonts: [string, string];
  adminTheme: string;
  premium: boolean;
  /** Light/dark scaffold; primary/accent come from the industry seed. */
  scaffold: (p: string, a: string) => TemplatePalette;
  /** Journey: base section order; `special` slots are filled per industry. */
  journey: (special: string[]) => string[];
  copy: (ind: IndustryPack) => { title: string; subtitle: string; cta: string };
  describe: (ind: IndustryPack) => string;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const FAMILIES: TemplateFamily[] = [
  {
    id: 'aurora', suffix: 'Aurora', style: 'Modern SaaS',
    recommendedBrand: 'Modern', heroType: 'split', navigationStyle: 'classic',
    animationStyle: 'fade-slide', cardStyle: 'elevated', ctaStyle: 'gradient-banner',
    iconStyle: 'outline', borderRadius: 16,
    fonts: ['Inter', 'Inter'], adminTheme: 'light-sidebar', premium: false,
    scaffold: (p, a) => ({ primary: p, accent: a, background: '#F8FAFC', surface: '#FFFFFF', text: '#0F172A', textSecondary: '#64748B' }),
    journey: (s) => ['hero', 'services', s[0], 'stats', 'testimonials', 'pricing', 'faq', 'contact', 'footer'],
    copy: (i) => ({
      title: `${cap(i.craft)}, made effortless`,
      subtitle: `Everything your ${i.audience} expect — online booking, updates and more, in one modern experience.`,
      cta: i.action,
    }),
    describe: (i) => `Clean split-hero layout with soft gradients and elevated cards — a modern, trustworthy face for ${i.craft}.`,
  },
  {
    id: 'maison', suffix: 'Maison', style: 'Luxury Editorial',
    recommendedBrand: 'Luxury', heroType: 'fullscreen', navigationStyle: 'centered',
    animationStyle: 'slow-reveal', cardStyle: 'image-overlay', ctaStyle: 'full-width-banner',
    iconStyle: 'thin-line', borderRadius: 2,
    fonts: ['Playfair Display', 'Lato'], adminTheme: 'ivory-serif', premium: true,
    scaffold: (p, a) => ({ primary: p, accent: a, background: '#FBF9F4', surface: '#FFFFFF', text: '#1C1917', textSecondary: '#78716C' }),
    journey: (s) => ['hero', 'about', s[0], s[1] || 'gallery', 'testimonials', 'booking', 'newsletter', 'footer'],
    copy: (i) => ({
      title: `The art of ${i.craft}`,
      subtitle: `An experience crafted for ${i.audience} who appreciate the exceptional.`,
      cta: i.action,
    }),
    describe: (i) => `Full-screen imagery, serif typography and generous whitespace — ${i.craft} presented like a luxury house.`,
  },
  {
    id: 'slate', suffix: 'Slate', style: 'Minimal',
    recommendedBrand: 'Minimal', heroType: 'editorial', navigationStyle: 'minimal',
    animationStyle: 'subtle-fade', cardStyle: 'flat-bordered', ctaStyle: 'inline-text',
    iconStyle: 'geometric', borderRadius: 8,
    fonts: ['Space Grotesk', 'IBM Plex Sans'], adminTheme: 'mono-light', premium: false,
    scaffold: (p) => ({ primary: p, accent: '#111827', background: '#FFFFFF', surface: '#F4F4F5', text: '#18181B', textSecondary: '#71717A' }),
    journey: (s) => ['hero', s[0], 'about', 'process', 'pricing', 'contact', 'footer'],
    copy: (i) => ({
      title: `${cap(i.craft)}. Nothing else.`,
      subtitle: `A focused ${i.item} experience for ${i.audience} who value clarity.`,
      cta: i.action,
    }),
    describe: (i) => `Typography-first minimalism with flat bordered cards and a short, focused journey — ${i.craft} without the noise.`,
  },
  {
    id: 'nocturne', suffix: 'Nocturne', style: 'Dark Premium',
    recommendedBrand: 'Dark Premium', heroType: 'floating-cards', navigationStyle: 'transparent',
    animationStyle: 'parallax-glow', cardStyle: 'glassmorphism', ctaStyle: 'floating-glow',
    iconStyle: 'duotone', borderRadius: 20,
    fonts: ['Sora', 'Inter'], adminTheme: 'midnight-glass', premium: true,
    scaffold: (p, a) => ({ primary: p, accent: a, background: '#0B0F1A', surface: '#151B2B', text: '#F1F5F9', textSecondary: '#8B93A7' }),
    journey: (s) => ['hero', 'stats', 'services', s[0], s[1] || 'gallery', 'membership', 'testimonials', 'cta', 'footer'],
    copy: (i) => ({
      title: `${cap(i.craft)}, after dark`,
      subtitle: `A premium ${i.item} experience with glassmorphic depth for ${i.audience} who want more.`,
      cta: i.action,
    }),
    describe: (i) => `Deep dark canvas, glass cards floating over glow gradients — the premium night-mode face of ${i.craft}.`,
  },
  {
    id: 'bloc', suffix: 'Bloc', style: 'Bold Neo-Brutalism',
    recommendedBrand: 'Bold', heroType: 'bold-block', navigationStyle: 'bottom-bar',
    animationStyle: 'snap-zoom', cardStyle: 'thick-border', ctaStyle: 'sticky-bar',
    iconStyle: 'filled', borderRadius: 0,
    fonts: ['Archivo Black', 'Archivo'], adminTheme: 'high-contrast', premium: false,
    scaffold: (p, a) => ({ primary: p, accent: a, background: '#FFFDF5', surface: '#FFFFFF', text: '#000000', textSecondary: '#404040' }),
    journey: (s) => ['hero', 'offers', s[0], 'benefits', 'testimonials', 'faq', 'cta', 'footer'],
    copy: (i) => ({
      title: `${i.craft.toUpperCase()}. NO COMPROMISE.`,
      subtitle: `Loud, fast and unmistakable — the ${i.item} destination ${i.audience} remember.`,
      cta: i.action.toUpperCase(),
    }),
    describe: (i) => `Thick borders, block colors and oversized type — a neo-brutalist statement that makes ${i.craft} impossible to ignore.`,
  },
];

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

export const websiteTemplates: WebsiteTemplate[] = INDUSTRIES.flatMap((ind) =>
  FAMILIES.map((fam) => {
    const [primary, accent] = ind.colors;
    return {
      id: `${ind.key}-${fam.id}`,
      businessType: ind.key,
      businessLabel: ind.label,
      templateName: `${ind.label.split(' ')[0]} ${fam.suffix}`,
      family: fam.id,
      style: fam.style,
      description: fam.describe(ind),
      recommendedBrand: fam.recommendedBrand,
      palette: fam.scaffold(primary, accent),
      fonts: fam.fonts,
      heroType: fam.heroType,
      navigationStyle: fam.navigationStyle,
      animationStyle: fam.animationStyle,
      cardStyle: fam.cardStyle,
      ctaStyle: fam.ctaStyle,
      iconStyle: fam.iconStyle,
      borderRadius: fam.borderRadius,
      sections: fam.journey(ind.specialSections),
      forms: ind.forms,
      adminTheme: fam.adminTheme,
      hero: fam.copy(ind),
      premium: fam.premium,
    };
  }),
);

/** Fuzzy-match a business-template domainType to a template businessType key. */
export function templatesForDomain(domainType: string): WebsiteTemplate[] {
  const d = domainType.toLowerCase();
  const aliases: Record<string, string[]> = {
    tailor: ['tailor'],
    restaurant: ['restaurant', 'cafe', 'food'],
    salon: ['salon', 'spa', 'beauty'],
    fitness: ['fitness', 'gym'],
    healthcare: ['health', 'clinic', 'hospital', 'dental'],
    school: ['school', 'education'],
    coaching: ['coaching', 'institute', 'training'],
    ecommerce: ['ecommerce', 'shop', 'retail', 'store'],
    hotel: ['hotel', 'hospitality', 'resort'],
    logistics: ['logistics', 'delivery', 'courier'],
    corporate: ['corporate', 'sme', 'business', 'agency'],
    ngo: ['ngo', 'non-profit', 'nonprofit', 'charity'],
  };
  const key = Object.keys(aliases).find((k) => aliases[k].some((a) => d.includes(a)));
  const matches = websiteTemplates.filter((t) => t.businessType === key);
  // Unknown industries still get a full template set (corporate works everywhere).
  return matches.length ? matches : websiteTemplates.filter((t) => t.businessType === 'corporate');
}

export function getTemplate(id: string): WebsiteTemplate | undefined {
  return websiteTemplates.find((t) => t.id === id);
}
