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

export async function getTenantBlogs(subdomain: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/blogs?subdomain=${subdomain}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.data || []
  } catch {
    return []
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
