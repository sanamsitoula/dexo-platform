'use client'

/**
 * Guest shopping cart — client-only, localStorage-backed.
 *
 * The backend cart (`/ecommerce/cart*`) requires a logged-in customer JWT
 * (see EcommerceController — cart is always scoped to `req.user`, there is
 * no wired-up guest `sessionId` path even though `Cart.sessionId` exists in
 * the schema). So shoppers build their cart here, without needing an
 * account, and it's only replayed into the real backend cart (one
 * `addToCart()` call per line) at the checkout step, once they've logged in.
 */

export interface GuestCartItem {
  productId: string
  variantId?: string
  quantity: number
  name: string
  slug: string
  image: string | null
  unitPrice: number
  taxRatePercent: number
}

const KEY_PREFIX = 'dexo_guest_cart_'
export const CART_EVENT = 'dexo-guest-cart-changed'

function key(subdomain: string) {
  return `${KEY_PREFIX}${subdomain}`
}

function read(subdomain: string): GuestCartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(key(subdomain))
    return raw ? (JSON.parse(raw) as GuestCartItem[]) : []
  } catch {
    return []
  }
}

function write(subdomain: string, items: GuestCartItem[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key(subdomain), JSON.stringify(items))
  window.dispatchEvent(new Event(CART_EVENT))
}

export function getGuestCart(subdomain: string): GuestCartItem[] {
  return read(subdomain)
}

export function getGuestCartCount(subdomain: string): number {
  return read(subdomain).reduce((sum, i) => sum + i.quantity, 0)
}

export function addGuestCartItem(subdomain: string, item: Omit<GuestCartItem, 'quantity'>, quantity: number) {
  const items = read(subdomain)
  const existing = items.find((i) => i.productId === item.productId && i.variantId === item.variantId)
  if (existing) {
    existing.quantity += quantity
  } else {
    items.push({ ...item, quantity })
  }
  write(subdomain, items)
}

export function updateGuestCartItem(subdomain: string, productId: string, variantId: string | undefined, quantity: number) {
  let items = read(subdomain)
  if (quantity < 1) {
    items = items.filter((i) => !(i.productId === productId && i.variantId === variantId))
  } else {
    const item = items.find((i) => i.productId === productId && i.variantId === variantId)
    if (item) item.quantity = quantity
  }
  write(subdomain, items)
}

export function removeGuestCartItem(subdomain: string, productId: string, variantId: string | undefined) {
  const items = read(subdomain).filter((i) => !(i.productId === productId && i.variantId === variantId))
  write(subdomain, items)
}

export function clearGuestCart(subdomain: string) {
  write(subdomain, [])
}

export function guestCartTotals(items: GuestCartItem[]) {
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const tax = items.reduce((s, i) => s + (i.unitPrice * i.quantity * (i.taxRatePercent || 0)) / 100, 0)
  return { subtotal, tax, total: subtotal + tax }
}
