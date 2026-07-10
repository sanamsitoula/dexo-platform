const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '')
const API_BASE_URL = `${API_HOST}/api`

interface ApiResponse<T> {
  data?: T
  error?: string
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`
  const defaultHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken')
    if (token) defaultHeaders['Authorization'] = `Bearer ${token}`
  }
  const config: RequestInit = { ...options, headers: { ...defaultHeaders, ...options.headers } }
  try {
    const response = await fetch(url, config)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { error: errorData.message || `HTTP error! status: ${response.status}` }
    }
    if (response.status === 204) return { data: undefined as T }
    const data = await response.json()
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export const authApi = {
  login: (email: string, password: string) =>
    fetchApi<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    fetchApi<{ user: any }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getProfile: () => fetchApi<any>('/auth/profile'),
  logout: () => fetchApi<void>('/auth/logout', { method: 'POST' }),
}

export const dashboardApi = {
  getTenantDashboard: () => fetchApi<any>('/dashboard/tenant'),
}

export const usersApi = {
  getTenantUsers: () => fetchApi<any[]>('/users/tenant'),
  invite: (data: { email: string; roleId?: string }) =>
    fetchApi<any>('/users/invite', { method: 'POST', body: JSON.stringify(data) }),
  getPendingInvitations: () => fetchApi<any[]>('/users/invitations/pending'),
}

export const rolesApi = {
  list: () => fetchApi<any[]>('/roles'),
}

export const subscriptionsApi = {
  getTenantSubscription: (tenantId: string) => fetchApi<any>(`/subscriptions/tenant/${tenantId}`),
  listPlans: () => fetchApi<any[]>('/subscriptions/plans'),
}

export const billingApi = {
  getSummary: () => fetchApi<any>('/billing/summary'),
  getInvoices: () => fetchApi<any[]>('/billing/invoices'),
  getPaymentMethods: () => fetchApi<any[]>('/billing/payment-methods'),
}

export const notificationsApi = {
  getTemplates: () => fetchApi<any[]>('/notifications/templates'),
}

export const domainsApi = {
  list: () => fetchApi<any[]>('/domains'),
  getByCode: (code: string) => fetchApi<any>(`/domains/${code}`),
  getMenus: (code: string, roleCode?: string) => {
    const params = roleCode ? `?roleCode=${roleCode}` : '';
    return fetchApi<any[]>(`/domains/${code}/menus${params}`);
  },
  getWidgets: (code: string, roleCode?: string) => {
    const params = roleCode ? `?roleCode=${roleCode}` : '';
    return fetchApi<any[]>(`/domains/${code}/widgets${params}`);
  },
  getTheme: (code: string) => fetchApi<any>(`/domains/${code}/theme`),
  getTenantDomainInfo: (tenantId: string) => fetchApi<any>(`/domains/tenant/${tenantId}`),
  getProvisioningStatus: (tenantId: string) => fetchApi<any>(`/domains/tenant/${tenantId}/provisioning`),
  quickSetup: (tenantId: string, domainCode: string) => fetchApi<any>('/domains/quick-setup', {
    method: 'POST',
    body: JSON.stringify({ tenantId, domainCode }),
  }),
  checkAccess: (moduleCode: string, action: string) => fetchApi<any>('/domains/check-access', {
    method: 'POST',
    body: JSON.stringify({ moduleCode, action }),
  }),
}

export const socialAuthApi = {
  getTenantAuthUrl: (tenantId: string, provider: string, redirectUri?: string) => {
    const params = redirectUri ? `?redirectUri=${encodeURIComponent(redirectUri)}` : '';
    return fetchApi<{ url: string; provider: string; tenantId: string }>(`/auth/social/tenant/${tenantId}/${provider}/url${params}`);
  },
  getLinkedAccounts: () => fetchApi<any[]>('/auth/social/linked-accounts'),
  unlinkAccount: (provider: string) => fetchApi<{ message: string }>(`/auth/social/unlink/${provider}`, {
    method: 'POST',
  }),
}

export const branchesApi = {
  list: (params?: { status?: string; type?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.type) searchParams.append('type', params.type);
    return fetchApi<any[]>(`/branches?${searchParams.toString()}`);
  },
  getById: (id: string) => fetchApi<any>(`/branches/${id}`),
  create: (data: any) => fetchApi<any>('/branches', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => fetchApi<any>(`/branches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetchApi<{ message: string }>(`/branches/${id}`, {
    method: 'DELETE',
  }),
  getUsers: (branchId: string) => fetchApi<any[]>(`/branches/${branchId}/users`),
  assignUser: (branchId: string, data: any) => fetchApi<any>(`/branches/${branchId}/users`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  removeUser: (branchId: string, userId: string) => fetchApi<{ message: string }>(`/branches/${branchId}/users/${userId}`, {
    method: 'DELETE',
  }),
  getSchedules: (branchId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return fetchApi<any[]>(`/branches/${branchId}/schedules?${params.toString()}`);
  },
  createSchedule: (branchId: string, data: any) => fetchApi<any>(`/branches/${branchId}/schedules`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getExpenses: (branchId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return fetchApi<any[]>(`/branches/${branchId}/expenses?${params.toString()}`);
  },
  createExpense: (branchId: string, data: any) => fetchApi<any>(`/branches/${branchId}/expenses`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
}

export const branchReportsApi = {
  getAllBranchesReport: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return fetchApi<any>(`/branches/reports/all?${params.toString()}`);
  },
  getBranchOverview: (branchId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return fetchApi<any>(`/branches/reports/${branchId}/overview?${params.toString()}`);
  },
  getStaffPerformance: (branchId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return fetchApi<any>(`/branches/reports/${branchId}/staff?${params.toString()}`);
  },
  getBranchRevenue: (branchId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return fetchApi<any>(`/branches/reports/${branchId}/revenue?${params.toString()}`);
  },
  getBranchExpenses: (branchId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return fetchApi<any>(`/branches/reports/${branchId}/expenses?${params.toString()}`);
  },
  saveReport: (branchId: string, data: { reportType: string; period: string; data: any }) => fetchApi<any>(`/branches/reports/${branchId}/save`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getSavedReports: (branchId: string, reportType?: string, period?: string) => {
    const params = new URLSearchParams();
    if (reportType) params.append('reportType', reportType);
    if (period) params.append('period', period);
    return fetchApi<any[]>(`/branches/reports/${branchId}/saved?${params.toString()}`);
  },
}

export const fitnessApi = {
  members: {
    list: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return fetchApi<any>(`/fitness/members${q ? `?${q}` : ''}`);
    },
    get: (id: string) => fetchApi<any>(`/fitness/members/${id}`),
    me: () => fetchApi<any>('/fitness/members/me'),
    create: (data: any) => fetchApi<any>('/fitness/members', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchApi<any>(`/fitness/members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    verify: (id: string) => fetchApi<any>(`/fitness/members/${id}/verify`, { method: 'POST' }),
    remove: (id: string) => fetchApi<any>(`/fitness/members/${id}`, { method: 'DELETE' }),
    stats: (branchId?: string) => fetchApi<any>(`/fitness/members/stats${branchId ? `?branchId=${branchId}` : ''}`),
  },
  plans: {
    list: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return fetchApi<any>(`/fitness/membership-plans${q ? `?${q}` : ''}`);
    },
    get: (id: string) => fetchApi<any>(`/fitness/membership-plans/${id}`),
    create: (data: any) => fetchApi<any>('/fitness/membership-plans', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchApi<any>(`/fitness/membership-plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string) => fetchApi<any>(`/fitness/membership-plans/${id}`, { method: 'DELETE' }),
  },
  memberships: {
    list: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return fetchApi<any>(`/fitness/memberships${q ? `?${q}` : ''}`);
    },
    get: (id: string) => fetchApi<any>(`/fitness/memberships/${id}`),
    expiring: (days = 7) => fetchApi<any>(`/fitness/memberships/expiring?days=${days}`),
    create: (data: any) => fetchApi<any>('/fitness/memberships', { method: 'POST', body: JSON.stringify(data) }),
    activatePayment: (id: string, paymentRef: string, paymentMethod: string) =>
      fetchApi<any>(`/fitness/memberships/${id}/activate-payment`, { method: 'POST', body: JSON.stringify({ paymentRef, paymentMethod }) }),
    renew: (id: string) => fetchApi<any>(`/fitness/memberships/${id}/renew`, { method: 'POST' }),
    freeze: (id: string, days: number, reason: string) =>
      fetchApi<any>(`/fitness/memberships/${id}/freeze`, { method: 'POST', body: JSON.stringify({ days, reason }) }),
    unfreeze: (id: string) => fetchApi<any>(`/fitness/memberships/${id}/unfreeze`, { method: 'POST' }),
    cancel: (id: string) => fetchApi<any>(`/fitness/memberships/${id}/cancel`, { method: 'POST' }),
  },
  trainers: {
    list: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return fetchApi<any>(`/fitness/trainers${q ? `?${q}` : ''}`);
    },
    get: (id: string) => fetchApi<any>(`/fitness/trainers/${id}`),
    me: () => fetchApi<any>('/fitness/trainers/me'),
    create: (data: any) => fetchApi<any>('/fitness/trainers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchApi<any>(`/fitness/trainers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string) => fetchApi<any>(`/fitness/trainers/${id}`, { method: 'DELETE' }),
  },
  messages: {
    thread: (memberId: string, trainerId: string) =>
      fetchApi<any>(`/fitness/trainer-messages/thread?memberId=${memberId}&trainerId=${trainerId}`),
    member: (memberId: string) => fetchApi<any>(`/fitness/trainer-messages/member/${memberId}`),
    trainerInbox: (trainerId: string) => fetchApi<any>(`/fitness/trainer-messages/trainer/${trainerId}/inbox`),
    send: (data: any) => fetchApi<any>('/fitness/trainer-messages', { method: 'POST', body: JSON.stringify(data) }),
    markRead: (id: string) => fetchApi<any>(`/fitness/trainer-messages/${id}/read`, { method: 'POST' }),
  },
  assessments: {
    list: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return fetchApi<any>(`/fitness/assessments${q ? `?${q}` : ''}`);
    },
    progress: (memberId: string) => fetchApi<any>(`/fitness/assessments/progress/${memberId}`),
    create: (data: any) => fetchApi<any>('/fitness/assessments', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchApi<any>(`/fitness/assessments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string) => fetchApi<any>(`/fitness/assessments/${id}`, { method: 'DELETE' }),
  },
  workoutPlans: {
    list: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return fetchApi<any>(`/fitness/workout-plans${q ? `?${q}` : ''}`);
    },
    get: (id: string) => fetchApi<any>(`/fitness/workout-plans/${id}`),
    create: (data: any) => fetchApi<any>('/fitness/workout-plans', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchApi<any>(`/fitness/workout-plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    approve: (id: string) => fetchApi<any>(`/fitness/workout-plans/${id}/approve`, { method: 'POST' }),
    addDay: (id: string, data: any) => fetchApi<any>(`/fitness/workout-plans/${id}/days`, { method: 'POST', body: JSON.stringify(data) }),
    addExercise: (dayId: string, data: any) => fetchApi<any>(`/fitness/workout-plans/days/${dayId}/exercises`, { method: 'POST', body: JSON.stringify(data) }),
  },
  workoutLogs: {
    list: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return fetchApi<any>(`/fitness/workout-logs${q ? `?${q}` : ''}`);
    },
    stats: (memberId: string) => fetchApi<any>(`/fitness/workout-logs/stats/${memberId}`),
    create: (data: any) => fetchApi<any>('/fitness/workout-logs', { method: 'POST', body: JSON.stringify(data) }),
  },
  dietPlans: {
    list: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return fetchApi<any>(`/fitness/diet-plans${q ? `?${q}` : ''}`);
    },
    get: (id: string) => fetchApi<any>(`/fitness/diet-plans/${id}`),
    create: (data: any) => fetchApi<any>('/fitness/diet-plans', { method: 'POST', body: JSON.stringify(data) }),
    approve: (id: string) => fetchApi<any>(`/fitness/diet-plans/${id}/approve`, { method: 'POST' }),
  },
  foodLogs: {
    list: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return fetchApi<any>(`/fitness/food-logs${q ? `?${q}` : ''}`);
    },
    summary: (memberId: string, date?: string) =>
      fetchApi<any>(`/fitness/food-logs/summary/${memberId}${date ? `?date=${date}` : ''}`),
    create: (data: any) => fetchApi<any>('/fitness/food-logs', { method: 'POST', body: JSON.stringify(data) }),
  },
  nepaliFoods: {
    list: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return fetchApi<any>(`/fitness/nepali-foods${q ? `?${q}` : ''}`);
    },
    categories: () => fetchApi<any>('/fitness/nepali-foods/categories'),
  },
  classes: {
    list: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return fetchApi<any>(`/fitness/classes${q ? `?${q}` : ''}`);
    },
    get: (id: string) => fetchApi<any>(`/fitness/classes/${id}`),
    create: (data: any) => fetchApi<any>('/fitness/classes', { method: 'POST', body: JSON.stringify(data) }),
  },
  bookings: {
    list: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return fetchApi<any>(`/fitness/bookings${q ? `?${q}` : ''}`);
    },
    book: (data: any) => fetchApi<any>('/fitness/bookings', { method: 'POST', body: JSON.stringify(data) }),
    cancel: (id: string) => fetchApi<any>(`/fitness/bookings/${id}/cancel`, { method: 'POST' }),
  },
  badges: {
    list: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return fetchApi<any>(`/fitness/badges${q ? `?${q}` : ''}`);
    },
    memberBadges: (memberId: string) => fetchApi<any>(`/fitness/customer-badges/member/${memberId}`),
    checkStreak: (memberId: string) => fetchApi<any>(`/fitness/customer-badges/check/streak/${memberId}`, { method: 'POST' }),
    checkMilestones: (memberId: string) => fetchApi<any>(`/fitness/customer-badges/check/milestones/${memberId}`, { method: 'POST' }),
  },
  referrals: {
    list: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return fetchApi<any>(`/fitness/referrals${q ? `?${q}` : ''}`);
    },
    stats: (memberId: string) => fetchApi<any>(`/fitness/referrals/stats/${memberId}`),
    create: (data: any) => fetchApi<any>('/fitness/referrals', { method: 'POST', body: JSON.stringify(data) }),
    findByCode: (code: string) => fetchApi<any>(`/fitness/referrals/code/${code}`),
  },
  equipment: {
    list: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return fetchApi<any>(`/fitness/equipment${q ? `?${q}` : ''}`);
    },
    stats: (branchId?: string) => fetchApi<any>(`/fitness/equipment/stats${branchId ? `?branchId=${branchId}` : ''}`),
    create: (data: any) => fetchApi<any>('/fitness/equipment', { method: 'POST', body: JSON.stringify(data) }),
  },
  checkin: {
    qr: (qrCode: string, branchId?: string) =>
      fetchApi<any>('/fitness/checkin/qr', { method: 'POST', body: JSON.stringify({ qrCode, branchId }) }),
    manual: (memberId: string, branchId?: string) =>
      fetchApi<any>('/fitness/checkin/manual', { method: 'POST', body: JSON.stringify({ memberId, branchId }) }),
    today: (branchId?: string) => fetchApi<any>(`/fitness/checkin/today${branchId ? `?branchId=${branchId}` : ''}`),
    history: (memberId: string, days = 30) => fetchApi<any>(`/fitness/checkin/member/${memberId}?days=${days}`),
  },
}

// Public contact form (no auth required)
export const contactApi = {
  submit: (data: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    subject?: string;
    message: string;
    source?: string;
    subdomain?: string;
    tenantId?: string;
  }) => fetchApi<{ success: boolean; message: string; id: string }>('/contact', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  // Tenant-scoped submit (for tenant-website)
  submitForTenant: (subdomain: string, data: {
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    message: string;
  }) => fetchApi<{ success: boolean; message: string; id: string }>('/contact', {
    method: 'POST',
    body: JSON.stringify({ ...data, subdomain, source: 'tenant_website_contact_form' }),
  }),
}
