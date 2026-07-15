import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getProductBySlug, getProducts, getTenantBySubdomain, getSiteNav } from '@/lib/api';
import { getSiteTheme } from '@/lib/site-theme';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import ProductCard from '@/components/ecommerce/ProductCard';
import ProductDetail from './ProductDetail';

function resolveSubdomain(): string {
  const h = headers();
  return h.get('x-tenant-slug') || '';
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const subdomain = resolveSubdomain();
  const [tenant, theme, product, navItems] = await Promise.all([
    getTenantBySubdomain(subdomain),
    getSiteTheme(subdomain),
    getProductBySlug(subdomain, params.slug),
    getSiteNav(subdomain),
  ]);

  if (!product) notFound();

  const name = tenant?.name || 'Store';
  const related = product.category?.id
    ? (await getProducts(subdomain, { categoryId: product.category.id })).filter((p) => p.id !== product.id).slice(0, 4)
    : [];

  // Product structured data (schema.org) for rich search results — the user's
  // spec asked for Product Schema. Built server-side from the fetched product.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: Array.isArray(product.images) ? product.images : [],
    description: product.description || product.metaDescription || undefined,
    sku: product.sku,
    brand: product.brand?.name ? { '@type': 'Brand', name: product.brand.name } : undefined,
    category: product.category?.name || undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'NPR',
      price: Number(product.sellingPrice),
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <div style={{ background: 'var(--site-bg)', color: 'var(--site-text)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav theme={theme} name={name} active="/shop" showShop navItems={navItems} />

      <section className="px-4 py-4 max-w-6xl mx-auto text-sm" style={{ color: 'var(--site-sub)' }}>
        <Link href="/shop" className="hover:underline">Shop</Link>
        {product.category?.name && <> / <span>{product.category.name}</span></>}
        {' '}/ <span>{product.name}</span>
      </section>

      <ProductDetail product={product} />

      {related.length > 0 && (
        <section className="px-4 py-14 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">You may also like</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {related.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      <SiteFooter theme={theme} name={name} />
    </div>
  );
}
