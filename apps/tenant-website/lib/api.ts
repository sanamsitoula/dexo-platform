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
