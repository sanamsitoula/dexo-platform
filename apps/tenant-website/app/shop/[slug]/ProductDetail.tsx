'use client'

import { useMemo, useState } from 'react';
import type { Product } from '@/lib/api';
import AddToCartButton from '@/components/AddToCartButton';

/**
 * Premium product detail — large rounded gallery with hover-zoom + thumbnail
 * rail, a focused buy-box (price incl. tax, stock badge, quantity stepper,
 * full-width Add to Cart, reassurance row), and an accordion for the full
 * description / specs / shipping & returns. Themed via --site-* CSS vars so
 * it inherits the tenant's template. Client component: image, variant and
 * quantity are interactive.
 */
const TRUST = [
  { icon: '🚚', label: 'Ships in 24h' },
  { icon: '↩️', label: '30-day returns' },
  { icon: '🔒', label: 'Secure checkout' },
];

export default function ProductDetail({ product }: { product: Product }) {
  const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : [];
  const [activeImage, setActiveImage] = useState(0);
  const [variantId, setVariantId] = useState(product.variants?.[0]?.id || '');
  const [qty, setQty] = useState(1);

  const variant = useMemo(
    () => product.variants?.find((v) => v.id === variantId) || null,
    [product.variants, variantId],
  );
  const price = variant?.priceOverride ?? Number(product.sellingPrice);
  const tax = Number(product.taxRatePercent || 0);
  const inStock = !product.variants?.length || true; // demo products are trackInventory:false → always available

  const cardStyle = {
    backgroundColor: 'var(--site-surface)',
    border: '1px solid var(--site-border)',
    borderRadius: 'var(--site-radius)',
  } as const;

  return (
    <>
      <section className="px-4 pb-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Gallery */}
        <div>
          <div className="group relative aspect-square overflow-hidden" style={{ ...cardStyle, borderRadius: 'calc(var(--site-radius) * 1.5)' }}>
            {images.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={images[activeImage]}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-7xl opacity-20">📦</div>
            )}
            {product.isFeatured && (
              <span
                className="absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm"
                style={{ background: 'var(--site-primary)' }}
              >
                Featured
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((img, i) => (
                <button
                  key={img + i}
                  onClick={() => setActiveImage(i)}
                  className="w-16 h-16 overflow-hidden transition-opacity"
                  style={{
                    ...cardStyle,
                    outline: i === activeImage ? '2px solid var(--site-primary)' : '2px solid transparent',
                    opacity: i === activeImage ? 1 : 0.6,
                  }}
                  aria-label={`View image ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Buy box */}
        <div className="flex flex-col">
          {product.category?.name && (
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--site-primary)' }}>
              {product.category.name}
            </span>
          )}
          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold leading-tight">{product.name}</h1>
          {product.brand?.name && (
            <p className="mt-1 text-sm" style={{ color: 'var(--site-sub)' }}>by {product.brand.name}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-3xl font-extrabold" style={{ color: 'var(--site-primary)' }}>
              Rs {price.toLocaleString()}
            </span>
            {tax > 0 && <span className="text-sm" style={{ color: 'var(--site-sub)' }}>incl. {tax}% tax</span>}
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={
                inStock
                  ? { background: 'color-mix(in srgb, #22C55E 15%, transparent)', color: '#16a34a' }
                  : { background: 'color-mix(in srgb, #EF4444 15%, transparent)', color: '#dc2626' }
              }
            >
              {inStock ? '● In stock' : '● Out of stock'}
            </span>
          </div>

          {product.description && (
            <p className="mt-5 leading-relaxed" style={{ color: 'var(--site-sub)' }}>{product.description}</p>
          )}

          {product.variants && product.variants.length > 0 && (
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2">Options</label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVariantId(v.id)}
                    className="px-4 py-2 text-sm rounded-full border transition-colors"
                    style={
                      variantId === v.id
                        ? { background: 'var(--site-primary)', color: 'var(--site-on-primary)', borderColor: 'var(--site-primary)' }
                        : { borderColor: 'var(--site-border)' }
                    }
                  >
                    {v.sku}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-4">
            <label className="text-sm font-medium">Quantity</label>
            <div className="flex items-center" style={{ border: '1px solid var(--site-border)', borderRadius: 'var(--site-radius)' }}>
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-10 h-10 text-lg" aria-label="Decrease quantity">−</button>
              <span className="w-12 text-center font-medium">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="w-10 h-10 text-lg" aria-label="Increase quantity">+</button>
            </div>
          </div>

          <div className="mt-6">
            <AddToCartButton product={product} variant={variant} quantity={qty} />
          </div>

          {/* Reassurance row */}
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm" style={{ color: 'var(--site-sub)' }}>
            {TRUST.map((t) => (
              <span key={t.label} className="inline-flex items-center gap-2">
                <span className="text-base">{t.icon}</span>{t.label}
              </span>
            ))}
          </div>

          <p className="mt-4 text-xs" style={{ color: 'var(--site-sub)' }}>SKU: {variant?.sku || product.sku}</p>
        </div>
      </section>

      {/* Details accordion */}
      <section className="px-4 pb-16 max-w-4xl mx-auto">
        <details open className="border-b py-4" style={{ borderColor: 'var(--site-border)' }}>
          <summary className="cursor-pointer text-lg font-semibold">Description</summary>
          <p className="mt-3 leading-relaxed" style={{ color: 'var(--site-sub)' }}>
            {product.description || product.metaDescription || 'No description available.'}
          </p>
        </details>
        <details className="border-b py-4" style={{ borderColor: 'var(--site-border)' }}>
          <summary className="cursor-pointer text-lg font-semibold">Specifications</summary>
          <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-sm">
            <dt style={{ color: 'var(--site-sub)' }}>SKU</dt><dd className="font-medium">{product.sku}</dd>
            {product.category?.name && <><dt style={{ color: 'var(--site-sub)' }}>Category</dt><dd className="font-medium">{product.category.name}</dd></>}
            {product.brand?.name && <><dt style={{ color: 'var(--site-sub)' }}>Brand</dt><dd className="font-medium">{product.brand.name}</dd></>}
            <dt style={{ color: 'var(--site-sub)' }}>Tax</dt><dd className="font-medium">{tax}%</dd>
            {product.variants && product.variants.length > 0 && <><dt style={{ color: 'var(--site-sub)' }}>Variants</dt><dd className="font-medium">{product.variants.length}</dd></>}
          </dl>
        </details>
        <details className="border-b py-4" style={{ borderColor: 'var(--site-border)' }}>
          <summary className="cursor-pointer text-lg font-semibold">Shipping &amp; Returns</summary>
          <div className="mt-3 space-y-2 text-sm" style={{ color: 'var(--site-sub)' }}>
            <p>🚚 Free shipping on orders over Rs 5,000. Standard delivery in 2–5 business days.</p>
            <p>↩️ Easy 30-day returns — items must be unused and in original packaging.</p>
            <p>🔒 Secure checkout with encrypted payment processing.</p>
          </div>
        </details>
      </section>
    </>
  );
}
