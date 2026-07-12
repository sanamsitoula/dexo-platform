'use client'

import { useState } from 'react'
import { resolveClientSubdomain } from '@/lib/subdomain'
import { addGuestCartItem } from '@/lib/guestCart'
import type { Product, ProductVariant } from '@/lib/api'

interface Props {
  product: Pick<Product, 'id' | 'name' | 'slug' | 'images' | 'sellingPrice' | 'taxRatePercent'>
  variant?: ProductVariant | null
  quantity?: number
  className?: string
}

/** Adds a product to the guest cart (localStorage) — see lib/guestCart.ts for
 * why the shopper doesn't need to be logged in yet. */
export default function AddToCartButton({ product, variant, quantity = 1, className }: Props) {
  const [added, setAdded] = useState(false)

  function handleAdd() {
    const subdomain = resolveClientSubdomain()
    const image = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null
    addGuestCartItem(
      subdomain,
      {
        productId: product.id,
        variantId: variant?.id,
        name: product.name,
        slug: product.slug,
        image,
        unitPrice: variant?.priceOverride ?? Number(product.sellingPrice),
        taxRatePercent: Number(product.taxRatePercent || 0),
      },
      quantity,
    )
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      className={className || 'w-full px-4 py-2.5 font-semibold transition-opacity hover:opacity-90'}
      style={{ background: 'var(--site-primary)', color: 'var(--site-on-primary)', borderRadius: 'var(--site-radius)' }}
    >
      {added ? 'Added ✓' : 'Add to cart'}
    </button>
  )
}
