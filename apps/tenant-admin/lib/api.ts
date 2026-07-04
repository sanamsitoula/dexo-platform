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

export const tenantAccountsApi = {
  list: (subdomain: string, type?: string) => {
    const q = type ? `?type=${type}` : ''
    return fetchApi<any[]>(`/finance/accounts${q}`, subdomain)
  },
  create: (subdomain: string, data: {
    accountCode: string
    accountName: string
    accountType: string
    parentId?: string
    isControl?: boolean
    currency?: string
    normalBalance?: string
  }) => fetchApi<any>('/finance/accounts', subdomain, { method: 'POST', body: JSON.stringify(data) }),
  update: (subdomain: string, id: string, data: { accountName?: string; isControl?: boolean; isActive?: boolean; currency?: string }) =>
    fetchApi<any>(`/finance/accounts/${id}`, subdomain, { method: 'PUT', body: JSON.stringify(data) }),
  getBalance: (subdomain: string, id: string, startDate?: string, endDate?: string) => {
    const p = new URLSearchParams()
    if (startDate) p.append('startDate', startDate)
    if (endDate) p.append('endDate', endDate)
    const q = p.toString() ? `?${p.toString()}` : ''
    return fetchApi<any>(`/finance/accounts/${id}/balance${q}`, subdomain)
  },
  getTrialBalance: (subdomain: string, startDate?: string, endDate?: string) => {
    const p = new URLSearchParams()
    if (startDate) p.append('startDate', startDate)
    if (endDate) p.append('endDate', endDate)
    const q = p.toString() ? `?${p.toString()}` : ''
    return fetchApi<any>(`/finance/accounts/trial-balance${q}`, subdomain)
  },
}

export const tenantJournalApi = {
  list: (subdomain: string, params?: { startDate?: string; endDate?: string; posted?: boolean }) => {
    const p = new URLSearchParams()
    if (params?.startDate) p.append('startDate', params.startDate)
    if (params?.endDate) p.append('endDate', params.endDate)
    if (params?.posted !== undefined) p.append('posted', String(params.posted))
    const q = p.toString() ? `?${p.toString()}` : ''
    return fetchApi<any[]>(`/finance/journal${q}`, subdomain)
  },
  create: (subdomain: string, data: {
    entryDate: string
    referenceType?: string
    description: string
    narration?: string
    autoPost?: boolean
    lines: { accountId: string; debitAmount: string; creditAmount: string; description?: string }[]
  }) => fetchApi<any>('/finance/journal', subdomain, { method: 'POST', body: JSON.stringify(data) }),
  post: (subdomain: string, id: string) =>
    fetchApi<any>(`/finance/journal/${id}/post`, subdomain, { method: 'POST' }),
  reverse: (subdomain: string, id: string, reason: string) =>
    fetchApi<any>(`/finance/journal/${id}/reverse`, subdomain, { method: 'POST', body: JSON.stringify({ reason }) }),
}

export const tenantInvoicesApi = {
  list: (subdomain: string, params?: { status?: string; startDate?: string; endDate?: string }) => {
    const p = new URLSearchParams()
    if (params?.status) p.append('status', params.status)
    if (params?.startDate) p.append('startDate', params.startDate)
    if (params?.endDate) p.append('endDate', params.endDate)
    const q = p.toString() ? `?${p.toString()}` : ''
    return fetchApi<any[]>(`/finance/invoices${q}`, subdomain)
  },
  get: (subdomain: string, id: string) =>
    fetchApi<any>(`/finance/invoices/${id}`, subdomain),
  print: (subdomain: string, id: string, reason?: string) =>
    fetchApi<any>(`/finance/invoices/${id}/print`, subdomain, { method: 'POST', body: JSON.stringify({ reason }) }),
}

export const tenantPaymentsApi = {
  listReceived: (subdomain: string, params?: { customerId?: string; startDate?: string; endDate?: string }) => {
    const p = new URLSearchParams()
    if (params?.customerId) p.append('customerId', params.customerId)
    if (params?.startDate) p.append('startDate', params.startDate)
    if (params?.endDate) p.append('endDate', params.endDate)
    const q = p.toString() ? `?${p.toString()}` : ''
    return fetchApi<any[]>(`/finance/payments/received${q}`, subdomain)
  },
}

export const tenantFinanceReportsApi = {
  getSummary: (subdomain: string) =>
    fetchApi<any>('/finance/reports/summary', subdomain),

  // NFRS financial statements (backend already existed)
  getBalanceSheet: (subdomain: string, asOfDate?: string) => {
    const q = asOfDate ? `?asOfDate=${asOfDate}` : ''
    return fetchApi<any>(`/finance/reports/balance-sheet${q}`, subdomain)
  },
  getIncomeStatement: (subdomain: string, startDate?: string, endDate?: string) => {
    const p = new URLSearchParams()
    if (startDate) p.append('startDate', startDate)
    if (endDate) p.append('endDate', endDate)
    const q = p.toString() ? `?${p.toString()}` : ''
    return fetchApi<any>(`/finance/reports/income-statement${q}`, subdomain)
  },
  getTrialBalance: (subdomain: string, asOfDate?: string) => {
    const q = asOfDate ? `?asOfDate=${asOfDate}` : ''
    return fetchApi<any>(`/finance/reports/trial-balance${q}`, subdomain)
  },
  getCashFlow: (subdomain: string, startDate?: string, endDate?: string) => {
    const p = new URLSearchParams()
    if (startDate) p.append('startDate', startDate)
    if (endDate) p.append('endDate', endDate)
    const q = p.toString() ? `?${p.toString()}` : ''
    return fetchApi<any>(`/finance/reports/cash-flow${q}`, subdomain)
  },
  getAccountsReceivable: (subdomain: string) =>
    fetchApi<any>('/finance/reports/accounts-receivable', subdomain),

  // IRD electronic billing reports (new in workstream 4.6)
  getSalesBook: (subdomain: string, startDate?: string, endDate?: string) => {
    const p = new URLSearchParams()
    if (startDate) p.append('startDate', startDate)
    if (endDate) p.append('endDate', endDate)
    const q = p.toString() ? `?${p.toString()}` : ''
    return fetchApi<any>(`/finance/reports/sales-book${q}`, subdomain)
  },
  getPurchaseBook: (subdomain: string, startDate?: string, endDate?: string) => {
    const p = new URLSearchParams()
    if (startDate) p.append('startDate', startDate)
    if (endDate) p.append('endDate', endDate)
    const q = p.toString() ? `?${p.toString()}` : ''
    return fetchApi<any>(`/finance/reports/purchase-book${q}`, subdomain)
  },
  getVatReturn: (subdomain: string, startDate?: string, endDate?: string) => {
    const p = new URLSearchParams()
    if (startDate) p.append('startDate', startDate)
    if (endDate) p.append('endDate', endDate)
    const q = p.toString() ? `?${p.toString()}` : ''
    return fetchApi<any>(`/finance/reports/vat-return${q}`, subdomain)
  },
  getTdsSummary: (subdomain: string, startDate?: string, endDate?: string) => {
    const p = new URLSearchParams()
    if (startDate) p.append('startDate', startDate)
    if (endDate) p.append('endDate', endDate)
    const q = p.toString() ? `?${p.toString()}` : ''
    return fetchApi<any>(`/finance/reports/tds-summary${q}`, subdomain)
  },
  getDeferredRevenue: (subdomain: string, asOfDate?: string) => {
    const q = asOfDate ? `?asOfDate=${asOfDate}` : ''
    return fetchApi<any>(`/finance/reports/deferred-revenue${q}`, subdomain)
  },
  getArAging: (subdomain: string, asOfDate?: string) => {
    const q = asOfDate ? `?asOfDate=${asOfDate}` : ''
    return fetchApi<any>(`/finance/reports/ar-aging${q}`, subdomain)
  },
  getApAging: (subdomain: string, asOfDate?: string) => {
    const q = asOfDate ? `?asOfDate=${asOfDate}` : ''
    return fetchApi<any>(`/finance/reports/ap-aging${q}`, subdomain)
  },
  getCancelledBills: (subdomain: string, startDate?: string, endDate?: string) => {
    const p = new URLSearchParams()
    if (startDate) p.append('startDate', startDate)
    if (endDate) p.append('endDate', endDate)
    const q = p.toString() ? `?${p.toString()}` : ''
    return fetchApi<any>(`/finance/reports/cancelled-bills${q}`, subdomain)
  },
  getReprintLog: (subdomain: string, startDate?: string, endDate?: string) => {
    const p = new URLSearchParams()
    if (startDate) p.append('startDate', startDate)
    if (endDate) p.append('endDate', endDate)
    const q = p.toString() ? `?${p.toString()}` : ''
    return fetchApi<any>(`/finance/reports/reprint-log${q}`, subdomain)
  },
  getAuditTrail: (
    subdomain: string,
    startDate?: string,
    endDate?: string,
    filters?: { tableName?: string; action?: string; actionBy?: string },
  ) => {
    const p = new URLSearchParams()
    if (startDate) p.append('startDate', startDate)
    if (endDate) p.append('endDate', endDate)
    if (filters?.tableName) p.append('tableName', filters.tableName)
    if (filters?.action) p.append('action', filters.action)
    if (filters?.actionBy) p.append('actionBy', filters.actionBy)
    const q = p.toString() ? `?${p.toString()}` : ''
    return fetchApi<any>(`/finance/reports/audit-trail${q}`, subdomain)
  },
  getCbmsSyncStatus: (subdomain: string) =>
    fetchApi<any>('/finance/reports/cbms-sync-status', subdomain),
}

export const tenantWhatsAppApi = {
  getConfig: (subdomain: string) =>
    fetchApi<any>('/whatsapp/config', subdomain),

  upsertConfig: (subdomain: string, data: {
    phoneNumber: string;
    displayName?: string;
    accessToken?: string;
    phoneNumberId?: string;
    wabaId?: string;
    webhookVerifyToken?: string;
    isEnabled?: boolean;
    autoReplyEnabled?: boolean;
    templates?: Record<string, string>;
  }) => fetchApi<any>('/whatsapp/config', subdomain, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  sendTest: (subdomain: string, to: string, text?: string) =>
    fetchApi<any>('/whatsapp/test', subdomain, {
      method: 'POST',
      body: JSON.stringify({ to, text }),
    }),

  notify: (subdomain: string, templateKey: string, to: string, params?: Record<string, string>) =>
    fetchApi<any>('/whatsapp/notify', subdomain, {
      method: 'POST',
      body: JSON.stringify({ templateKey, to, params: params ?? {} }),
    }),

  optOut: (subdomain: string, phone: string) =>
    fetchApi<any>('/whatsapp/opt-out', subdomain, {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  optIn: (subdomain: string, phone: string) =>
    fetchApi<any>('/whatsapp/opt-in', subdomain, {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),
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
