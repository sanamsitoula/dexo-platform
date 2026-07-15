import { getProducts } from '@/lib/api';
import ProductCard from './ProductCard';

function parseLimit(v: any, fallback = 8) {
  const n = parseInt(String(v || fallback), 10);
  return Number.isFinite(n) ? Math.min(12, Math.max(1, n)) : fallback;
}

/** Live grid of the tenant's featured products — auto-updates from the catalog. */
export default async function FeaturedProducts({ subdomain, content }: { subdomain: string; content: any }) {
  const limit = parseLimit(content?.limit);
  const products = (await getProducts(subdomain, { featured: true })).slice(0, limit);
  if (products.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-10 text-center">
        {content?.title && <h2 className="text-3xl font-bold sm:text-4xl">{content.title}</h2>}
        {content?.subtitle && <p className="mt-3 opacity-70">{content.subtitle}</p>}
      </div>
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}

/** Live grid of the tenant's newest products — auto-updates from the catalog. */
export async function ProductGridSection({ subdomain, content }: { subdomain: string; content: any }) {
  const limit = parseLimit(content?.limit);
  const products = (await getProducts(subdomain)).slice(0, limit);
  if (products.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-10 text-center">
        {content?.title && <h2 className="text-3xl font-bold sm:text-4xl">{content.title}</h2>}
        {content?.subtitle && <p className="mt-3 opacity-70">{content.subtitle}</p>}
      </div>
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}
