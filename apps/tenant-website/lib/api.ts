const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '')
const API_BASE_URL = `${API_HOST}/api`

export async function getTenantBySubdomain(subdomain: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/tenants/subdomain/${subdomain}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export interface FitnessInfo {
  id: string
  name: string
  subdomain: string | null
  tagline: string
  description: string
  logoUrl: string | null
  colorPrimary: string
  colorAccent: string
  branchCount: number
  contact: { branch: string; address?: string; city?: string; phone?: string; email?: string } | null
}

export interface FitnessPlan {
  id: string
  name: string
  description?: string | null
  type: string
  durationDays: number
  priceNpr: number
  totalWithVat: number
  includesTrainer: boolean
  includesClasses: boolean
  includesDietPlan: boolean
  includesLocker: boolean
  accessHours?: string | null
  branchAccess: string
}

/** Public landing-page info for a fitness tenant (no auth). */
export async function getFitnessInfo(subdomain: string): Promise<FitnessInfo | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/fitness/public/${subdomain}/info`, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/** Public active membership plans for a fitness tenant (no auth). */
export async function getFitnessPlans(subdomain: string): Promise<FitnessPlan[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/fitness/public/${subdomain}/plans`, { cache: 'no-store' })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

/** Register a new gym member (customer self-signup). */
export async function registerMember(data: {
  subdomain: string
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
}): Promise<{ ok: true; user: any } | { ok: false; error: string }> {
  // Resolve tenantId from subdomain first (register needs a real tenantId).
  const tenant = await getTenantBySubdomain(data.subdomain)
  if (!tenant?.id) return { ok: false, error: 'Could not resolve gym. Please try again later.' }
  try {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        tenantId: tenant.id,
        signupAs: 'MEMBER',
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: body.message || `Signup failed (${res.status})` }
    return { ok: true, user: body.user }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' }
  }
}

export interface BlogSummary {
  id: string
  title: string
  slug: string
  excerpt: string | null
  featuredImage: string | null
  publishedAt: string | null
  author: { id: string; firstName: string; lastName: string; avatarUrl: string | null }
  category: { id: string; name: string } | null
}

export interface BlogDetail extends BlogSummary {
  content: string
  metaTitle: string | null
  metaDescription: string | null
  viewCount: number
  tenant: { id: string; name: string; subdomain: string | null } | null
}

export async function getTenantBlogs(subdomain: string, params?: { page?: number; limit?: number }): Promise<{ data: BlogSummary[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
  try {
    const qs = new URLSearchParams({ subdomain })
    if (params?.page) qs.set('page', String(params.page))
    if (params?.limit) qs.set('limit', String(params.limit))
    const res = await fetch(`${API_BASE_URL}/blogs?${qs.toString()}`, { cache: 'no-store' })
    if (!res.ok) return { data: [], meta: { total: 0, page: 1, limit: params?.limit || 10, totalPages: 0 } }
    return await res.json()
  } catch {
    return { data: [], meta: { total: 0, page: 1, limit: params?.limit || 10, totalPages: 0 } }
  }
}

/** Public blog detail by slug (no auth). Slugs are globally unique, so this is
 * inherently tenant-safe — but callers should still confirm `tenant.subdomain`
 * matches the current site before rendering, in case of a stale/foreign link. */
export async function getBlogBySlug(slug: string): Promise<BlogDetail | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/blogs/${slug}`, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function getTenantServices(subdomain: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/salon/services?subdomain=${subdomain}`)
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export async function submitContactForm(subdomain: string, data: {
  name: string
  email: string
  phone?: string
  message: string
  subject?: string
}) {
  const res = await fetch(`${API_BASE_URL}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, subdomain }),
  })
  if (!res.ok) throw new Error('Failed to submit')
  return await res.json()
}

// ---------------------------------------------------------------------
// Ecommerce — auth token (same localStorage mechanism as apps/tenant-app's
// lib/api.ts: a customer logs in via /auth/login and the JWT is reused for
// cart/checkout calls, which require JwtAuthGuard).
// ---------------------------------------------------------------------
const TOKEN_KEY = 'dexo_token'
export const getToken = (): string | null => (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null)
export const setToken = (t: string) => { if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, t) }
export const clearToken = () => { if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY) }

/** Log an existing customer in (used at checkout to merge the guest cart + place the order). */
export async function loginCustomer(subdomain: string, email: string, password: string): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, subdomain }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: body.message || `Login failed (${res.status})` }
    if (!body.accessToken) return { ok: false, error: 'No access token returned' }
    setToken(body.accessToken)
    return { ok: true, token: body.accessToken }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' }
  }
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ---------------------------------------------------------------------
// Ecommerce — public storefront browsing (no auth)
// ---------------------------------------------------------------------
export interface ProductCategory {
  id: string
  name: string
  slug: string
  parentId: string | null
}

export interface ProductVariant {
  id: string
  sku: string
  attributes: any
  priceOverride: number | null
  barcode: string | null
}

export interface Product {
  id: string
  sku: string
  name: string
  slug: string
  description: string | null
  images: string[] | null
  sellingPrice: number
  taxRatePercent: number
  isFeatured: boolean
  category?: ProductCategory | null
  brand?: { id: string; name: string; logoUrl: string | null } | null
  variants: ProductVariant[]
}

/** Public category list for the storefront (no auth). */
export async function getCategories(subdomain: string): Promise<ProductCategory[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/ecommerce/public/${subdomain}/categories`, { cache: 'no-store' })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

/** Public product listing for the storefront (no auth). */
export async function getProducts(subdomain: string, params?: { categoryId?: string; brandId?: string; q?: string; featured?: boolean }): Promise<Product[]> {
  try {
    const qs = new URLSearchParams()
    if (params?.categoryId) qs.set('categoryId', params.categoryId)
    if (params?.brandId) qs.set('brandId', params.brandId)
    if (params?.q) qs.set('q', params.q)
    if (params?.featured) qs.set('featured', 'true')
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    const res = await fetch(`${API_BASE_URL}/ecommerce/public/${subdomain}/products${suffix}`, { cache: 'no-store' })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

/** Public product detail by slug (no auth). */
export async function getProductBySlug(subdomain: string, slug: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/ecommerce/public/${subdomain}/products/${slug}`, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------
// Ecommerce — cart, checkout & orders (require a logged-in customer JWT).
// Guests build their cart client-side (see lib/guestCart.ts) and only need
// to authenticate at the checkout step, where the guest cart is replayed
// into the backend cart via addToCart() before calling checkout().
// ---------------------------------------------------------------------
export interface CartItemDto {
  id: string
  productId: string
  variantId: string | null
  quantity: number
  unitPrice: number
  product: Product
  variant: ProductVariant | null
}

export interface CartDto {
  id: string
  status: string
  currency: string
  items: CartItemDto[]
}

export async function getCart(): Promise<CartDto | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/ecommerce/cart`, { headers: { ...authHeaders() }, cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function addToCart(dto: { productId: string; variantId?: string; quantity: number }): Promise<{ ok: true; cart: CartDto } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/ecommerce/cart/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(dto),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: body.message || `HTTP ${res.status}` }
    return { ok: true, cart: body }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' }
  }
}

export async function updateCartItem(itemId: string, quantity: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/ecommerce/cart/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ quantity }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { ok: false, error: body.message || `HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' }
  }
}

export async function removeCartItem(itemId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/ecommerce/cart/items/${itemId}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { ok: false, error: body.message || `HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' }
  }
}

export interface CheckoutDto {
  shippingAddress?: Record<string, any>
  couponCode?: string
  paymentMethod?: 'COD' | 'PREPAID'
  customerEmail?: string
  customerPhone?: string
  customerName?: string
}

export async function checkout(dto: CheckoutDto): Promise<{ ok: true; order: any } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/ecommerce/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(dto),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: body.message || `HTTP ${res.status}` }
    return { ok: true, order: body }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' }
  }
}

export async function getMyOrders(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/ecommerce/orders?mine=true`, { headers: { ...authHeaders() }, cache: 'no-store' })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export async function getOrder(orderId: string): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/ecommerce/orders/${orderId}`, { headers: { ...authHeaders() }, cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------
// Payment gateway — real provider wiring for PREPAID checkout.
// ---------------------------------------------------------------------

/** Provider types actually implemented by the backend (payment-gateway/providers).
 * Khalti has no provider class yet, so it's intentionally excluded here. */
const IMPLEMENTED_PROVIDER_TYPES = ['ESEWA', 'FONEPAY', 'CONNECTIPS', 'STRIPE', 'PAYPAL']

/** All provider types the backend knows how to run, filtered to ones with a real implementation. */
export async function getAvailableProviders(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/payment-gateway/providers`, { cache: 'no-store' })
    if (!res.ok) return []
    const body = await res.json()
    const providers: string[] = body?.providers || []
    return providers.filter((p) => IMPLEMENTED_PROVIDER_TYPES.includes(p))
  } catch {
    return []
  }
}

export interface TenantPaymentProvider {
  type: string
  name: string
  isDefault: boolean
}

/** Public (no-auth) list of a tenant's ACTIVE payment providers — used to decide
 * whether to offer "Pay now" at checkout and which provider to default to. */
export async function getTenantAvailableProviders(tenantId: string): Promise<TenantPaymentProvider[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/payment-gateway/tenant/${tenantId}/available`, { cache: 'no-store' })
    if (!res.ok) return []
    const providers: TenantPaymentProvider[] = await res.json()
    return providers.filter((p) => IMPLEMENTED_PROVIDER_TYPES.includes(p.type))
  } catch {
    return []
  }
}

export interface PaymentInitResult {
  paymentUrl?: string
  paymentToken?: string
  paymentMethod?: string
  providerTxnId?: string
  formData?: Record<string, string>
  qrCodeUrl?: string
}

/** Initializes a payment with the tenant's configured provider. successUrl/failureUrl/cancelUrl
 * should point at /checkout/callback with orderId + providerType + amount in the query string,
 * since eSewa/Fonepay/ConnectIPS verification is keyed off our own orderId+amount (not gateway
 * echo params), while Stripe/PayPal echo their own session_id/token params on return. */
export async function initPayment(dto: {
  providerType: string
  orderId: string
  amount: number
  successUrl: string
  failureUrl: string
  cancelUrl?: string
}): Promise<{ ok: true; data: PaymentInitResult } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/payment-gateway/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        providerType: dto.providerType,
        orderId: dto.orderId,
        amount: dto.amount,
        currency: 'NPR',
        successUrl: dto.successUrl,
        failureUrl: dto.failureUrl,
        cancelUrl: dto.cancelUrl,
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: body.message || `HTTP ${res.status}` }
    return { ok: true, data: body }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' }
  }
}

export interface PaymentVerifyResult {
  success: boolean
  providerTxnId: string
  status: 'COMPLETED' | 'FAILED' | 'PENDING' | 'CANCELLED' | 'AMBIGUOUS'
  amount?: number
  message?: string
}

/** Verifies a payment after the gateway redirects back to /checkout/callback. */
export async function verifyPayment(dto: {
  providerType: string
  providerTxnId: string
  orderId: string
  amount?: number
  rawParams?: Record<string, any>
}): Promise<{ ok: true; data: PaymentVerifyResult } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/payment-gateway/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(dto),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: body.message || `HTTP ${res.status}` }
    return { ok: true, data: body }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' }
  }
}

/** Finalizes a PREPAID order after a successful gateway verification — marks the
 * order + invoice paid on the backend. */
export async function confirmPayment(orderId: string, dto: {
  providerType: string
  providerTxnId: string
  amount?: number
  rawParams?: Record<string, any>
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/ecommerce/orders/${orderId}/confirm-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(dto),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { ok: false, error: body.message || `HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' }
  }
}
