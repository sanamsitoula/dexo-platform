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
          window.location.href = '/login'
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
