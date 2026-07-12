'use client'

import { useMemo, useState } from 'react';
import type { Product } from '@/lib/api';
import AddToCartButton from '@/components/AddToCartButton';

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

  const cardStyle = {
    backgroundColor: 'var(--site-surface)',
    border: '1px solid var(--site-border)',
    borderRadius: 'var(--site-radius)',
  } as const;

  return (
    <section className="px-4 pb-14 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
      <div>
        <div className="aspect-square overflow-hidden" style={cardStyle}>
          {images.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[activeImage]} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl opacity-30">📦</div>
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex gap-2">
            {images.map((img, i) => (
              <button
                key={img + i}
                onClick={() => setActiveImage(i)}
                className="w-16 h-16 overflow-hidden"
                style={{ ...cardStyle, outline: i === activeImage ? '2px solid var(--site-primary)' : undefined }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h1 className="text-3xl font-extrabold">{product.name}</h1>
        {product.brand?.name && <p className="mt-1 text-sm" style={{ color: 'var(--site-sub)' }}>by {product.brand.name}</p>}

        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-bold">Rs {price.toLocaleString()}</span>
          {tax > 0 && <span className="text-sm" style={{ color: 'var(--site-sub)' }}>+{tax}% tax</span>}
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
                  className="px-3 py-1.5 text-sm rounded-full border"
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
          <div className="flex items-center border" style={{ borderColor: 'var(--site-border)', borderRadius: 'var(--site-radius)' }}>
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-9 h-9" aria-label="Decrease quantity">−</button>
            <span className="w-10 text-center">{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} className="w-9 h-9" aria-label="Increase quantity">+</button>
          </div>
        </div>

        <div className="mt-6 max-w-xs">
          <AddToCartButton product={product} variant={variant} quantity={qty} />
        </div>

        <p className="mt-4 text-xs" style={{ color: 'var(--site-sub)' }}>SKU: {variant?.sku || product.sku}</p>
      </div>
    </section>
  );
}
