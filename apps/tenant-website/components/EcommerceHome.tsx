import Link from 'next/link';
import type { SiteTheme } from '@/lib/site-theme';
import type { Product, ProductCategory, PublicPageSection, SiteNavLink } from '@/lib/api';
import SiteNav from './SiteNav';
import SiteFooter from './SiteFooter';
import AddToCartButton from './AddToCartButton';
import PageSectionRenderer from './PageSectionRenderer';
import ProductCard from './ecommerce/ProductCard';
import { ctaButtonClasses, ctaButtonStyle } from '@/lib/style-tokens';

/**
 * Ecommerce storefront homepage — hero, category grid, featured products,
 * promo banner, new arrivals. Layout modeled on reference storefronts
 * (hero banner + category tiles + product grid + promo strip + footer),
 * themed via the tenant's site-theme CSS variables so it matches whichever
 * of the 60 templates the tenant picked.
 */
export default function EcommerceHome({
  theme,
  name,
  tagline,
  categories,
  featured,
  latest,
  realSections,
  subdomain,
  navItems,
}: {
  theme: SiteTheme;
  name: string;
  tagline?: string;
  navItems?: SiteNavLink[];
  categories: ProductCategory[];
  featured: Product[];
  latest: Product[];
  /** Real, tenant-editable Page Builder sections from the auto-seeded "Home"
   * page — same data/component used by the fitness/template homepage and
   * any custom /<slug> page, so ecommerce tenants get the same editable
   * content system instead of a permanently-fixed storefront layout. */
  realSections?: PublicPageSection[];
  subdomain?: string;
}) {
  // Workstream B item 4 (website_builder_remaining.md): when the tenant has
  // set a Theme Builder cardStyle token, `thick-border`/`glassmorphism`/etc.
  // override the plain 1px surface border below; unset (the common case for
  // ecommerce tenants, who don't pick one of the 60 WebsiteTemplates) keeps
  // this EXACT inline style, unchanged.
  const cardStyle = theme.cardStyle === 'thick-border'
    ? { backgroundColor: 'var(--site-surface)', border: '3px solid var(--site-border)', borderRadius: 'var(--site-radius)' }
    : theme.cardStyle === 'elevated'
      ? { backgroundColor: 'var(--site-surface)', border: 'none', borderRadius: 'var(--site-radius)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)' }
      : theme.cardStyle === 'glassmorphism'
        ? { backgroundColor: 'var(--site-surface)', border: '1px solid var(--site-border)', borderRadius: 'var(--site-radius)', backdropFilter: 'blur(6px)' }
        : { backgroundColor: 'var(--site-surface)', border: '1px solid var(--site-border)', borderRadius: 'var(--site-radius)' };

  function ProductCard({ p }: { p: Product }) {
    const image = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null;
    return (
      <div className="flex flex-col overflow-hidden" style={cardStyle}>
        <Link href={`/shop/${p.slug}`} className="block aspect-square" style={{ background: 'var(--site-bg)' }}>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={p.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">📦</div>
          )}
        </Link>
        <div className="p-4 flex flex-col flex-1">
          <Link href={`/shop/${p.slug}`} className="font-semibold hover:underline line-clamp-2">
            {p.name}
          </Link>
          <p className="mt-2 text-lg font-bold">
            {p.sellingPrice != null ? `Rs ${Number(p.sellingPrice).toLocaleString()}` : '—'}
          </p>
          <div className="mt-auto pt-3">
            <AddToCartButton product={p} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--site-bg)', color: 'var(--site-text)', minHeight: '100vh' }}>
      <SiteNav theme={theme} name={name} active="/" showShop navItems={navItems} />

      {/* Hero */}
      <section className="text-center px-4 py-20 max-w-3xl mx-auto">
        <p className="text-sm uppercase tracking-widest" style={{ color: 'var(--site-sub)' }}>Welcome to</p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold leading-tight">{name}</h1>
        {tagline && <p className="mt-4 text-lg" style={{ color: 'var(--site-sub)' }}>{tagline}</p>}
        <div className="mt-8">
          <Link
            href="/shop"
            className={`inline-block px-8 py-3 ${ctaButtonClasses(theme.ctaStyle)}`}
            style={theme.ctaStyle === 'inline-text'
              ? { color: 'var(--site-primary)' }
              : { ...ctaButtonStyle(theme.ctaStyle, 'var(--site-primary)'), color: 'var(--site-on-primary)', borderRadius: theme.ctaStyle ? undefined : 'var(--site-radius)' }}
          >
            Shop Now
          </Link>
        </div>
      </section>

      {/* Real, editable Page Builder sections (from the auto-seeded Home page) */}
      {/* Workstream B item 4 (website_builder_remaining.md): resolved
       * cardStyle/ctaStyle/iconStyle tokens threaded through, same as
       * TemplateHome.tsx. Ecommerce tenants don't currently pick one of the
       * 60 WebsiteTemplates (no `tpl`), so there's no per-family default to
       * fall back to here — `theme.cardStyle` etc. is undefined unless the
       * tenant has explicitly set one in Theme Builder, and
       * cardClasses/ctaButtonClasses/iconAccentClasses fall back to their
       * own pre-existing default classes in that case (zero behavior
       * change for ecommerce tenants who never touch these controls). */}
      {realSections?.map((section) => (
        <PageSectionRenderer key={section.id} section={section} colorPrimary="var(--site-primary)" subdomain={subdomain || ''}
          cardStyle={theme.cardStyle} ctaStyle={theme.ctaStyle} iconStyle={theme.iconStyle} />
      ))}

      {/* Category grid */}
      {categories.length > 0 && (
        <section className="px-4 pb-16 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Browse Categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.slice(0, 12).map((c) => (
              <Link
                key={c.id}
                href={`/shop?category=${c.id}`}
                className="aspect-[4/3] flex items-end p-4 font-semibold hover:opacity-90 transition-opacity"
                style={{
                  background: 'var(--site-surface)',
                  border: '1px solid var(--site-border)',
                  borderRadius: 'var(--site-radius)',
                }}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured products */}
      {featured.length > 0 && (
        <section className="px-4 pb-16 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Featured Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.slice(0, 8).map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      {/* Promo banner */}
      <section
        className="px-4 py-16 text-center"
        style={{ background: 'var(--site-primary)', color: 'var(--site-on-primary)' }}
      >
        <h2 className="text-3xl font-bold">Don&apos;t Miss Out</h2>
        <p className="mt-2 opacity-90">Browse the full catalog for the latest deals and new arrivals.</p>
        <Link
          href="/shop"
          className={`mt-6 inline-block px-8 py-3 hover:opacity-90 ${theme.ctaStyle ? ctaButtonClasses(theme.ctaStyle) : 'font-semibold bg-black/80 text-white'}`}
          style={theme.ctaStyle === 'inline-text' ? undefined : { ...(theme.ctaStyle ? ctaButtonStyle(theme.ctaStyle, '#000000') : {}), borderRadius: theme.ctaStyle ? undefined : 'var(--site-radius)' }}
        >
          View All Products
        </Link>
      </section>

      {/* New arrivals */}
      {latest.length > 0 && (
        <section className="px-4 py-16 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">New Arrivals</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {latest.slice(0, 8).map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      <SiteFooter theme={theme} name={name} />
    </div>
  );
}
