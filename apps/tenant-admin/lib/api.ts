const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '')
const API_BASE_URL = `${API_HOST}/api`

interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

function getToken(subdomain: string): string | null {
  if (typeof window === 'undefined') return null
  // The login page stores the JWT under 'token' (and, going forward, a
  // subdomain-scoped key). Read the scoped key first, then fall back to 'token'
  // so authenticated calls don't 401 due to a key mismatch.
  return (
    localStorage.getItem(`tenant-token-${subdomain}`) ||
    localStorage.getItem('token')
  )
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
      // Session expired / not logged in: drop stale tokens and go to login
      // instead of surfacing "Unauthorized" on every action.
      if (response.status === 401 && typeof window !== 'undefined' && !endpoint.startsWith('/auth/')) {
        localStorage.removeItem(`tenant-token-${subdomain}`)
        localStorage.removeItem('token')
        if (!window.location.pathname.includes('/login')) {
          // basePath ('/admin') isn't auto-prepended for raw window.location
          // assignments the way <Link>/router.push handle it.
          window.location.href = '/admin/login'
        }
        return { error: 'Session expired — please sign in again' }
      }
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

  updateOwnBranding: (subdomain: string, branding: Record<string, any>) =>
    fetchApi<any>('/tenants/me/branding', subdomain, { method: 'PUT', body: JSON.stringify(branding) }),

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

  updateProfile: (subdomain: string, data: { firstName?: string; lastName?: string; phone?: string; avatarUrl?: string }) =>
    fetchApi<any>('/users/profile', subdomain, { method: 'PUT', body: JSON.stringify(data) }),
}

export const tenantDashboardApi = {
  getStats: (subdomain: string) =>
    fetchApi<any>(`/dashboard/tenant?tenantId=me`, subdomain),
}

export const tenantCrmApi = {
  list: (subdomain: string, params?: { page?: number; limit?: number; channel?: string; status?: string; search?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.channel && params.channel !== 'all') searchParams.append('channel', params.channel)
    if (params?.status && params.status !== 'all') searchParams.append('status', params.status)
    if (params?.search) searchParams.append('search', params.search)
    return fetchApi<any>(`/contact?${searchParams.toString()}`, subdomain)
  },

  // Channel setup (omni-channel inbox config, tenant-scoped)
  listChannels: (subdomain: string) =>
    fetchApi<any[]>('/contact/channels', subdomain),
  upsertChannel: (subdomain: string, channel: string, data: { enabled?: boolean; displayName?: string | null; credentials?: Record<string, any> | null }) =>
    fetchApi<any>(`/contact/channels/${channel.toLowerCase()}`, subdomain, { method: 'PUT', body: JSON.stringify(data) }),
  rotateChannelSecret: (subdomain: string, channel: string) =>
    fetchApi<any>(`/contact/channels/${channel.toLowerCase()}/rotate-secret`, subdomain, { method: 'POST' }),
}

// Roles & permissions (tenant-scoped via JWT on the API side)
export const tenantRolesApi = {
  list: (subdomain: string, params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', String(params.page))
    if (params?.limit) searchParams.append('limit', String(params.limit))
    const qs = searchParams.toString()
    return fetchApi<any>(`/roles${qs ? `?${qs}` : ''}`, subdomain)
  },
  getById: (subdomain: string, id: string) =>
    fetchApi<any>(`/roles/${id}`, subdomain),
  create: (subdomain: string, data: { name: string; description?: string; permissions?: string[] }) =>
    fetchApi<any>('/roles', subdomain, { method: 'POST', body: JSON.stringify(data) }),
  update: (subdomain: string, id: string, data: { name?: string; description?: string; permissions?: string[] }) =>
    fetchApi<any>(`/roles/${id}`, subdomain, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (subdomain: string, id: string) =>
    fetchApi<any>(`/roles/${id}`, subdomain, { method: 'DELETE' }),
  seedDefaults: (subdomain: string, tenantId: string) =>
    fetchApi<any>(`/roles/seed-tenant/${tenantId}`, subdomain, { method: 'POST' }),
}

export const tenantPermissionsApi = {
  list: (subdomain: string) =>
    fetchApi<any[]>('/permissions', subdomain),
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
  setupDefaults: (subdomain: string) =>
    fetchApi<any>('/finance/accounts/setup-defaults', subdomain, { method: 'POST' }),
  listFiscalYears: (subdomain: string) =>
    fetchApi<any[]>('/finance/accounts/fiscal-years', subdomain),
  createFiscalYear: (subdomain: string, data: { name: string; startDate: string; endDate: string; isActive?: boolean }) =>
    fetchApi<any>('/finance/accounts/fiscal-years', subdomain, { method: 'POST', body: JSON.stringify(data) }),
  activateFiscalYear: (subdomain: string, id: string) =>
    fetchApi<any>(`/finance/accounts/fiscal-years/${id}/activate`, subdomain, { method: 'POST' }),
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

  // Retry all due (PENDING/FAILED) CBMS sync-queue rows (workstream 4.7)
  retryCbmsSync: (subdomain: string) =>
    fetchApi<{ processed: number; succeeded: number; failed: number }>(
      '/finance/cbms/retry',
      subdomain,
      { method: 'POST' },
    ),
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

export const menuBuilderApi = {
  list: (s: string) => fetchApi<any[]>('/menus', s),
  get: (s: string, menuId: string) => fetchApi<any>(`/menus/${menuId}`, s),
  create: (s: string, data: any) => fetchApi<any>('/menus', s, { method: 'POST', body: JSON.stringify(data) }),
  update: (s: string, menuId: string, data: any) => fetchApi<any>(`/menus/${menuId}`, s, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (s: string, menuId: string) => fetchApi<any>(`/menus/${menuId}`, s, { method: 'DELETE' }),

  createItem: (s: string, menuId: string, data: any) => fetchApi<any>(`/menus/${menuId}/items`, s, { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (s: string, itemId: string, data: any) => fetchApi<any>(`/menus/items/${itemId}`, s, { method: 'PUT', body: JSON.stringify(data) }),
  removeItem: (s: string, itemId: string) => fetchApi<any>(`/menus/items/${itemId}`, s, { method: 'DELETE' }),
  reorderItem: (s: string, itemId: string, direction: 'up' | 'down') =>
    fetchApi<any>(`/menus/items/${itemId}/reorder`, s, { method: 'POST', body: JSON.stringify({ direction }) }),
}

export const aiApi = {
  /** Routes through the shared AI Gateway (POST /api/ai/chat) — agentKey
   * 'website.content-writer' is a text-only agent registered by
   * apps/api/src/modules/website-ai; it never writes to the DB, the caller
   * (Menu Builder / RichTextEditor) always saves the result explicitly. */
  writeContent: (s: string, brief: string) =>
    fetchApi<{ reply: string }>('/ai/chat', s, {
      method: 'POST',
      body: JSON.stringify({ agentKey: 'website.content-writer', message: brief, screen: 'website-builder' }),
    }),
}

export const pageBuilderApi = {
  list: (s: string) => fetchApi<any[]>('/pages', s),
  get: (s: string, pageId: string) => fetchApi<any>(`/pages/${pageId}`, s),
  create: (s: string, data: any) => fetchApi<any>('/pages', s, { method: 'POST', body: JSON.stringify(data) }),
  update: (s: string, pageId: string, data: any) => fetchApi<any>(`/pages/${pageId}`, s, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (s: string, pageId: string) => fetchApi<any>(`/pages/${pageId}`, s, { method: 'DELETE' }),

  submitForReview: (s: string, pageId: string) => fetchApi<any>(`/pages/${pageId}/submit-review`, s, { method: 'POST' }),
  approve: (s: string, pageId: string) => fetchApi<any>(`/pages/${pageId}/approve`, s, { method: 'POST' }),
  publishNow: (s: string, pageId: string) => fetchApi<any>(`/pages/${pageId}/publish`, s, { method: 'POST' }),
  schedule: (s: string, pageId: string, publishAt: string) =>
    fetchApi<any>(`/pages/${pageId}/schedule`, s, { method: 'POST', body: JSON.stringify({ publishAt }) }),
  archive: (s: string, pageId: string) => fetchApi<any>(`/pages/${pageId}/archive`, s, { method: 'POST' }),
  revertToDraft: (s: string, pageId: string) => fetchApi<any>(`/pages/${pageId}/revert-to-draft`, s, { method: 'POST' }),

  createSection: (s: string, pageId: string, data: any) => fetchApi<any>(`/pages/${pageId}/sections`, s, { method: 'POST', body: JSON.stringify(data) }),
  updateSection: (s: string, sectionId: string, data: any) => fetchApi<any>(`/pages/sections/${sectionId}`, s, { method: 'PUT', body: JSON.stringify(data) }),
  removeSection: (s: string, sectionId: string) => fetchApi<any>(`/pages/sections/${sectionId}`, s, { method: 'DELETE' }),
  reorderSection: (s: string, sectionId: string, direction: 'up' | 'down') =>
    fetchApi<any>(`/pages/sections/${sectionId}/reorder`, s, { method: 'POST', body: JSON.stringify({ direction }) }),
  reorderSections: (s: string, pageId: string, orderedIds: string[]) =>
    fetchApi<any>(`/pages/${pageId}/sections/reorder-all`, s, { method: 'PUT', body: JSON.stringify({ orderedIds }) }),
}

export const formsBuilderApi = {
  list: (s: string) => fetchApi<any[]>('/forms', s),
  get: (s: string, formId: string) => fetchApi<any>(`/forms/${formId}`, s),
  create: (s: string, data: any) => fetchApi<any>('/forms', s, { method: 'POST', body: JSON.stringify(data) }),
  update: (s: string, formId: string, data: any) => fetchApi<any>(`/forms/${formId}`, s, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (s: string, formId: string) => fetchApi<any>(`/forms/${formId}`, s, { method: 'DELETE' }),
  submissions: (s: string, formId: string) => fetchApi<any[]>(`/forms/${formId}/submissions`, s),

  createField: (s: string, formId: string, data: any) => fetchApi<any>(`/forms/${formId}/fields`, s, { method: 'POST', body: JSON.stringify(data) }),
  updateField: (s: string, fieldId: string, data: any) => fetchApi<any>(`/forms/fields/${fieldId}`, s, { method: 'PUT', body: JSON.stringify(data) }),
  removeField: (s: string, fieldId: string) => fetchApi<any>(`/forms/fields/${fieldId}`, s, { method: 'DELETE' }),
  reorderField: (s: string, fieldId: string, direction: 'up' | 'down') =>
    fetchApi<any>(`/forms/fields/${fieldId}/reorder`, s, { method: 'POST', body: JSON.stringify({ direction }) }),
}

export const themeBuilderApi = {
  list: (s: string) => fetchApi<any[]>('/themes', s),
  get: (s: string, themeId: string) => fetchApi<any>(`/themes/${themeId}`, s),
  create: (s: string, data: any) => fetchApi<any>('/themes', s, { method: 'POST', body: JSON.stringify(data) }),
  duplicate: (s: string, fromThemeId: string | undefined, name: string) =>
    fetchApi<any>('/themes/duplicate', s, { method: 'POST', body: JSON.stringify({ fromThemeId, name }) }),
  update: (s: string, themeId: string, data: any) => fetchApi<any>(`/themes/${themeId}`, s, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (s: string, themeId: string) => fetchApi<any>(`/themes/${themeId}`, s, { method: 'DELETE' }),
  activate: (s: string, themeId: string) => fetchApi<any>(`/themes/${themeId}/activate`, s, { method: 'POST' }),
  deactivate: (s: string, themeId: string) => fetchApi<any>(`/themes/${themeId}/deactivate`, s, { method: 'POST' }),
}

export const mediaApi = {
  list: (s: string) => fetchApi<any[]>('/files/media/library', s),
  remove: (s: string, id: string) => fetchApi<any>(`/files/${id}`, s, { method: 'DELETE' }),
  rename: (s: string, id: string, originalName: string) =>
    fetchApi<any>(`/files/${id}`, s, { method: 'PUT', body: JSON.stringify({ originalName }) }),

  /** Multipart upload bypasses fetchApi (which always sends JSON) — the
   * browser must set its own multipart Content-Type boundary. */
  async upload(s: string, file: File): Promise<ApiResponse<any>> {
    const form = new FormData()
    form.append('file', file)
    form.append('documentType', 'MEDIA')
    form.append('isPublic', 'true')
    const token = getToken(s)
    try {
      const response = await fetch(`${API_BASE_URL}/files/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return { error: errorData.message || `HTTP ${response.status}` }
      }
      return { data: await response.json() }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Network error' }
    }
  },
}

export const tenantSettingsApi = {
  getBranding: (subdomain: string) => fetchApi<any>('/settings/branding', subdomain),
  saveBranding: (subdomain: string, data: any) =>
    fetchApi<any>('/settings/branding', subdomain, { method: 'PUT', body: JSON.stringify(data) }),
  get: (subdomain: string) => fetchApi<any>('/settings', subdomain),
  set: (subdomain: string, key: string, value: any) =>
    fetchApi<any>('/settings', subdomain, { method: 'POST', body: JSON.stringify({ key, value }) }),
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

/** Gym-ops admin API — members, plans, trainers, classes, attendance, announcements. */
export const gymApi = {
  members: {
    list: (s: string) => fetchApi<any>('/fitness/members', s),
    stats: (s: string) => fetchApi<any>('/fitness/members/stats', s),
    create: (s: string, data: any) => fetchApi<any>('/fitness/members', s, { method: 'POST', body: JSON.stringify(data) }),
    verify: (s: string, id: string) => fetchApi<any>(`/fitness/members/${id}/verify`, s, { method: 'POST' }),
  },
  plans: {
    list: (s: string) => fetchApi<any>('/fitness/membership-plans', s),
    create: (s: string, data: any) => fetchApi<any>('/fitness/membership-plans', s, { method: 'POST', body: JSON.stringify(data) }),
    update: (s: string, id: string, data: any) => fetchApi<any>(`/fitness/membership-plans/${id}`, s, { method: 'PUT', body: JSON.stringify(data) }),
  },
  trainers: {
    list: (s: string) => fetchApi<any>('/fitness/trainers', s),
    create: (s: string, data: any) => fetchApi<any>('/fitness/trainers', s, { method: 'POST', body: JSON.stringify(data) }),
  },
  classes: {
    list: (s: string) => fetchApi<any>('/fitness/classes', s),
    create: (s: string, data: any) => fetchApi<any>('/fitness/classes', s, { method: 'POST', body: JSON.stringify(data) }),
  },
  attendance: {
    today: (s: string) => fetchApi<any>('/fitness/checkin/today', s),
    manual: (s: string, memberId: string) => fetchApi<any>('/fitness/checkin/manual', s, { method: 'POST', body: JSON.stringify({ memberId }) }),
    qr: (s: string, qrCode: string) => fetchApi<any>('/fitness/checkin/qr', s, { method: 'POST', body: JSON.stringify({ qrCode }) }),
  },
  finance: {
    recordExpense: (s: string, data: any) => fetchApi<any>('/fitness/finance/expense', s, { method: 'POST', body: JSON.stringify(data) }),
  },
  announcements: {
    send: (s: string, data: { title: string; message: string; audience?: string }) =>
      fetchApi<any>('/notifications/send', s, { method: 'POST', body: JSON.stringify({ type: 'ANNOUNCEMENT', ...data }) }),
  },
  workouts: {
    list: (s: string, params?: { memberId?: string; status?: string }) => {
      const p = new URLSearchParams()
      if (params?.memberId) p.append('memberId', params.memberId)
      if (params?.status) p.append('status', params.status)
      const q = p.toString() ? `?${p.toString()}` : ''
      return fetchApi<any>(`/fitness/workout-plans${q}`, s)
    },
    byMember: (s: string, memberId: string) => fetchApi<any>(`/fitness/workout-plans?memberId=${memberId}`, s),
    create: (s: string, data: any) => fetchApi<any>('/fitness/workout-plans', s, { method: 'POST', body: JSON.stringify(data) }),
    generate: (s: string, data: any) => fetchApi<any>('/fitness/workout-plans/generate', s, { method: 'POST', body: JSON.stringify(data) }),
    approve: (s: string, id: string) => fetchApi<any>(`/fitness/workout-plans/${id}/approve`, s, { method: 'POST' }),
    remove: (s: string, id: string) => fetchApi<any>(`/fitness/workout-plans/${id}`, s, { method: 'DELETE' }),
  },
  diet: {
    list: (s: string, params?: { memberId?: string; status?: string }) => {
      const p = new URLSearchParams()
      if (params?.memberId) p.append('memberId', params.memberId)
      if (params?.status) p.append('status', params.status)
      const q = p.toString() ? `?${p.toString()}` : ''
      return fetchApi<any>(`/fitness/diet-plans${q}`, s)
    },
    create: (s: string, data: any) => fetchApi<any>('/fitness/diet-plans', s, { method: 'POST', body: JSON.stringify(data) }),
    generate: (s: string, data: any) => fetchApi<any>('/fitness/diet-plans/generate', s, { method: 'POST', body: JSON.stringify(data) }),
    approve: (s: string, id: string) => fetchApi<any>(`/fitness/diet-plans/${id}/approve`, s, { method: 'POST' }),
    remove: (s: string, id: string) => fetchApi<any>(`/fitness/diet-plans/${id}`, s, { method: 'DELETE' }),
  },
  assessments: {
    list: (s: string, memberId?: string) => fetchApi<any>(`/fitness/assessments${memberId ? `?memberId=${memberId}` : ''}`, s),
    create: (s: string, data: any) => fetchApi<any>('/fitness/assessments', s, { method: 'POST', body: JSON.stringify(data) }),
    progress: (s: string, memberId: string) => fetchApi<any>(`/fitness/assessments/progress/${memberId}`, s),
    remove: (s: string, id: string) => fetchApi<any>(`/fitness/assessments/${id}`, s, { method: 'DELETE' }),
  },
  equipment: {
    list: (s: string) => fetchApi<any>('/fitness/equipment', s),
    stats: (s: string) => fetchApi<any>('/fitness/equipment/stats', s),
    create: (s: string, data: any) => fetchApi<any>('/fitness/equipment', s, { method: 'POST', body: JSON.stringify(data) }),
    update: (s: string, id: string, data: any) => fetchApi<any>(`/fitness/equipment/${id}`, s, { method: 'PUT', body: JSON.stringify(data) }),
    maintenance: {
      list: (s: string) => fetchApi<any>('/fitness/equipment-maintenance', s),
      create: (s: string, data: any) => fetchApi<any>('/fitness/equipment-maintenance', s, { method: 'POST', body: JSON.stringify(data) }),
    },
  },
  badges: {
    list: (s: string) => fetchApi<any>('/fitness/badges', s),
    create: (s: string, data: any) => fetchApi<any>('/fitness/badges', s, { method: 'POST', body: JSON.stringify(data) }),
    award: (s: string, data: { memberId: string; badgeId: string }) =>
      fetchApi<any>('/fitness/customer-badges/award', s, { method: 'POST', body: JSON.stringify(data) }),
    byMember: (s: string, memberId: string) => fetchApi<any>(`/fitness/customer-badges/member/${memberId}`, s),
  },
  referrals: {
    list: (s: string) => fetchApi<any>('/fitness/referrals', s),
    stats: (s: string, memberId: string) => fetchApi<any>(`/fitness/referrals/stats/${memberId}`, s),
    create: (s: string, data: any) => fetchApi<any>('/fitness/referrals', s, { method: 'POST', body: JSON.stringify(data) }),
    complete: (s: string, id: string) => fetchApi<any>(`/fitness/referrals/${id}/complete`, s, { method: 'POST' }),
  },
  foodDb: {
    list: (s: string, params?: { category?: string; search?: string }) => {
      const p = new URLSearchParams()
      if (params?.category) p.append('category', params.category)
      if (params?.search) p.append('search', params.search)
      const q = p.toString() ? `?${p.toString()}` : ''
      return fetchApi<any>(`/fitness/nepali-foods${q}`, s)
    },
    categories: (s: string) => fetchApi<any>('/fitness/nepali-foods/categories', s),
    create: (s: string, data: any) => fetchApi<any>('/fitness/nepali-foods', s, { method: 'POST', body: JSON.stringify(data) }),
  },
  trainerMe: (s: string) => fetchApi<any>('/fitness/trainers/me', s),
}

/** Per-tenant SMTP (transactional email) settings. */
export const tenantMailApi = {
  getConfig: (s: string) => fetchApi<any>('/tenant-mail/config', s),
  saveConfig: (s: string, data: any) => fetchApi<any>('/tenant-mail/config', s, { method: 'PUT', body: JSON.stringify(data) }),
  test: (s: string, to?: string) => fetchApi<any>('/tenant-mail/test', s, { method: 'POST', body: JSON.stringify({ to }) }),
}

/** Biometric attendance — ZKTeco devices, data puller, logs & reports. */
export const attendanceApi = {
  devices: {
    list: (s: string) => fetchApi<any>('/attendance-devices', s),
    create: (s: string, data: any) => fetchApi<any>('/attendance-devices', s, { method: 'POST', body: JSON.stringify(data) }),
    update: (s: string, id: string, data: any) => fetchApi<any>(`/attendance-devices/${id}`, s, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (s: string, id: string) => fetchApi<any>(`/attendance-devices/${id}`, s, { method: 'DELETE' }),
    pull: (s: string, id: string) => fetchApi<any>(`/attendance-devices/${id}/pull`, s, { method: 'POST' }),
    pullAll: (s: string) => fetchApi<any>('/attendance-devices/pull-all', s, { method: 'POST' }),
    test: (s: string, id: string) => fetchApi<any>(`/attendance-devices/${id}/test`, s, { method: 'POST' }),
    sessions: (s: string, deviceId?: string) => fetchApi<any>(`/attendance-devices/sessions${deviceId ? `?deviceId=${deviceId}` : ''}`, s),
  },
  logs: (s: string, q?: { from?: string; to?: string; deviceId?: string; search?: string; page?: number; pageSize?: number }) => {
    const p = new URLSearchParams()
    if (q?.from) p.append('from', q.from)
    if (q?.to) p.append('to', q.to)
    if (q?.deviceId) p.append('deviceId', q.deviceId)
    if (q?.search) p.append('search', q.search)
    if (q?.page) p.append('page', String(q.page))
    if (q?.pageSize) p.append('pageSize', String(q.pageSize))
    const qs = p.toString() ? `?${p.toString()}` : ''
    return fetchApi<any>(`/attendance-logs${qs}`, s)
  },
  reports: {
    daily: (s: string, date?: string) => fetchApi<any>(`/attendance-reports/daily${date ? `?date=${date}` : ''}`, s),
    monthly: (s: string, month?: string) => fetchApi<any>(`/attendance-reports/monthly${month ? `?month=${month}` : ''}`, s),
    summary: (s: string, days = 14) => fetchApi<any>(`/attendance-reports/summary?days=${days}`, s),
  },
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

// Blog API (tenant-scoped)
export const blogApi = {
  list: (s: string, params?: { status?: string; categoryId?: string; search?: string; page?: number; limit?: number }) => {
    const p = new URLSearchParams()
    if (params?.status) p.append('status', params.status)
    if (params?.categoryId) p.append('categoryId', params.categoryId)
    if (params?.search) p.append('search', params.search)
    if (params?.page) p.append('page', String(params.page))
    if (params?.limit) p.append('limit', String(params.limit))
    return fetchApi<{ data: any[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(`/blogs/admin?${p.toString()}`, s)
  },
  getById: (s: string, id: string) => fetchApi<any>(`/blogs/admin/${id}`, s),
  create: (s: string, data: any) => fetchApi<any>('/blogs', s, { method: 'POST', body: JSON.stringify(data) }),
  update: (s: string, id: string, data: any) => fetchApi<any>(`/blogs/${id}`, s, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (s: string, id: string) => fetchApi<{ message: string }>(`/blogs/${id}`, s, { method: 'DELETE' }),
  publish: (s: string, id: string) => fetchApi<any>(`/blogs/${id}/publish`, s, { method: 'POST' }),
  suggestSlug: (s: string, title: string) =>
    fetchApi<{ slug: string; alternatives: string[] }>('/blogs/slug-suggest', s, { method: 'POST', body: JSON.stringify({ title }) }),
  stats: (s: string, id: string) =>
    fetchApi<{ viewCount: number; likeCount: number; commentCount: number }>(`/blogs/${id}/stats`, s),
}

// Blog Categories API (tenant-scoped)
export const blogCategoryApi = {
  list: (s: string) => fetchApi<any[]>('/blog-categories', s),
  create: (s: string, data: { name: string; description?: string; color?: string; thumbnail?: string }) =>
    fetchApi<any>('/blog-categories', s, { method: 'POST', body: JSON.stringify(data) }),
  update: (s: string, id: string, data: { name?: string; description?: string; color?: string; thumbnail?: string }) =>
    fetchApi<any>(`/blog-categories/${id}`, s, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (s: string, id: string) => fetchApi<{ message: string }>(`/blog-categories/${id}`, s, { method: 'DELETE' }),
}

// Ecommerce API (tenant-scoped) — categories, brands, products, variants,
// warehouses, stock, orders, shipments, dashboard.
export const ecommerceApi = {
  categories: {
    list: (s: string) => fetchApi<any[]>('/ecommerce/categories', s),
    create: (s: string, data: { name: string; slug?: string; parentId?: string }) =>
      fetchApi<any>('/ecommerce/categories', s, { method: 'POST', body: JSON.stringify(data) }),
    update: (s: string, id: string, data: { name?: string; slug?: string; parentId?: string | null }) =>
      fetchApi<any>(`/ecommerce/categories/${id}`, s, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (s: string, id: string) => fetchApi<{ message: string }>(`/ecommerce/categories/${id}`, s, { method: 'DELETE' }),
  },

  brands: {
    list: (s: string) => fetchApi<any[]>('/ecommerce/brands', s),
    create: (s: string, data: { name: string; logoUrl?: string }) =>
      fetchApi<any>('/ecommerce/brands', s, { method: 'POST', body: JSON.stringify(data) }),
    remove: (s: string, id: string) => fetchApi<{ message: string }>(`/ecommerce/brands/${id}`, s, { method: 'DELETE' }),
  },

  products: {
    list: (s: string, params?: { categoryId?: string; brandId?: string; q?: string }) => {
      const p = new URLSearchParams()
      if (params?.categoryId) p.append('categoryId', params.categoryId)
      if (params?.brandId) p.append('brandId', params.brandId)
      if (params?.q) p.append('q', params.q)
      const qs = p.toString() ? `?${p.toString()}` : ''
      return fetchApi<any[]>(`/ecommerce/products${qs}`, s)
    },
    getById: (s: string, id: string) => fetchApi<any>(`/ecommerce/products/${id}`, s),
    create: (s: string, data: any) => fetchApi<any>('/ecommerce/products', s, { method: 'POST', body: JSON.stringify(data) }),
    update: (s: string, id: string, data: any) => fetchApi<any>(`/ecommerce/products/${id}`, s, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (s: string, id: string) => fetchApi<{ message: string }>(`/ecommerce/products/${id}`, s, { method: 'DELETE' }),
  },

  warehouses: {
    list: (s: string) => fetchApi<any[]>('/ecommerce/warehouses', s),
    create: (s: string, data: { name: string; code?: string; address?: string; isDefault?: boolean }) =>
      fetchApi<any>('/ecommerce/warehouses', s, { method: 'POST', body: JSON.stringify(data) }),
  },

  stock: {
    list: (s: string, warehouseId?: string) =>
      fetchApi<any[]>(`/ecommerce/stock${warehouseId ? `?warehouseId=${warehouseId}` : ''}`, s),
    low: (s: string) => fetchApi<any[]>('/ecommerce/stock/low', s),
    adjust: (s: string, data: { productId: string; variantId?: string; warehouseId: string; quantityChange: number; reason?: string }) =>
      fetchApi<any>('/ecommerce/stock/adjust', s, { method: 'POST', body: JSON.stringify(data) }),
  },

  attributes: {
    list: (s: string) => fetchApi<any[]>('/ecommerce/attributes', s),
    create: (s: string, data: { name: string }) =>
      fetchApi<any>('/ecommerce/attributes', s, { method: 'POST', body: JSON.stringify(data) }),
    addValue: (s: string, attributeId: string, data: { value: string }) =>
      fetchApi<any>(`/ecommerce/attributes/${attributeId}/values`, s, { method: 'POST', body: JSON.stringify(data) }),
    remove: (s: string, id: string) => fetchApi<{ message: string }>(`/ecommerce/attributes/${id}`, s, { method: 'DELETE' }),
  },

  variants: {
    create: (s: string, productId: string, data: { sku?: string; priceOverride?: number; barcode?: string; valueIds: string[] }) =>
      fetchApi<any>(`/ecommerce/products/${productId}/variants`, s, { method: 'POST', body: JSON.stringify(data) }),
    remove: (s: string, id: string) => fetchApi<{ message: string }>(`/ecommerce/variants/${id}`, s, { method: 'DELETE' }),
  },

  orders: {
    list: (s: string, mine?: boolean) => fetchApi<any[]>(`/ecommerce/orders?mine=${mine ? 'true' : 'false'}`, s),
    getById: (s: string, id: string) => fetchApi<any>(`/ecommerce/orders/${id}`, s),
    updateStatus: (s: string, id: string, status: string) =>
      fetchApi<any>(`/ecommerce/orders/${id}/status`, s, { method: 'PUT', body: JSON.stringify({ status }) }),
    cancel: (s: string, id: string) => fetchApi<any>(`/ecommerce/orders/${id}/cancel`, s, { method: 'POST' }),
    confirmPayment: (s: string, id: string, data: { providerType: string; providerTxnId: string; amount?: number }) =>
      fetchApi<any>(`/ecommerce/orders/${id}/confirm-payment`, s, { method: 'POST', body: JSON.stringify(data) }),
  },

  shipments: {
    create: (s: string, orderId: string, data: { courierName?: string; trackingNumber?: string; warehouseId: string }) =>
      fetchApi<any>(`/ecommerce/orders/${orderId}/shipment`, s, { method: 'POST', body: JSON.stringify(data) }),
    updateStatus: (s: string, id: string, status: string) =>
      fetchApi<any>(`/ecommerce/shipments/${id}/status`, s, { method: 'PUT', body: JSON.stringify({ status }) }),
  },

  dashboard: (s: string) =>
    fetchApi<{ productCount: number; lowStockCount: number; orderCount: number; pendingOrders: number; totalRevenue?: number }>(
      '/ecommerce/dashboard/summary',
      s,
    ),

  customers: {
    list: (s: string) =>
      fetchApi<Array<{ id: string; name: string; email: string | null; mobile: string | null; totalSpent: number; orderCount: number; lastOrderAt: string | null }>>(
        '/ecommerce/customers',
        s,
      ),
    getById: (s: string, id: string) => fetchApi<any>(`/ecommerce/customers/${id}`, s),
  },
}

// Payment Gateway API — tenant-configurable payment providers (eSewa, Fonepay,
// ConnectIPS, Stripe, PayPal).
export const paymentGatewayApi = {
  listAvailableProviders: (s: string) =>
    fetchApi<{ providers: string[] }>('/payment-gateway/providers', s),
  listTenantProviders: (s: string) =>
    fetchApi<any[]>('/payment-gateway/tenant/providers', s),
  saveProvider: (s: string, data: {
    type: string
    name: string
    credentials: Record<string, any>
    config?: Record<string, any>
    isDefault?: boolean
    transactionFeePercent?: number
    fixedFee?: number
    supportedCurrencies?: string[]
  }) => fetchApi<any>('/payment-gateway/tenant/providers', s, { method: 'POST', body: JSON.stringify(data) }),
}

// Plan modules API — which modules the tenant's subscription plan enables.
// Returns null on any failure so callers can FAIL OPEN (show everything).
export const tenantModulesApi = {
  get: async (subdomain: string): Promise<Record<string, boolean> | null> => {
    try {
      const tenantRes = await tenantApi.getBySubdomain(subdomain)
      const tenantId = tenantRes.data?.id
      if (!tenantId) return null
      const res = await fetchApi<{ modules?: Record<string, boolean> }>(
        `/subscriptions/tenant/${tenantId}/modules`,
        subdomain
      )
      if (res.error || !res.data?.modules) return null
      return res.data.modules
    } catch {
      return null
    }
  },
}

export interface TenantFile {
  id: string
  originalName: string
  mimeType: string | null
  sizeBytes: string | number
  documentType: string
  uploadedAt: string
}

export const filesApi = {
  list: (subdomain: string) => fetchApi<TenantFile[]>('/files', subdomain),
  delete: (subdomain: string, id: string) => fetchApi<{ message: string }>(`/files/${id}`, subdomain, { method: 'DELETE' }),
  downloadUrl: (subdomain: string, id: string) => fetchApi<{ downloadUrl: string }>(`/files/download/${id}`, subdomain),
}
