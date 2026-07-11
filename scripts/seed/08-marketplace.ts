/**
 * Dexo v5 - 08: MARKETPLACE catalog (idempotent, upsert by slug)
 *
 * 4 vertical website templates + 4 plugins (matching plan module keys)
 * + 2 general templates. All published; a mix of free and paid so the
 * "payment pending" flow is exercisable.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Gradient placeholder thumbnails (rendered by frontends as fallback too).
const grad = (from: string, to: string) =>
  `https://placehold.co/640x400/${from}/${to}?text=+`;

const ITEMS: any[] = [
  // ---- Website templates (vertical) ----
  {
    type: 'template',
    slug: 'fitness-pro',
    name: 'Fitness Pro',
    description: 'High-energy gym website template with class schedules, trainer profiles and membership CTAs.',
    longDescription:
      'Fitness Pro is a conversion-focused website template built for gyms and fitness studios. It ships with a bold hero, class timetable, trainer showcase, pricing tables wired to your membership plans, testimonial carousel and a lead-capture contact form that feeds straight into your CRM inbox.',
    category: 'fitness',
    domainType: 'fitness',
    thumbnail: grad('4f46e5', 'a78bfa'),
    screenshots: [grad('4f46e5', 'a78bfa'), grad('312e81', '6366f1')],
    priceCents: 0,
    features: ['Class schedule section', 'Trainer profiles', 'Membership pricing tables', 'CRM-wired contact form', 'Mobile-first layout', 'SEO-ready meta'],
    config: { templateKey: 'fitness-pro', pages: ['home', 'classes', 'trainers', 'pricing', 'contact'] },
    status: 'published',
    installCount: 42,
  },
  {
    type: 'template',
    slug: 'restaurant-deluxe',
    name: 'Restaurant Deluxe',
    description: 'Elegant restaurant template with menu showcase, table reservations and gallery.',
    longDescription:
      'Restaurant Deluxe gives your restaurant a refined online presence: a full-menu showcase with categories and prices, a reservation request form, chef and story sections, an image gallery and integrated opening-hours and location blocks.',
    category: 'restaurant',
    domainType: 'restaurant',
    thumbnail: grad('b45309', 'fbbf24'),
    screenshots: [grad('b45309', 'fbbf24')],
    priceCents: 0,
    features: ['Menu showcase with categories', 'Reservation request form', 'Photo gallery', 'Opening hours & map block', 'Chef & story sections'],
    config: { templateKey: 'restaurant-deluxe', pages: ['home', 'menu', 'reservations', 'gallery', 'contact'] },
    status: 'published',
    installCount: 31,
  },
  {
    type: 'template',
    slug: 'salon-elegance',
    name: 'Salon Elegance',
    description: 'Soft, modern salon & spa template with services, stylists and online booking CTA.',
    longDescription:
      'Salon Elegance is designed for salons, spas and beauty studios. It features a services price list, stylist team grid, before/after gallery, promo banner support and booking call-to-actions throughout.',
    category: 'salon',
    domainType: 'salon',
    thumbnail: grad('be185d', 'f9a8d4'),
    screenshots: [grad('be185d', 'f9a8d4')],
    priceCents: 149900,
    features: ['Services & price list', 'Stylist team grid', 'Before/after gallery', 'Booking CTAs', 'Promo banners'],
    config: { templateKey: 'salon-elegance', pages: ['home', 'services', 'team', 'gallery', 'contact'] },
    status: 'published',
    installCount: 12,
  },
  {
    type: 'template',
    slug: 'school-hub',
    name: 'School Hub',
    description: 'Clean school website template with programs, admissions, notices and events.',
    longDescription:
      'School Hub covers everything an academic institution needs online: program/course listings, admissions info with enquiry form, notice board, events calendar, faculty directory and a photo gallery.',
    category: 'school',
    domainType: 'school',
    thumbnail: grad('065f46', '34d399'),
    screenshots: [grad('065f46', '34d399')],
    priceCents: 0,
    features: ['Programs & courses', 'Admissions enquiry form', 'Notice board', 'Events calendar', 'Faculty directory'],
    config: { templateKey: 'school-hub', pages: ['home', 'programs', 'admissions', 'notices', 'contact'] },
    status: 'published',
    installCount: 18,
  },

  // ---- Plugins (match plan module keys) ----
  {
    type: 'plugin',
    slug: 'crm-inbox',
    name: 'CRM Omni-channel Inbox',
    description: 'Unified inbox for WhatsApp, Instagram, Facebook, TikTok, email, SMS and website messages.',
    longDescription:
      'Bring every customer conversation into one place. The CRM plugin threads messages by sender across WhatsApp, Instagram, Facebook, TikTok, Viber, SMS, email and your website contact form — with status, priority, assignment and reply tracking.',
    category: 'communication',
    domainType: null,
    thumbnail: grad('0e7490', '67e8f9'),
    priceCents: 0,
    features: ['8 channels in one inbox', 'Webhook receivers per channel', 'Assignment & priorities', 'Reply tracking', 'Spam filtering'],
    config: { moduleKey: 'crm' },
    status: 'published',
    installCount: 57,
  },
  {
    type: 'plugin',
    slug: 'biometric-attendance',
    name: 'Biometric Attendance',
    description: 'ZKTeco device integration with automatic log pulling, daily and monthly reports.',
    longDescription:
      'Connect ZKTeco biometric devices to Dexo. The attendance plugin pulls punch logs on a schedule, matches them to members and staff, and produces daily, monthly and summary attendance reports.',
    category: 'operations',
    domainType: null,
    thumbnail: grad('7c2d12', 'fb923c'),
    priceCents: 99900,
    features: ['ZKTeco device support', 'Scheduled log pulling', 'Daily & monthly reports', 'Member matching', 'Multi-device'],
    config: { moduleKey: 'attendance' },
    status: 'published',
    installCount: 9,
  },
  {
    type: 'plugin',
    slug: 'website-builder',
    name: 'Website Builder',
    description: 'Drag-and-drop website builder with themes, custom domains and publishing.',
    longDescription:
      'Build and publish your business website without code. Includes section-based editing, theme presets, custom domain mapping and one-click publishing to your tenant subdomain.',
    category: 'website',
    domainType: null,
    thumbnail: grad('1e3a8a', '60a5fa'),
    priceCents: 0,
    features: ['Section-based editor', 'Theme presets', 'Custom domains', 'One-click publish', 'Mobile preview'],
    config: { moduleKey: 'website_builder' },
    status: 'published',
    installCount: 64,
  },
  {
    type: 'plugin',
    slug: 'online-payments',
    name: 'Online Payments',
    description: 'Accept eSewa, Khalti and card payments with automatic invoice reconciliation.',
    longDescription:
      'Let customers pay online. The payments plugin connects eSewa, Khalti and card gateways, posts payments against invoices automatically and keeps your NFRS reports in sync.',
    category: 'finance',
    domainType: null,
    thumbnail: grad('14532d', '4ade80'),
    priceCents: 0,
    features: ['eSewa & Khalti', 'Card gateway support', 'Auto invoice reconciliation', 'Refund handling', 'NFRS-report sync'],
    config: { moduleKey: 'payments_online' },
    status: 'published',
    installCount: 27,
  },

  // ---- General templates ----
  {
    type: 'template',
    slug: 'startup-launch',
    name: 'Startup Launch',
    description: 'General-purpose landing page template for launches, products and services.',
    longDescription:
      'A crisp, modern one-pager for any business: hero with CTA, feature grid, social proof, pricing and contact sections. Works for every vertical.',
    category: 'general',
    domainType: null,
    thumbnail: grad('111827', '9ca3af'),
    priceCents: 0,
    features: ['Hero with CTA', 'Feature grid', 'Testimonials', 'Pricing section', 'Contact form'],
    config: { templateKey: 'startup-launch', pages: ['home'] },
    status: 'published',
    installCount: 22,
  },
  {
    type: 'template',
    slug: 'portfolio-minimal',
    name: 'Portfolio Minimal',
    description: 'Minimal portfolio/brochure template with project gallery and about page.',
    longDescription:
      'Portfolio Minimal keeps the focus on your work: a clean project gallery, about and services pages, and a simple contact form. Ideal for freelancers, agencies and studios of any kind.',
    category: 'general',
    domainType: null,
    thumbnail: grad('581c87', 'c084fc'),
    priceCents: 49900,
    features: ['Project gallery', 'About & services pages', 'Contact form', 'Minimal typography'],
    config: { templateKey: 'portfolio-minimal', pages: ['home', 'work', 'about', 'contact'] },
    status: 'published',
    installCount: 7,
  },
];

export async function seed08Marketplace() {
  console.log('  → 08-marketplace');
  for (const item of ITEMS) {
    const { installCount, ...data } = item;
    await prisma.marketplaceItem.upsert({
      where: { slug: item.slug },
      // Keep live counters (installCount/rating) on re-run; refresh content.
      update: data,
      create: { ...data, installCount },
    });
  }
  console.log(`     ${ITEMS.length} marketplace items upserted`);
}

// Allow standalone run: npx ts-node --transpile-only scripts/seed/08-marketplace.ts
if (require.main === module) {
  seed08Marketplace()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ 08-marketplace failed:', err);
      process.exit(1);
    });
}
