import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getProductBySlug, getProducts, getTenantBySubdomain } from '@/lib/api';
import { getSiteTheme } from '@/lib/site-theme';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import ProductDetail from './ProductDetail';

function resolveSubdomain(): string {
  const h = headers();
  return h.get('x-tenant-slug') || process.env.DEV_TENANT || 'vrfitness';
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const subdomain = resolveSubdomain();
  const [tenant, theme, product] = await Promise.all([
    getTenantBySubdomain(subdomain),
    getSiteTheme(subdomain),
    getProductBySlug(subdomain, params.slug),
  ]);

  if (!product) notFound();

  const name = tenant?.name || 'Store';
  const related = product.category?.id
    ? (await getProducts(subdomain, { categoryId: product.category.id })).filter((p) => p.id !== product.id).slice(0, 4)
    : [];

  return (
    <div style={{ background: 'var(--site-bg)', color: 'var(--site-text)', minHeight: '100vh' }}>
      <SiteNav theme={theme} name={name} active="/shop" showShop />

      <section className="px-4 py-4 max-w-6xl mx-auto text-sm" style={{ color: 'var(--site-sub)' }}>
        <Link href="/shop" className="hover:underline">Shop</Link>
        {product.category?.name && <> / <span>{product.category.name}</span></>}
        {' '}/ <span>{product.name}</span>
      </section>

      <ProductDetail product={product} />

      {related.length > 0 && (
        <section className="px-4 py-14 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">You may also like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((p) => {
              const image = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null;
              return (
                <Link
                  key={p.id}
                  href={`/shop/${p.slug}`}
                  className="block overflow-hidden hover:opacity-90"
                  style={{ backgroundColor: 'var(--site-surface)', border: '1px solid var(--site-border)', borderRadius: 'var(--site-radius)' }}
                >
                  <div className="aspect-square" style={{ background: 'var(--site-bg)' }}>
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl opacity-30">📦</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold line-clamp-2">{p.name}</p>
                    <p className="mt-1 font-bold">Rs {Number(p.sellingPrice).toLocaleString()}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <SiteFooter theme={theme} name={name} />
    </div>
  );
}
