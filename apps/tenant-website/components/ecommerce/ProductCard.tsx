import Link from 'next/link';
import type { Product } from '@/lib/api';
import AddToCartButton from '../AddToCartButton';

/**
 * Premium, reusable product card — the single source of truth used by the
 * storefront home, the pluggable Featured/New-Arrival sections, and the shop
 * listing. Themed via the tenant's `--site-*` CSS variables so it inherits
 * whichever of the 60 templates the tenant picked. Effects: image zoom on
 * hover, card lift, Featured badge, lazy-loaded image.
 */
export default function ProductCard({ p }: { p: Product }) {
  const image = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null;
  const price = p.sellingPrice != null ? `Rs ${Number(p.sellingPrice).toLocaleString()}` : '—';
  return (
    <div
      className="group flex flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1"
      style={{
        backgroundColor: 'var(--site-surface)',
        border: '1px solid var(--site-border)',
        borderRadius: 'var(--site-radius)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      <Link href={`/shop/${p.slug}`} className="relative block aspect-square overflow-hidden" style={{ background: 'var(--site-bg)' }}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={p.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl opacity-25">📦</div>
        )}
        {p.isFeatured && (
          <span
            className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white shadow-sm"
            style={{ background: 'var(--site-primary)' }}
          >
            Featured
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link href={`/shop/${p.slug}`} className="line-clamp-2 font-semibold transition-colors hover:opacity-70">
          {p.name}
        </Link>
        {p.category?.name && (
          <span className="mt-1 text-xs uppercase tracking-wide opacity-50">{p.category.name}</span>
        )}
        <p className="mt-2 text-lg font-extrabold" style={{ color: 'var(--site-primary)' }}>
          {price}
        </p>
        <div className="mt-auto pt-3">
          <AddToCartButton product={p} />
        </div>
      </div>
    </div>
  );
}
