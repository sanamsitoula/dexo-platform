const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '')
const API_BASE_URL = `${API_HOST}/api`

interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken')
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`
    }
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  }

  try {
    const response = await fetch(url, config)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        error: errorData.message || `HTTP error! status: ${response.status}`,
      }
    }

    if (response.status === 204) {
      return { data: undefined as T }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    console.error('API error:', error)
    return {
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    fetchApi<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  
  register: (data: { email: string; password: string; firstName: string; lastName: string; phone?: string; tenantId?: string }) =>
    fetchApi<{ user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  getProfile: () =>
    fetchApi<any>('/auth/profile'),
  
  logout: () =>
    fetchApi<void>('/auth/logout', { method: 'POST' }),
}

// Tenants API
export const tenantsApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.status) searchParams.append('status', params.status)
    return fetchApi<{ data: any[]; meta: { total: number } }>(`/tenants?${searchParams.toString()}`)
  },
  
  getById: (id: string) =>
    fetchApi<any>(`/tenants/${id}`),
  
  create: (data: { name: string; subdomain?: string; domain?: string }) =>
    fetchApi<any>('/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: { name?: string; status?: string }) =>
    fetchApi<any>(`/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    fetchApi<{ message: string; totalRows: number; deletedCounts: Record<string, number> }>(`/tenants/${id}`, { method: 'DELETE' }),
  // Treats 204 No Content as success too (older API version fallback)

  /** Counts the rows in every related table for a tenant (used by the delete modal preview). */
  getDeletionImpact: (id: string) =>
    fetchApi<{
      tenant: { id: string; name: string; subdomain: string }
      totalRows: number
      activeSubscription: any
      blocked: boolean
      items: { model: string; count: number; detaches: boolean; label: string }[]
    }>(`/tenants/${id}/deletion-impact`),
  
  suspend: (id: string) =>
    fetchApi<any>(`/tenants/${id}/suspend`, { method: 'POST' }),

  activate: (id: string) =>
    fetchApi<any>(`/tenants/${id}/activate`, { method: 'POST' }),

  updateSettings: (id: string, settings: Record<string, any>) =>
    fetchApi<any>(`/tenants/${id}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
}

// Users API
export const usersApi = {
  list: (params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    const qs = searchParams.toString()
    return fetchApi<any>(`/users/tenant${qs ? `?${qs}` : ''}`)
  },
  
  getById: (id: string) =>
    fetchApi<any>(`/users/${id}`),
  
  invite: (data: { email: string; roleId?: string }) =>
    fetchApi<any>('/users/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  deactivate: (userId: string) =>
    fetchApi<any>(`/users/${userId}/deactivate`, { method: 'POST' }),

  reactivate: (userId: string) =>
    fetchApi<any>(`/users/${userId}/reactivate`, { method: 'POST' }),

  resetPassword: (data: { email: string; newPassword: string; tenantId?: string }) =>
    fetchApi<any>('/users/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// Contact / CRM API
export const contactApi = {
  list: (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.status && params.status !== 'all') searchParams.append('status', params.status)
    if (params?.search) searchParams.append('search', params.search)
    return fetchApi<any>(`/contact?${searchParams.toString()}`)
  },

  getById: (id: string) =>
    fetchApi<any>(`/contact/${id}`),

  getStats: () =>
    fetchApi<any>('/contact/stats'),

  update: (id: string, data: { status?: string; priority?: string; notes?: string }) =>
    fetchApi<any>(`/contact/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  reply: (id: string, replyMessage: string) =>
    fetchApi<any>(`/contact/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ replyMessage }),
    }),

  submit: (data: { name: string; email: string; phone?: string; company?: string; subject?: string; message: string; screenshot?: string }) =>
    fetchApi<any>('/contact', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// CRM channel setup API (omni-channel inbox configs)
export const channelsApi = {
  list: (tenantId?: string) =>
    fetchApi<any[]>(`/contact/channels${tenantId ? `?tenantId=${tenantId}` : ''}`),

  upsert: (channel: string, data: { enabled?: boolean; displayName?: string | null; credentials?: Record<string, any> | null }, tenantId?: string) =>
    fetchApi<any>(`/contact/channels/${channel.toLowerCase()}${tenantId ? `?tenantId=${tenantId}` : ''}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  rotateSecret: (channel: string, tenantId?: string) =>
    fetchApi<any>(`/contact/channels/${channel.toLowerCase()}/rotate-secret${tenantId ? `?tenantId=${tenantId}` : ''}`, {
      method: 'POST',
    }),
}

// Roles API
export const rolesApi = {
  list: (params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', String(params.page))
    if (params?.limit) searchParams.append('limit', String(params.limit))
    const qs = searchParams.toString()
    return fetchApi<any>(`/roles${qs ? `?${qs}` : ''}`)
  },

  seedTenant: (tenantId: string) =>
    fetchApi<any>(`/roles/seed-tenant/${tenantId}`, { method: 'POST' }),

  getById: (id: string) =>
    fetchApi<any>(`/roles/${id}`),

  create: (data: { name: string; description?: string; permissions?: string[] }) =>
    fetchApi<any>('/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { name?: string; description?: string; permissions?: string[] }) =>
    fetchApi<any>(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    fetchApi<void>(`/roles/${id}`, { method: 'DELETE' }),
  
  assign: (data: { userId: string; roleId: string }) =>
    fetchApi<any>('/roles/assign', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  remove: (data: { userId: string; roleId: string }) =>
    fetchApi<any>('/roles/remove', {
      method: 'DELETE',
      body: JSON.stringify(data),
    }),
}

// Dashboard API
export const dashboardApi = {
  getStats: () =>
    fetchApi<any>('/dashboard/overview'),
  
  getRecentActivity: () =>
    fetchApi<any[]>('/audit/tenant'),
}

// Settings API
export const settingsApi = {
  getGlobal: () =>
    fetchApi<any>('/settings'),
  
  updateGlobal: (data: Record<string, any>) =>
    fetchApi<any>('/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  getByKey: (key: string) =>
    fetchApi<any>(`/settings/${key}`),
  
  setByKey: (key: string, value: any) =>
    fetchApi<any>('/settings', {
      method: 'POST',
      body: JSON.stringify({ key, value }),
    }),
  
  deleteByKey: (key: string) =>
    fetchApi<void>(`/settings/${key}`, { method: 'DELETE' }),
}

// Subscriptions API
export const subscriptionsApi = {
  list: () =>
    fetchApi<any[]>('/subscriptions'),
  
  getById: (id: string) =>
    fetchApi<any>(`/subscriptions/${id}`),
  
  getTenantSubscription: (tenantId: string) =>
    fetchApi<any>(`/subscriptions/tenant/${tenantId}`),
  
  cancel: (id: string) =>
    fetchApi<any>(`/subscriptions/${id}/cancel`, { method: 'POST' }),
  
  renew: (id: string) =>
    fetchApi<any>(`/subscriptions/${id}/renew`, { method: 'POST' }),
  
  // :subscriptionId is the SUBSCRIPTION id; the controller reads `newPlanId`.
  changePlan: (subscriptionId: string, newPlanId: string) =>
    fetchApi<any>(`/subscriptions/${subscriptionId}/change-plan`, {
      method: 'POST',
      body: JSON.stringify({ newPlanId }),
    }),

  create: (data: { tenantId: string; planId: string; status?: string }) =>
    fetchApi<any>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getTenantModules: (tenantId: string) =>
    fetchApi<any>(`/subscriptions/tenant/${tenantId}/modules`),

  listPlans: () =>
    fetchApi<any[]>('/subscriptions/plans'),

  createPlan: (data: any) =>
    fetchApi<any>('/subscriptions/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePlan: (id: string, data: any) =>
    fetchApi<any>(`/subscriptions/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
}

// Billing API
export const billingApi = {
  getSummary: () =>
    fetchApi<any>('/billing/summary'),
  
  getRevenue: () =>
    fetchApi<any>('/billing/revenue'),
  
  getInvoices: () =>
    fetchApi<any[]>('/billing/invoices'),
  
  getInvoice: (id: string) =>
    fetchApi<any>(`/billing/invoices/${id}`),
  
  getPaymentMethods: () =>
    fetchApi<any[]>('/billing/payment-methods'),
  
  addPaymentMethod: (data: any) =>
    fetchApi<any>('/billing/payment-methods', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  removePaymentMethod: (id: string) =>
    fetchApi<void>(`/billing/payment-methods/${id}`, { method: 'DELETE' }),
}

// Notifications API
export const notificationsApi = {
  listTemplates: (params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    const qs = searchParams.toString()
    return fetchApi<any>(`/notifications/templates${qs ? `?${qs}` : ''}`)
  },
  
  getTemplate: (id: string) =>
    fetchApi<any>(`/notifications/templates/${id}`),
  
  createTemplate: (data: any) =>
    fetchApi<any>('/notifications/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  updateTemplate: (id: string, data: any) =>
    fetchApi<any>(`/notifications/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  deleteTemplate: (id: string) =>
    fetchApi<void>(`/notifications/templates/${id}`, { method: 'DELETE' }),
  
  send: (data: { to: string; templateId?: string; subject?: string; body?: string }) =>
    fetchApi<any>('/notifications/send', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// Audit API
export const auditApi = {
  getLogs: (params?: { limit?: number; offset?: number; action?: string; resourceType?: string; userId?: string; tenantId?: string; search?: string; startDate?: string; endDate?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.offset) searchParams.append('offset', params.offset.toString())
    if (params?.action) searchParams.append('action', params.action)
    if (params?.resourceType) searchParams.append('resourceType', params.resourceType)
    if (params?.userId) searchParams.append('userId', params.userId)
    if (params?.tenantId) searchParams.append('tenantId', params.tenantId)
    if (params?.search) searchParams.append('search', params.search)
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)
    return fetchApi<any>(`/audit?${searchParams.toString()}`)
  },

  getActions: () => fetchApi<string[]>('/audit/actions'),
  getStats: () => fetchApi<any>('/audit/stats'),
  getUserLogs: (userId: string) => fetchApi<any[]>(`/audit/user/${userId}`),
  getResourceLogs: (resourceType: string, resourceId: string) =>
    fetchApi<any[]>(`/audit/resource/${resourceType}/${resourceId}`),
}

// Domain API
export const domainsApi = {
  list: () =>
    fetchApi<any[]>('/domains'),
  
  getByCode: (code: string) =>
    fetchApi<any>(`/domains/${code}`),
  
  getMenus: (code: string, roleCode?: string) => {
    const params = roleCode ? `?roleCode=${roleCode}` : ''
    return fetchApi<any[]>(`/domains/${code}/menus${params}`)
  },
  
  getWidgets: (code: string, roleCode?: string) => {
    const params = roleCode ? `?roleCode=${roleCode}` : ''
    return fetchApi<any[]>(`/domains/${code}/widgets${params}`)
  },
  
  getTheme: (code: string) =>
    fetchApi<any>(`/domains/${code}/theme`),
  
  getTenantDomainInfo: (tenantId: string) =>
    fetchApi<any>(`/domains/tenant/${tenantId}`),
  
  getProvisioningStatus: (tenantId: string) =>
    fetchApi<any>(`/domains/tenant/${tenantId}/provisioning`),
  
  assignToTenant: (tenantId: string, domainCode: string) =>
    fetchApi<any>(`/domains/tenant/${tenantId}/assign/${domainCode}`, { method: 'POST' }),
  
  quickSetup: (tenantId: string, domainCode: string) =>
    fetchApi<any>('/domains/quick-setup', {
      method: 'POST',
      body: JSON.stringify({ tenantId, domainCode }),
    }),
  
  checkAccess: (moduleCode: string, action: string) =>
    fetchApi<any>('/domains/check-access', {
      method: 'POST',
      body: JSON.stringify({ moduleCode, action }),
    }),
}

// Permissions API
export const permissionsApi = {
  list: (params?: { resource?: string; action?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.resource) searchParams.append('resource', params.resource)
    if (params?.action) searchParams.append('action', params.action)
    const qs = searchParams.toString()
    return fetchApi<any[]>(`/permissions${qs ? `?${qs}` : ''}`)
  },
  
  getById: (id: string) =>
    fetchApi<any>(`/permissions/${id}`),
}

// Tenant Domain API
export const tenantDomainsApi = {
  assignDomain: (tenantId: string, domainCode: string) =>
    domainsApi.assignToTenant(tenantId, domainCode),
  
  quickProvision: (tenantId: string, domainCode: string) =>
    domainsApi.quickSetup(tenantId, domainCode),
  
  getInfo: (tenantId: string) =>
    domainsApi.getTenantDomainInfo(tenantId),
  
  getProvisioningStatus: (tenantId: string) =>
    domainsApi.getProvisioningStatus(tenantId),
}

// Branches API (for admin to manage branches across all tenants)
export const branchesApi = {
  // List all branches (admin can see all across tenants)
  listAll: (params?: { tenantId?: string; status?: string; type?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.tenantId) searchParams.append('tenantId', params.tenantId);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.type) searchParams.append('type', params.type);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    return fetchApi<any>(`/branches?${searchParams.toString()}`);
  },
  
  listByTenant: (tenantId: string, params?: { status?: string; type?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.type) searchParams.append('type', params.type);
    return fetchApi<any[]>(`/branches?tenantId=${tenantId}&${searchParams.toString()}`);
  },
  
  getById: (id: string) => fetchApi<any>(`/branches/${id}`),
  
  create: (tenantId: string, data: any) => fetchApi<any>('/branches', {
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
};

// Branch Reports API
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
};

// Social Auth API
export const socialAuthApi = {
  getLinkedAccounts: () => fetchApi<any[]>('/auth/social/linked-accounts'),
  
  unlinkAccount: (provider: string) => fetchApi<{ message: string }>(`/auth/social/unlink/${provider}`, {
    method: 'POST',
  }),
  
  getTenantConfigs: (tenantId: string) => fetchApi<any[]>(`/auth/social/tenant/${tenantId}/configs`),
  
  updateTenantConfig: (tenantId: string, provider: string, data: any) => fetchApi<any>(`/auth/social/tenant/${tenantId}/${provider}/config`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  getPlatformConfigs: () => fetchApi<any[]>('/auth/platform/configs'),
  
  updatePlatformConfig: (provider: string, data: any) => fetchApi<any>(`/auth/platform/${provider}/config`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// Blog API
export const blogApi = {
  list: (params?: { status?: string; categoryId?: string; search?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append('status', params.status)
    if (params?.categoryId) searchParams.append('categoryId', params.categoryId)
    if (params?.search) searchParams.append('search', params.search)
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    return fetchApi<{ data: any[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(`/blogs/admin?${searchParams.toString()}`)
  },
  
  listPublic: (params?: { subdomain?: string; categoryId?: string; search?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.subdomain) searchParams.append('subdomain', params.subdomain)
    if (params?.categoryId) searchParams.append('categoryId', params.categoryId)
    if (params?.search) searchParams.append('search', params.search)
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    return fetchApi<{ data: any[]; meta: { total: number } }>(`/blogs?${searchParams.toString()}`)
  },
  
  getMyBlogs: (params?: { status?: string; search?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append('status', params.status)
    if (params?.search) searchParams.append('search', params.search)
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    return fetchApi<{ data: any[]; meta: { total: number } }>(`/blogs/my?${searchParams.toString()}`)
  },
  
  getBySlug: (slug: string) =>
    fetchApi<any>(`/blogs/${slug}`),
  
  getById: (id: string) =>
    fetchApi<any>(`/blogs/admin/${id}`),
  
  create: (data: { title: string; content: string; excerpt?: string; featuredImage?: string; template?: string; status?: string; categoryId?: string; tagIds?: string[]; tagNames?: string[]; metaTitle?: string; metaDescription?: string; tenantId?: string }) =>
    fetchApi<any>('/blogs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: { title?: string; content?: string; excerpt?: string; featuredImage?: string; template?: string; status?: string; categoryId?: string; tagIds?: string[]; tagNames?: string[]; metaTitle?: string; metaDescription?: string }) =>
    fetchApi<any>(`/blogs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    fetchApi<{ message: string }>(`/blogs/${id}`, { method: 'DELETE' }),
  
  publish: (id: string) =>
    fetchApi<any>(`/blogs/${id}/publish`, { method: 'POST' }),

  suggestSlug: (title: string) =>
    fetchApi<{ slug: string; alternatives: string[] }>('/blogs/slug-suggest', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  stats: (id: string) =>
    fetchApi<{ viewCount: number; likeCount: number; commentCount: number }>(`/blogs/${id}/stats`),
}

// Blog Categories API
export const blogCategoryApi = {
  list: () =>
    fetchApi<any[]>('/blog-categories'),
  
  getById: (id: string) =>
    fetchApi<any>(`/blog-categories/${id}`),
  
  getBySlug: (slug: string) =>
    fetchApi<any>(`/blog-categories/slug/${slug}`),
  
  create: (data: { name: string; description?: string; color?: string; icon?: string; thumbnail?: string; parentId?: string }) =>
    fetchApi<any>('/blog-categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: { name?: string; description?: string; color?: string; icon?: string; thumbnail?: string; parentId?: string }) =>
    fetchApi<any>(`/blog-categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    fetchApi<{ message: string }>(`/blog-categories/${id}`, { method: 'DELETE' }),
}

// Blog Comments API
export const blogCommentApi = {
  listByBlog: (blogId: string, status?: string) => {
    const searchParams = new URLSearchParams()
    if (status) searchParams.append('status', status)
    return fetchApi<any[]>(`/blogs/${blogId}/comments?${searchParams.toString()}`)
  },
  
  create: (blogId: string, data: { content: string; guestName?: string; guestEmail?: string }) =>
    fetchApi<any>(`/blogs/${blogId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  updateStatus: (commentId: string, status: string) =>
    fetchApi<any>(`/comments/${commentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  
  delete: (commentId: string) =>
    fetchApi<{ message: string }>(`/comments/${commentId}`, { method: 'DELETE' }),
}

// Platform Branding API
export const brandingApi = {
  get: () =>
    fetchApi<any>('/settings/branding'),
  
  update: (data: {
    platformName?: string;
    tagline?: string;
    logoUrl?: string;
    logoDarkUrl?: string;
    faviconUrl?: string;
    ogImageUrl?: string;
    supportEmail?: string;
    supportPhone?: string;
    websiteUrl?: string;
    twitterUrl?: string;
    linkedinUrl?: string;
    githubUrl?: string;
    footerText?: string;
    privacyPolicyUrl?: string;
    termsOfServiceUrl?: string;
    defaultMetaTitle?: string;
    defaultMetaDescription?: string;
    themeConfig?: any;
  }) =>
    fetchApi<any>('/settings/branding', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
}

// Biometric attendance (ZKTeco) — platform-wide overview
export const attendanceAdminApi = {
  devices: (page = 1, pageSize = 25) => fetchApi<any>(`/attendance-devices/admin/all?page=${page}&pageSize=${pageSize}`),
  sessions: (page = 1, pageSize = 25) => fetchApi<any>(`/attendance-devices/admin/sessions?page=${page}&pageSize=${pageSize}`),
}

// Global Email Config — Tier 2 of Tenant -> Global -> System Default (see
// TenantMailService). Switching providers or rotating keys here takes
// effect on the next send, no redeploy.
export const platformEmailApi = {
  get: () => fetchApi<any>('/platform-email/config'),
  save: (data: {
    provider?: string;
    isEnabled?: boolean;
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    pass?: string;
    fromName?: string;
    fromEmail?: string;
    replyTo?: string;
    dailyLimit?: number;
    monthlyLimit?: number;
  }) => fetchApi<any>('/platform-email/config', { method: 'PUT', body: JSON.stringify(data) }),
  test: (to: string) => fetchApi<{ success: boolean; error?: string }>('/platform-email/test', { method: 'POST', body: JSON.stringify({ to }) }),
  logs: (limit = 50) => fetchApi<any[]>(`/platform-email/logs?limit=${limit}`),
}

// Cross-tenant ecommerce visibility (platform-admin oversight, read-only —
// see AdminEcommerceController on the API side).
export const ecommerceAdminApi = {
  getSummary: () =>
    fetchApi<{
      totalStores: number
      tenantsWithEcommerceEnabled: number
      totalProducts: number
      totalOrders: number
      totalRevenue: number
      perTenant: { tenantId: string; tenantName: string; productCount: number; orderCount: number; revenue: number }[]
    }>('/admin/ecommerce/summary'),

  getTenantProducts: (tenantId: string) =>
    fetchApi<any[]>(`/admin/ecommerce/tenants/${tenantId}/products`),

  getTenantOrders: (tenantId: string) =>
    fetchApi<any[]>(`/admin/ecommerce/tenants/${tenantId}/orders`),

  getTenantDashboard: (tenantId: string) =>
    fetchApi<{ productCount: number; lowStockCount: number; orderCount: number; pendingOrders: number; totalRevenue: number }>(
      `/admin/ecommerce/tenants/${tenantId}/dashboard`,
    ),
}

// Tenant module overrides — explicit platform-admin grant/restriction per
// tenant per module, taking precedence over the subscription plan (see
// TenantLifecycleController's module-overrides routes).
export const moduleOverridesApi = {
  list: (tenantId: string) =>
    fetchApi<{ id: string; tenantId: string; moduleKey: string; enabled: boolean; reason: string | null; setBy: string | null }[]>(
      `/tenants/${tenantId}/module-overrides`,
    ),

  set: (tenantId: string, moduleKey: string, enabled: boolean, reason?: string) =>
    fetchApi<any>(`/tenants/${tenantId}/module-overrides/${moduleKey}`, {
      method: 'PUT',
      body: JSON.stringify({ enabled, reason }),
    }),

  remove: (tenantId: string, moduleKey: string) =>
    fetchApi<any>(`/tenants/${tenantId}/module-overrides/${moduleKey}`, { method: 'DELETE' }),
}

// Chatwoot (github.com/chatwoot/chatwoot) — self-hosted messaging connection.
// Tier 1 (customer<->tenant) inboxes are auto-provisioned per tenant; this
// page manages the connection itself + the single Tier 2 (tenant<->platform) inbox.
export const chatwootApi = {
  get: () => fetchApi<any>('/chatwoot/config'),
  save: (data: {
    baseUrl?: string;
    apiAccessToken?: string;
    platformAccountId?: number;
    isEnabled?: boolean;
  }) => fetchApi<any>('/chatwoot/config', { method: 'PUT', body: JSON.stringify(data) }),
  test: () => fetchApi<{ success: boolean; error?: string }>('/chatwoot/test', { method: 'POST' }),
  provisionPlatformInbox: () => fetchApi<any>('/chatwoot/provision-platform-inbox', { method: 'POST' }),
}
