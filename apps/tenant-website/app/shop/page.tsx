import Link from 'next/link';
import { headers } from 'next/headers';
import { getCategories, getProducts, getTenantBySubdomain } from '@/lib/api';
import { getSiteTheme } from '@/lib/site-theme';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import AddToCartButton from '@/components/AddToCartButton';

function resolveSubdomain(): string {
  const h = headers();
  return h.get('x-tenant-slug') || process.env.DEV_TENANT || 'vrfitness';
}

const PAGE_SIZE = 12;

export default async function ShopPage({
  searchParams,
}: {
  searchParams?: { q?: string; category?: string; page?: string };
}) {
  const subdomain = resolveSubdomain();
  const q = searchParams?.q?.trim() || '';
  const categoryId = searchParams?.category || '';
  const page = Math.max(1, parseInt(searchParams?.page || '1', 10) || 1);

  const [tenant, theme, categories, allProducts] = await Promise.all([
    getTenantBySubdomain(subdomain),
    getSiteTheme(subdomain),
    getCategories(subdomain),
    getProducts(subdomain, { q: q || undefined, categoryId: categoryId || undefined }),
  ]);
  const name = tenant?.name || 'Store';

  const total = allProducts.length;
  const products = allProducts.slice(0, page * PAGE_SIZE);
  const hasMore = products.length < total;

  const cardStyle = {
    backgroundColor: 'var(--site-surface)',
    border: '1px solid var(--site-border)',
    borderRadius: 'var(--site-radius)',
  } as const;

  function buildUrl(params: Record<string, string | undefined>) {
    const merged = { q, category: categoryId, page: '1', ...params };
    const qs = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => {
      if (v) qs.set(k, v);
    });
    const s = qs.toString();
    return s ? `/shop?${s}` : '/shop';
  }

  return (
    <div style={{ background: 'var(--site-bg)', color: 'var(--site-text)', minHeight: '100vh' }}>
      <SiteNav theme={theme} name={name} active="/shop" showShop />

      <section className="text-center px-4 py-14 max-w-3xl mx-auto">
        <p className="text-sm uppercase tracking-widest" style={{ color: 'var(--site-sub)' }}>Shop</p>
        <h1 className="mt-3 text-4xl font-extrabold leading-tight">{name} Store</h1>
        <p className="mt-3" style={{ color: 'var(--site-sub)' }}>
          Browse our full catalog — {total} product{total === 1 ? '' : 's'} available.
        </p>
      </section>

      <section className="px-4 pb-6 max-w-6xl mx-auto">
        <form action="/shop" method="get" className="flex flex-col sm:flex-row gap-3">
          {categoryId && <input type="hidden" name="category" value={categoryId} />}
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search products…"
            className="flex-1 rounded-md site-input px-4 py-2.5"
          />
          <button
            type="submit"
            className="px-6 py-2.5 font-semibold"
            style={{ background: 'var(--site-primary)', color: 'var(--site-on-primary)', borderRadius: 'var(--site-radius)' }}
          >
            Search
          </button>
        </form>

        {categories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={buildUrl({ category: undefined })}
              className="px-3 py-1.5 text-sm rounded-full border"
              style={
                !categoryId
                  ? { background: 'var(--site-primary)', color: 'var(--site-on-primary)', borderColor: 'var(--site-primary)' }
                  : { borderColor: 'var(--site-border)' }
              }
            >
              All
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={buildUrl({ category: c.id })}
                className="px-3 py-1.5 text-sm rounded-full border"
                style={
                  categoryId === c.id
                    ? { background: 'var(--site-primary)', color: 'var(--site-on-primary)', borderColor: 'var(--site-primary)' }
                    : { borderColor: 'var(--site-border)' }
                }
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="px-4 pb-16 max-w-6xl mx-auto">
        {products.length === 0 ? (
          <p className="text-center py-20" style={{ color: 'var(--site-sub)' }}>
            {q || categoryId ? 'No products match your search.' : 'No products are available yet — check back soon.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((p) => {
              const image = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null;
              return (
                <div key={p.id} className="flex flex-col overflow-hidden" style={cardStyle}>
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
                    {p.category?.name && (
                      <p className="text-xs mt-1" style={{ color: 'var(--site-sub)' }}>{p.category.name}</p>
                    )}
                    <p className="mt-2 text-lg font-bold">
                      {p.sellingPrice != null ? `Rs ${Number(p.sellingPrice).toLocaleString()}` : '—'}
                    </p>
                    <div className="mt-auto pt-3">
                      <AddToCartButton product={p} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasMore && (
          <div className="mt-10 text-center">
            <Link
              href={buildUrl({ page: String(page + 1) })}
              className="inline-block px-8 py-3 font-semibold border hover:opacity-80"
              style={{ borderColor: 'var(--site-border)', borderRadius: 'var(--site-radius)' }}
            >
              Load more
            </Link>
          </div>
        )}
      </section>

      <SiteFooter theme={theme} name={name} />
    </div>
  );
}
