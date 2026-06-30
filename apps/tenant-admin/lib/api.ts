const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '')
const API_BASE_URL = `${API_HOST}/api`

interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

function getToken(subdomain: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(`tenant-token-${subdomain}`)
}

async function fetchApi<T>(
  endpoint: string,
  subdomain: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`
  const token = getToken(subdomain)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  }

  try {
    const response = await fetch(url, { ...options, headers })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { error: errorData.message || `HTTP ${response.status}` }
    }
    if (response.status === 204) return { data: undefined as T }
    const data = await response.json()
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' }
  }
}

export const tenantApi = {
  getBySubdomain: (subdomain: string) =>
    fetchApi<any>(`/tenants/subdomain/${subdomain}`, subdomain),

  login: async (subdomain: string, email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, subdomain }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Login failed')
    return data
  },

  getProfile: (subdomain: string) =>
    fetchApi<any>('/auth/profile', subdomain),
}

export const tenantDashboardApi = {
  getStats: (subdomain: string) =>
    fetchApi<any>(`/dashboard/tenant?tenantId=me`, subdomain),
}

export const tenantCrmApi = {
  list: (subdomain: string, params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    return fetchApi<any>(`/contact?${searchParams.toString()}`, subdomain)
  },
}

export const tenantFinanceApi = {
  getSummary: (subdomain: string) =>
    fetchApi<any>('/billing/summary', subdomain),
}

export const tenantUsersApi = {
  list: (subdomain: string) =>
    fetchApi<any>('/users/tenant', subdomain),
}

// Domain-specific APIs
export const fitnessApi = {
  listMembers: (subdomain: string) =>
    fetchApi<any[]>('/fitness/members', subdomain),
  createMember: (subdomain: string, data: any) =>
    fetchApi<any>('/fitness/members', subdomain, { method: 'POST', body: JSON.stringify(data) }),
  listTrainers: (subdomain: string) =>
    fetchApi<any[]>('/fitness/trainers', subdomain),
}

export const salonApi = {
  listAppointments: (subdomain: string) =>
    fetchApi<any[]>('/salon/appointments', subdomain),
  createAppointment: (subdomain: string, data: any) =>
    fetchApi<any>('/salon/appointments', subdomain, { method: 'POST', body: JSON.stringify(data) }),
  listServices: (subdomain: string) =>
    fetchApi<any[]>('/salon/services', subdomain),
}

export const schoolApi = {
  listStudents: (subdomain: string) =>
    fetchApi<any[]>('/school/students', subdomain),
  createStudent: (subdomain: string, data: any) =>
    fetchApi<any>('/school/students', subdomain, { method: 'POST', body: JSON.stringify(data) }),
  listTeachers: (subdomain: string) =>
    fetchApi<any[]>('/school/teachers', subdomain),
  listClasses: (subdomain: string) =>
    fetchApi<any[]>('/school/classes', subdomain),
}
