import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { storage } from './storage';

/**
 * Resolve the dev machine's LAN IP automatically.
 *
 * Expo/Metro serves the bundle from your computer, and exposes that host as
 * `hostUri` (e.g. "192.168.1.42:8081"). A phone in Expo Go or an emulator can
 * always reach the API at that same IP on port 4000 — so we derive it instead of
 * hardcoding an IP that goes stale every time the network changes.
 *
 * Override with EXPO_PUBLIC_API_URL if you need a fixed endpoint.
 */
function resolveDevApiBase(): string {
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (override) return override.replace(/\/$/, '') + (override.endsWith('/api') ? '' : '/api');

  const c = Constants as any;
  const hostUri: string =
    Constants.expoConfig?.hostUri ||
    c.manifest?.debuggerHost ||
    c.manifest2?.extra?.expoGo?.debuggerHost ||
    '';
  const host = String(hostUri).split(':')[0];
  // Android emulator maps the host machine to 10.0.2.2; localhost won't work there.
  const fallback = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${host || fallback}:4000/api`;
}

const API_BASE_URL = __DEV__
  ? Platform.OS === 'web'
    ? 'http://localhost:4000/api'
    : resolveDevApiBase()
  : 'https://api.onedexo.com/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function getToken(): Promise<string | null> {
  return storage.getItem('accessToken');
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const token = await getToken();
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: { ...defaultHeaders, ...options.headers },
    };

    const response = await fetch(url, config);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.message || `HTTP error! status: ${response.status}` };
    }
    if (response.status === 204) return { data: undefined as T };
    const data = await response.json();
    return { data };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

export const authApi = {
  login: (email: string, password: string, subdomain?: string) =>
    fetchApi<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(subdomain ? { email, password, subdomain } : { email, password }),
    }),
  register: async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    tenantSubdomain?: string;
  }) => {
    // Resolve the tenantId from the selected business subdomain, then self-signup
    // as a MEMBER (mirrors the customer web app's register flow).
    let tenantId: string | undefined;
    if (data.tenantSubdomain) {
      const t = await tenantsApi.getBySubdomain(data.tenantSubdomain);
      if (t.error || !t.data?.id) {
        return { error: 'Could not resolve the selected business. Please try again.' };
      }
      tenantId = t.data.id;
    }
    const { tenantSubdomain, ...rest } = data;
    return fetchApi<{ accessToken?: string; refreshToken?: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...rest, tenantId, signupAs: 'MEMBER' }),
    });
  },
  getProfile: () => fetchApi<any>('/auth/profile'),
  logout: () => fetchApi<void>('/auth/logout', { method: 'POST' }),
  refresh: (refreshToken: string) =>
    fetchApi<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
};

export const dashboardApi = {
  getTenantDashboard: () => fetchApi<any>('/dashboard/tenant'),
};

export const usersApi = {
  getTenantUsers: () => fetchApi<any[]>('/users/tenant'),
  invite: (data: { email: string; roleId?: string }) =>
    fetchApi<any>('/users/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const rolesApi = {
  list: () => fetchApi<any[]>('/roles'),
};

export const subscriptionsApi = {
  getTenantSubscription: (tenantId: string) =>
    fetchApi<any>(`/subscriptions/tenant/${tenantId}`),
  listPlans: () => fetchApi<any[]>('/subscriptions/plans'),
};

export const billingApi = {
  getSummary: () => fetchApi<any>('/billing/summary'),
  getInvoices: () => fetchApi<any[]>('/billing/invoices'),
};

export const notificationsApi = {
  getTemplates: () => fetchApi<any[]>('/notifications/templates'),
};

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
};

export const socialAuthApi = {
  getTenantAuthUrl: async (tenantId: string, provider: string, redirectUri?: string) => {
    const params = redirectUri ? `?redirectUri=${encodeURIComponent(redirectUri)}` : '';
    return fetchApi<{ url: string; provider: string; tenantId: string }>(`/auth/social/tenant/${tenantId}/${provider}/url${params}`);
  },
  getLinkedAccounts: () => fetchApi<any[]>('/auth/social/linked-accounts'),
  unlinkAccount: (provider: string) => fetchApi<{ message: string }>(`/auth/social/unlink/${provider}`, {
    method: 'POST',
  }),
};

export const tenantsApi = {
  list: (params?: { limit?: number; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);
    return fetchApi<{ data: any[] }>(`/tenants?${searchParams.toString()}`);
  },
  /** Public: server-side search of ACTIVE tenants (for the login tenant selector). Returns up to `limit` (default 10). */
  publicSearch: (q?: string, limit = 10) => {
    const params = new URLSearchParams();
    if (q && q.trim()) params.append('q', q.trim());
    params.append('limit', String(limit));
    return fetchApi<any[]>(`/tenants/public?${params.toString()}`);
  },
  /** Returns the tenant(s) the current authenticated user belongs to */
  myTenants: () => fetchApi<{ data: any[] }>('/tenants/me'),
  getBySubdomain: (subdomain: string) => fetchApi<any>(`/tenants/subdomain/${subdomain}`),
  /**
   * Public: resolve a tenant from any address the customer knows —
   * "vrfitness.onedexo.com", a custom domain like "fitness.com", or a bare
   * slug like "vrfitness".
   */
  resolveHost: (host: string) => fetchApi<any>(`/tenants/resolve?host=${encodeURIComponent(host)}`),
};

export const workoutsApi = {
  list: () => fetchApi<any[]>('/workouts'),
  create: (data: any) => fetchApi<any>('/workouts', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => fetchApi<void>(`/workouts/${id}`, { method: 'DELETE' }),
};

export const trainersApi = {
  list: () => fetchApi<any[]>('/trainers'),
  getById: (id: string) => fetchApi<any>(`/trainers/${id}`),
};

export const customersApi = {
  list: () => fetchApi<any[]>('/finance/customers'),
  getById: (id: string) => fetchApi<any>(`/finance/customers/${id}`),
};

export const packagesApi = {
  list: () => fetchApi<any[]>('/packages'),
  myPackages: () => fetchApi<any[]>('/packages/my'),
  subscribe: (packageId: string, paymentMethod: string) =>
    fetchApi<any>('/packages/subscribe', {
      method: 'POST',
      body: JSON.stringify({ packageId, paymentMethod }),
    }),
  cancel: (subscriptionId: string) =>
    fetchApi<any>(`/packages/${subscriptionId}/cancel`, { method: 'POST' }),
};

export const paymentsApi = {
  listInvoices: () => fetchApi<any[]>('/finance/invoices'),
  listPayments: () => fetchApi<any[]>('/finance/payments/received'),
  getPaymentMethods: () => fetchApi<any[]>('/payment-gateway/methods'),
  payInvoice: (invoiceId: string, method: string) =>
    fetchApi<any>(`/finance/invoices/${invoiceId}/pay`, {
      method: 'POST',
      body: JSON.stringify({ method }),
    }),
};

export const appointmentsApi = {
  list: () => fetchApi<any[]>('/appointments'),
  create: (data: any) => fetchApi<any>('/appointments', { method: 'POST', body: JSON.stringify(data) }),
  cancel: (id: string) => fetchApi<any>(`/appointments/${id}/cancel`, { method: 'POST' }),
};

export const branchesApi = {
  list: async (params?: { status?: string; type?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.type) searchParams.append('type', params.type);
    return fetchApi<any[]>(`/branches?${searchParams.toString()}`);
  },
  getById: (id: string) => fetchApi<any>(`/branches/${id}`),
  getUsers: (branchId: string) => fetchApi<any[]>(`/branches/${branchId}/users`),
  getSchedules: async (branchId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return fetchApi<any[]>(`/branches/${branchId}/schedules?${params.toString()}`);
  },
  getExpenses: async (branchId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return fetchApi<any[]>(`/branches/${branchId}/expenses?${params.toString()}`);
  },
};

export const branchReportsApi = {
  getAllBranchesReport: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return fetchApi<any>(`/branches/reports/all?${params.toString()}`);
  },
  getBranchOverview: async (branchId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return fetchApi<any>(`/branches/reports/${branchId}/overview?${params.toString()}`);
  },
  getStaffPerformance: async (branchId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return fetchApi<any>(`/branches/reports/${branchId}/staff?${params.toString()}`);
  },
  getBranchRevenue: async (branchId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return fetchApi<any>(`/branches/reports/${branchId}/revenue?${params.toString()}`);
  },
};

export const ecommerceApi = {
  products: {
    /** Public storefront browse — no auth required. */
    list: (subdomain: string, params?: { categoryId?: string; brandId?: string; q?: string; featured?: boolean }) => {
      const searchParams = new URLSearchParams();
      if (params?.categoryId) searchParams.append('categoryId', params.categoryId);
      if (params?.brandId) searchParams.append('brandId', params.brandId);
      if (params?.q) searchParams.append('q', params.q);
      if (params?.featured) searchParams.append('featured', 'true');
      const q = searchParams.toString();
      return fetchApi<any[]>(`/ecommerce/public/${subdomain}/products${q ? `?${q}` : ''}`);
    },
    bySlug: (subdomain: string, slug: string) =>
      fetchApi<any>(`/ecommerce/public/${subdomain}/products/${slug}`),
  },
  categories: {
    list: (subdomain: string) => fetchApi<any[]>(`/ecommerce/public/${subdomain}/categories`),
  },
  cart: {
    get: () => fetchApi<any>('/ecommerce/cart'),
    addItem: (data: { productId: string; variantId?: string; quantity: number }) =>
      fetchApi<any>('/ecommerce/cart/items', { method: 'POST', body: JSON.stringify(data) }),
    updateItem: (itemId: string, quantity: number) =>
      fetchApi<any>(`/ecommerce/cart/items/${itemId}`, { method: 'PUT', body: JSON.stringify({ quantity }) }),
    removeItem: (itemId: string) => fetchApi<any>(`/ecommerce/cart/items/${itemId}`, { method: 'DELETE' }),
  },
  checkout: {
    create: (data: {
      shippingAddress?: any;
      couponCode?: string;
      paymentMethod?: 'COD' | 'PREPAID';
      providerType?: string;
      customerEmail?: string;
      customerPhone?: string;
      customerName?: string;
    }) => fetchApi<any>('/ecommerce/checkout', { method: 'POST', body: JSON.stringify(data) }),
  },
  orders: {
    list: (mine = true) => fetchApi<any[]>(`/ecommerce/orders${mine ? '?mine=true' : ''}`),
    byId: (id: string) => fetchApi<any>(`/ecommerce/orders/${id}`),
  },
};

export const aiApi = {
  chat: (message: string, agentKey = 'ecommerce.shopper') =>
    fetchApi<{ reply: string; toolCalls?: any }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ agentKey, message }),
    }),
};

export const fitnessApi = {
  members: {
    list: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return fetchApi<any>(`/fitness/members${q ? `?${q}` : ''}`);
    },
    get: (id: string) => fetchApi<any>(`/fitness/members/${id}`),
    me: () => fetchApi<any>('/fitness/members/me'),
    updateMe: (data: any) => fetchApi<any>('/fitness/members/me', { method: 'PUT', body: JSON.stringify(data) }),
    create: (data: any) => fetchApi<any>('/fitness/members', { method: 'POST', body: JSON.stringify(data) }),
    verify: (id: string) => fetchApi<any>(`/fitness/members/${id}/verify`, { method: 'POST' }),
    stats: (branchId?: string) => fetchApi<any>(`/fitness/members/stats${branchId ? `?branchId=${branchId}` : ''}`),
  },
  plans: {
    list: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return fetchApi<any>(`/fitness/membership-plans${q ? `?${q}` : ''}`);
    },
    create: (data: any) => fetchApi<any>('/fitness/membership-plans', { method: 'POST', body: JSON.stringify(data) }),
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
  },
  messages: {
    thread: (memberId: string, trainerId: string) =>
      fetchApi<any>(`/fitness/trainer-messages/thread?memberId=${memberId}&trainerId=${trainerId}`),
    member: (memberId: string) => fetchApi<any>(`/fitness/trainer-messages/member/${memberId}`),
    trainerInbox: (trainerId: string) => fetchApi<any>(`/fitness/trainer-messages/trainer/${trainerId}/inbox`),
    send: (data: any) => fetchApi<any>('/fitness/trainer-messages', { method: 'POST', body: JSON.stringify(data) }),
  },
  assessments: {
    list: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return fetchApi<any>(`/fitness/assessments${q ? `?${q}` : ''}`);
    },
    progress: (memberId: string) => fetchApi<any>(`/fitness/assessments/progress/${memberId}`),
    create: (data: any) => fetchApi<any>('/fitness/assessments', { method: 'POST', body: JSON.stringify(data) }),
  },
  workoutPlans: {
    list: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return fetchApi<any>(`/fitness/workout-plans${q ? `?${q}` : ''}`);
    },
    get: (id: string) => fetchApi<any>(`/fitness/workout-plans/${id}`),
    create: (data: any) => fetchApi<any>('/fitness/workout-plans', { method: 'POST', body: JSON.stringify(data) }),
    approve: (id: string) => fetchApi<any>(`/fitness/workout-plans/${id}/approve`, { method: 'POST' }),
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
  },
  equipment: {
    list: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return fetchApi<any>(`/fitness/equipment${q ? `?${q}` : ''}`);
    },
    stats: (branchId?: string) => fetchApi<any>(`/fitness/equipment/stats${branchId ? `?branchId=${branchId}` : ''}`),
  },
  checkin: {
    qr: (qrCode: string, branchId?: string) =>
      fetchApi<any>('/fitness/checkin/qr', { method: 'POST', body: JSON.stringify({ qrCode, branchId }) }),
    today: (branchId?: string) => fetchApi<any>(`/fitness/checkin/today${branchId ? `?branchId=${branchId}` : ''}`),
    history: (memberId: string, days = 30) => fetchApi<any>(`/fitness/checkin/member/${memberId}?days=${days}`),
  },
};
