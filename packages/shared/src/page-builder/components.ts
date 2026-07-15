/**
 * Page Builder — Component Library.
 *
 * Pure data: one entry per component type. Each entry describes its
 * editable fields so tenant-admin can render a generic property form
 * without a bespoke UI per component — this is the "Component Library"
 * from the spec, implemented as data-driven forms rather than a
 * drag-and-drop visual canvas (that's a separate, later phase — see
 * website_builder_remaining.md).
 *
 * `content` on a PageSection row is untyped Json at the DB layer; these
 * field defs are what validates/shapes it at the API layer and renders the
 * edit form in tenant-admin. Adding a new component type is a data change
 * here, not a migration.
 */

export type FieldType = 'text' | 'textarea' | 'richtext' | 'image' | 'url' | 'list' | 'form-select';

export interface ListItemFieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'image' | 'url';
}

export interface ComponentFieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  /** Only for type:'list' — the shape of each repeated item. */
  itemFields?: ListItemFieldDef[];
}

export interface ComponentDef {
  key: string;
  label: string;
  category: 'layout' | 'content' | 'social-proof' | 'commerce' | 'forms';
  icon: string;
  description: string;
  fields: ComponentFieldDef[];
  /** Sensible starting content when a tenant first adds this section. */
  defaultContent: Record<string, any>;
}

export const COMPONENT_LIBRARY: ComponentDef[] = [
  {
    key: 'hero',
    label: 'Hero',
    category: 'layout',
    icon: '🏔️',
    description: 'Large intro banner with headline, subtext, image, and a call-to-action button.',
    fields: [
      { key: 'title', label: 'Headline', type: 'text' },
      { key: 'subtitle', label: 'Subheadline', type: 'textarea' },
      { key: 'image', label: 'Background image', type: 'image' },
      { key: 'ctaLabel', label: 'Button text', type: 'text' },
      { key: 'ctaUrl', label: 'Button link', type: 'url' },
    ],
    defaultContent: { title: 'Your headline here', subtitle: 'A short supporting sentence.', image: '', ctaLabel: 'Get Started', ctaUrl: '' },
  },
  {
    key: 'richtext',
    label: 'Rich Text',
    category: 'content',
    icon: '📝',
    description: 'Free-form formatted text — the same editor used in Menu Builder.',
    fields: [{ key: 'html', label: 'Content', type: 'richtext' }],
    defaultContent: { html: '' },
  },
  {
    key: 'cta',
    label: 'Call To Action',
    category: 'layout',
    icon: '📣',
    description: 'A focused prompt with one button — sign up, book now, contact us.',
    fields: [
      { key: 'title', label: 'Headline', type: 'text' },
      { key: 'subtitle', label: 'Supporting text', type: 'textarea' },
      { key: 'ctaLabel', label: 'Button text', type: 'text' },
      { key: 'ctaUrl', label: 'Button link', type: 'url' },
    ],
    defaultContent: { title: 'Ready to get started?', subtitle: '', ctaLabel: 'Contact Us', ctaUrl: '/contact' },
  },
  {
    key: 'features',
    label: 'Features',
    category: 'content',
    icon: '✨',
    description: 'A grid of feature/benefit cards, each with a title and description.',
    fields: [
      { key: 'title', label: 'Section title', type: 'text' },
      {
        key: 'items', label: 'Features', type: 'list',
        itemFields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
        ],
      },
    ],
    defaultContent: { title: 'Why choose us', items: [] },
  },
  {
    key: 'testimonials',
    label: 'Testimonials',
    category: 'social-proof',
    icon: '💬',
    description: 'Customer quotes with name and (optional) photo.',
    fields: [
      { key: 'title', label: 'Section title', type: 'text' },
      {
        key: 'items', label: 'Testimonials', type: 'list',
        itemFields: [
          { key: 'quote', label: 'Quote', type: 'textarea' },
          { key: 'author', label: 'Name', type: 'text' },
          { key: 'photo', label: 'Photo', type: 'image' },
        ],
      },
    ],
    defaultContent: { title: 'What our customers say', items: [] },
  },
  {
    key: 'pricing',
    label: 'Pricing',
    category: 'commerce',
    icon: '💰',
    description: 'Side-by-side pricing plan cards.',
    fields: [
      { key: 'title', label: 'Section title', type: 'text' },
      {
        key: 'items', label: 'Plans', type: 'list',
        itemFields: [
          { key: 'name', label: 'Plan name', type: 'text' },
          { key: 'price', label: 'Price', type: 'text' },
          { key: 'description', label: 'What\'s included', type: 'textarea' },
        ],
      },
    ],
    defaultContent: { title: 'Plans & Pricing', items: [] },
  },
  {
    key: 'faq',
    label: 'FAQ',
    category: 'content',
    icon: '❓',
    description: 'Frequently asked questions as an expandable list.',
    fields: [
      { key: 'title', label: 'Section title', type: 'text' },
      {
        key: 'items', label: 'Questions', type: 'list',
        itemFields: [
          { key: 'question', label: 'Question', type: 'text' },
          { key: 'answer', label: 'Answer', type: 'textarea' },
        ],
      },
    ],
    defaultContent: { title: 'Frequently Asked Questions', items: [] },
  },
  {
    key: 'gallery',
    label: 'Gallery',
    category: 'content',
    icon: '🖼️',
    description: 'A grid of images — from the Media Library.',
    fields: [
      { key: 'title', label: 'Section title', type: 'text' },
      {
        key: 'items', label: 'Images', type: 'list',
        itemFields: [
          { key: 'image', label: 'Image', type: 'image' },
          { key: 'caption', label: 'Caption', type: 'text' },
        ],
      },
    ],
    defaultContent: { title: 'Gallery', items: [] },
  },
  {
    key: 'team',
    label: 'Team',
    category: 'social-proof',
    icon: '👥',
    description: 'Staff/team member cards with photo, name, and role.',
    fields: [
      { key: 'title', label: 'Section title', type: 'text' },
      {
        key: 'items', label: 'Team members', type: 'list',
        itemFields: [
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'role', label: 'Role', type: 'text' },
          { key: 'photo', label: 'Photo', type: 'image' },
        ],
      },
    ],
    defaultContent: { title: 'Meet the Team', items: [] },
  },
  {
    key: 'contact',
    label: 'Contact Section',
    category: 'forms',
    icon: '📍',
    description: 'Address, phone, email, and map link.',
    fields: [
      { key: 'title', label: 'Section title', type: 'text' },
      { key: 'address', label: 'Address', type: 'textarea' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'mapUrl', label: 'Map link', type: 'url' },
    ],
    defaultContent: { title: 'Get in touch', address: '', phone: '', email: '', mapUrl: '' },
  },
  {
    key: 'form',
    label: 'Form',
    category: 'forms',
    icon: '📋',
    description: 'Embed a form built in the Forms Builder — visitors submit it directly on this page.',
    fields: [{ key: 'formId', label: 'Form', type: 'form-select' }],
    defaultContent: { formId: '' },
  },
  {
    key: 'newsletter',
    label: 'Newsletter Signup',
    category: 'forms',
    icon: '📧',
    description: 'Email capture with a headline and button (submits to the tenant\'s contact-message pipeline).',
    fields: [
      { key: 'title', label: 'Headline', type: 'text' },
      { key: 'subtitle', label: 'Supporting text', type: 'textarea' },
      { key: 'ctaLabel', label: 'Button text', type: 'text' },
    ],
    defaultContent: { title: 'Stay in the loop', subtitle: '', ctaLabel: 'Subscribe' },
  },
  {
    key: 'ecommerce-hero',
    label: 'Store Hero',
    category: 'commerce',
    icon: '🛍️',
    description: 'Premium storefront hero — headline, subtext, two CTAs, and a lifestyle image. Modeled on Nike/Shopify storefronts.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow (small label)', type: 'text' },
      { key: 'title', label: 'Headline', type: 'text' },
      { key: 'subtitle', label: 'Subheadline', type: 'textarea' },
      { key: 'image', label: 'Image', type: 'image' },
      { key: 'primaryCtaLabel', label: 'Primary button text', type: 'text' },
      { key: 'primaryCtaUrl', label: 'Primary button link', type: 'url' },
      { key: 'secondaryCtaLabel', label: 'Secondary button text', type: 'text' },
      { key: 'secondaryCtaUrl', label: 'Secondary button link', type: 'url' },
    ],
    defaultContent: {
      eyebrow: 'New season',
      title: 'Premium products for modern living',
      subtitle: 'Discover quality products with fast delivery and unbeatable prices.',
      image: '',
      primaryCtaLabel: 'Shop Now',
      primaryCtaUrl: '/shop',
      secondaryCtaLabel: 'Explore Collection',
      secondaryCtaUrl: '/shop',
    },
  },
  {
    key: 'featured-products',
    label: 'Featured Products',
    category: 'commerce',
    icon: '⭐',
    description: 'Live grid of products flagged "Featured" in your catalog — auto-updates as you feature products in tenant-admin.',
    fields: [
      { key: 'title', label: 'Section title', type: 'text' },
      { key: 'subtitle', label: 'Supporting text', type: 'textarea' },
      { key: 'limit', label: 'Max products (1-12)', type: 'text' },
    ],
    defaultContent: { title: 'Featured Products', subtitle: 'Hand-picked favourites our customers love.', limit: '8' },
  },
  {
    key: 'product-grid',
    label: 'Product Grid',
    category: 'commerce',
    icon: '🧩',
    description: 'Live grid of your newest products — auto-updates as you add products in tenant-admin.',
    fields: [
      { key: 'title', label: 'Section title', type: 'text' },
      { key: 'subtitle', label: 'Supporting text', type: 'textarea' },
      { key: 'limit', label: 'Max products (1-12)', type: 'text' },
    ],
    defaultContent: { title: 'New Arrivals', subtitle: 'Fresh in this week.', limit: '8' },
  },
  {
    key: 'category-grid',
    label: 'Category Grid',
    category: 'commerce',
    icon: '🗂️',
    description: 'Live tiles of your store categories — auto-updates as you manage categories in tenant-admin.',
    fields: [
      { key: 'title', label: 'Section title', type: 'text' },
      { key: 'subtitle', label: 'Supporting text', type: 'textarea' },
    ],
    defaultContent: { title: 'Shop by Category', subtitle: 'Browse our collections' },
  },
  {
    key: 'trust-badges',
    label: 'Trust Badges',
    category: 'commerce',
    icon: '🛡️',
    description: 'Reassurance row — free shipping, secure payments, easy returns, support — to lift conversion.',
    fields: [
      { key: 'title', label: 'Section title (optional)', type: 'text' },
      {
        key: 'items', label: 'Badges', type: 'list',
        itemFields: [
          { key: 'icon', label: 'Emoji icon', type: 'text' },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
        ],
      },
    ],
    defaultContent: {
      title: '',
      items: [
        { icon: '🚚', title: 'Free Shipping', description: 'Fast delivery on all orders.' },
        { icon: '🔒', title: 'Secure Payment', description: '100% protected checkout.' },
        { icon: '↩️', title: 'Easy Returns', description: '30-day return policy.' },
        { icon: '💬', title: '24/7 Support', description: 'Dedicated customer support.' },
      ],
    },
  },
];

export function getComponentDef(key: string): ComponentDef | undefined {
  return COMPONENT_LIBRARY.find((c) => c.key === key);
}

/**
 * Best-effort mapping from a WebsiteTemplate's `sections: string[]` keyword
 * (e.g. "trainers", "fabric-gallery", "membership" — free-text per industry,
 * see packages/shared/src/themes/templates.ts) to a Component Library key.
 * Used to seed a new Page's sections from the tenant's chosen template
 * instead of leaving them to start completely blank — the template's
 * "journey" was previously just descriptive metadata with no way to turn it
 * into actual editable content. `null` means "skip" (e.g. "footer" isn't a
 * page-section concept in this system — handled by site-wide layout).
 */
export function mapTemplateSectionToComponent(sectionKeyword: string): string | null {
  const key = sectionKeyword.toLowerCase();
  if (key === 'footer') return null;
  if (key === 'hero') return 'hero';
  // Ecommerce storefront sections — previously fell through to 'richtext'.
  if (key === 'categories') return 'category-grid';
  if (key === 'products' || key === 'featured') return 'featured-products';
  if (key === 'new-arrivals' || key === 'arrivals') return 'product-grid';
  if (key === 'offers') return 'cta';
  if (key.includes('testimonial')) return 'testimonials';
  if (key.includes('pricing') || key.includes('membership') || key.includes('plans')) return 'pricing';
  if (key === 'faq') return 'faq';
  if (key.includes('gallery')) return 'gallery';
  if (key === 'contact' || key.includes('emergency')) return 'contact';
  if (key === 'newsletter') return 'newsletter';
  if (key === 'cta' || key.includes('offer')) return 'cta';
  if (['trainers', 'stylists', 'doctors', 'teachers', 'faculty', 'team', 'chef-story'].some((k) => key.includes(k))) return 'team';
  // Everything else (about/services/stats/process/benefits/booking/etc.) —
  // no dedicated component fits, so land it as an editable Rich Text block
  // rather than silently dropping the section.
  return 'richtext';
}
