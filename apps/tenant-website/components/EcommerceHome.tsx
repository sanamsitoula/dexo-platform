import Link from 'next/link';
import type { SiteTheme } from '@/lib/site-theme';
import type { Product, ProductCategory, PublicPageSection, SiteNavLink } from '@/lib/api';
import SiteNav from './SiteNav';
import SiteFooter from './SiteFooter';
import PageSectionRenderer from './PageSectionRenderer';
import ProductCard from './ecommerce/ProductCard';

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
  return (
    <div style={{ background: 'var(--site-bg)', color: 'var(--site-text)', minHeight: '100vh' }}>
      <SiteNav theme={theme} name={name} active="/" showShop navItems={navItems} />

      {/* Hero — premium split layout (eyebrow + headline + sub + two CTAs) */}
      <section className="overflow-hidden" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--site-primary) 8%, var(--site-bg)), var(--site-bg))' }}>
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 sm:py-24">
          <div>
            <span className="inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest" style={{ background: 'color-mix(in srgb, var(--site-primary) 15%, transparent)', color: 'var(--site-primary)' }}>
              Welcome to {name}
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              {tagline || 'Premium products for modern living'}
            </h1>
            <p className="mt-4 text-lg opacity-70">
              Discover quality products with fast delivery, secure checkout, and unbeatable prices.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="inline-block rounded-full px-7 py-3 font-semibold transition-transform hover:-translate-y-0.5"
                style={{ background: 'var(--site-primary)', color: 'var(--site-on-primary, #fff)' }}
              >
                Shop Now
              </Link>
              <Link
                href="/shop"
                className="inline-block rounded-full border px-7 py-3 font-semibold transition-colors hover:opacity-70"
                style={{ borderColor: 'var(--site-border)', color: 'var(--site-text)' }}
              >
                Explore Collection
              </Link>
            </div>
          </div>
          {featured[0] && Array.isArray(featured[0].images) && featured[0].images[0] && (
            <Link href={`/shop/${featured[0].slug}`} className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-xl" style={{ border: '1px solid var(--site-border)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={featured[0].images[0]} alt={featured[0].name} className="h-full w-full object-cover" />
            </Link>
          )}
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

      {/* Category grid — premium gradient tiles */}
      {categories.filter((c) => c.slug !== 'uncategorized').length > 0 && (
        <section className="px-4 pb-16 max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">Shop by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.filter((c) => c.slug !== 'uncategorized').slice(0, 8).map((c) => (
              <Link
                key={c.id}
                href={`/shop?category=${c.id}`}
                className="group relative aspect-[4/3] flex items-end overflow-hidden p-5 font-semibold transition-transform duration-300 hover:-translate-y-1"
                style={{
                  borderRadius: 'var(--site-radius)',
                  background: 'linear-gradient(135deg, var(--site-primary), var(--site-accent, var(--site-primary)))',
                  color: 'var(--site-on-primary, #fff)',
                }}
              >
                <span className="pointer-events-none absolute right-3 top-2 text-5xl font-black opacity-20 transition-transform duration-500 group-hover:scale-125">
                  {(c.name || '?').charAt(0).toUpperCase()}
                </span>
                <span className="relative text-lg">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured products */}
      {featured.length > 0 && (
        <section className="px-4 pb-16 max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">Featured Products</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
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
          className="mt-6 inline-block rounded-full px-8 py-3 font-semibold transition-transform hover:-translate-y-0.5"
          style={{ background: 'rgba(0,0,0,0.25)', color: 'var(--site-on-primary, #fff)' }}
        >
          View All Products
        </Link>
      </section>

      {/* New arrivals */}
      {latest.length > 0 && (
        <section className="px-4 py-16 max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">New Arrivals</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {latest.slice(0, 8).map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      {/* Trust badges */}
      <section className="px-4 pb-16 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[
            { icon: '🚚', title: 'Free Shipping', desc: 'Fast delivery on all orders.' },
            { icon: '🔒', title: 'Secure Payment', desc: '100% protected checkout.' },
            { icon: '↩️', title: 'Easy Returns', desc: '30-day return policy.' },
            { icon: '💬', title: '24/7 Support', desc: 'Dedicated customer support.' },
          ].map((b) => (
            <div key={b.title} className="flex flex-col items-center rounded-2xl px-4 py-6 text-center" style={{ backgroundColor: 'var(--site-surface)', border: '1px solid var(--site-border)', borderRadius: 'var(--site-radius)' }}>
              <span className="mb-3 text-4xl">{b.icon}</span>
              <h3 className="font-semibold">{b.title}</h3>
              <p className="mt-1 text-sm opacity-70">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter theme={theme} name={name} />
    </div>
  );
}
