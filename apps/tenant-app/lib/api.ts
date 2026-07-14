const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '');
const API_BASE = `${API_HOST}/api`;

/** The tenant this app instance serves. Resolved dynamically from the host so a
 * single deployed instance serves any business (multi-tenant SaaS):
 *   - authoritative: the `dexo_tenant` cookie set by middleware.ts from the Host
 *   - fallback: parse window.location.hostname (handles `*.localhost` in dev and
 *     `sub.domain.tld` in prod)
 *   - last resort: NEXT_PUBLIC_DEV_TENANT env, otherwise unresolved. */
const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'api', 'admin', 'localhost', 'dexo']);
// Tunnel hosts (ngrok etc.) — their random first label is never a tenant slug.
const TUNNEL_SUFFIXES = ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.ngrok.io', '.ngrok.dev', '.trycloudflare.com', '.loca.lt'];

export function resolveSubdomain(): string {
  if (typeof document !== 'undefined') {
    const m = document.cookie.match(/(?:^|;\s*)dexo_tenant=([^;]+)/);
    if (m) return decodeURIComponent(m[1]);
  }
  if (typeof window !== 'undefined' && !TUNNEL_SUFFIXES.some((s) => window.location.hostname.toLowerCase().endsWith(s))) {
    const hostname = window.location.hostname.toLowerCase();
    const parts = hostname.split('.');
    if (hostname.endsWith('.localhost') && parts.length >= 2 && !RESERVED_SUBDOMAINS.has(parts[0])) {
      return parts[0];
    }
    if (parts.length >= 3 && !RESERVED_SUBDOMAINS.has(parts[0])) {
      return parts[0];
    }
  }
  return process.env.NEXT_PUBLIC_DEV_TENANT || '';
}

const TOKEN_KEY = 'dexo_token';
export const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export interface ApiResult<T> { data?: T; error?: string }

async function api<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  const token = getToken();
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { error: body.message || `HTTP ${res.status}` };
    }
    if (res.status === 204) return { data: undefined as T };
    return { data: await res.json() };
  } catch (e: any) {
    return { error: e?.message || 'Network error' };
  }
}

export const authApi = {
  login: (email: string, password: string) =>
    api<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, subdomain: resolveSubdomain() }),
    }),
  register: async (data: { email: string; password: string; firstName: string; lastName: string; phone?: string }) => {
    // Resolve tenantId from the subdomain, then register as a MEMBER.
    const slug = resolveSubdomain();
    const t = await api<any>(`/tenants/subdomain/${slug}`);
    if (!t.data?.id) {
      // Surface WHY: API unreachable vs unknown tenant slug (e.g. a stale
      // dexo_tenant cookie pinned to a deleted tenant).
      return {
        error: t.error
          ? `Could not reach the server (${t.error}) — please try again`
          : `Business "${slug}" not found — open this app with ?tenant=<your-gym> or check the gym's link`,
      } as ApiResult<any>;
    }
    return api<{ accessToken: string; refreshToken: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...data, tenantId: t.data.id, signupAs: 'MEMBER' }),
    });
  },
  profile: () => api<any>('/auth/profile'),
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string; avatarUrl?: string }) =>
    api<any>('/users/profile', { method: 'PUT', body: JSON.stringify(data) }),
};

const qs = (params?: Record<string, any>) => {
  if (!params) return '';
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v != null && p.append(k, String(v)));
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const publicApi = {
  info: () => api<any>(`/fitness/public/${resolveSubdomain()}/info`),
  plans: () => api<any[]>(`/fitness/public/${resolveSubdomain()}/plans`),
};

export const paymentsApi = {
  /** Gateways the gym has configured (eSewa, Khalti, Stripe, …). */
  providers: () => api<any>('/payment-gateway/tenant/providers'),
  init: (data: {
    providerType: string; orderId: string; amount: number; description?: string;
    customerEmail?: string; customerName?: string;
    successUrl: string; failureUrl: string; cancelUrl?: string;
  }) => api<any>('/payment-gateway/init', { method: 'POST', body: JSON.stringify(data) }),
  verify: (data: { providerType: string; providerTxnId: string; orderId: string; amount?: number; rawParams?: any }) =>
    api<any>('/payment-gateway/verify', { method: 'POST', body: JSON.stringify(data) }),
};

export const fitnessApi = {
  me: () => api<any>('/fitness/members/me'),
  updateMe: (data: any) => api<any>('/fitness/members/me', { method: 'PUT', body: JSON.stringify(data) }),
  plans: () => api<any>('/fitness/membership-plans?active=true'),
  memberships: {
    list: (memberId: string) => api<any>(`/fitness/memberships${qs({ memberId })}`),
    get: (id: string) => api<any>(`/fitness/memberships/${id}`),
    create: (memberId: string, planId: string) => api<any>('/fitness/memberships', { method: 'POST', body: JSON.stringify({ memberId, planId }) }),
    activate: (id: string, paymentRef: string, paymentMethod: string) =>
      api<any>(`/fitness/memberships/${id}/activate-payment`, { method: 'POST', body: JSON.stringify({ paymentRef, paymentMethod }) }),
    renew: (id: string) => api<any>(`/fitness/memberships/${id}/renew`, { method: 'POST' }),
    freeze: (id: string, days: number, reason: string) => api<any>(`/fitness/memberships/${id}/freeze`, { method: 'POST', body: JSON.stringify({ days, reason }) }),
    unfreeze: (id: string) => api<any>(`/fitness/memberships/${id}/unfreeze`, { method: 'POST' }),
  },
  workoutPlans: (memberId: string) => api<any>(`/fitness/workout-plans${qs({ memberId })}`),
  workoutLogs: {
    list: (memberId: string) => api<any>(`/fitness/workout-logs${qs({ memberId })}`),
    stats: (memberId: string) => api<any>(`/fitness/workout-logs/stats/${memberId}`),
    create: (data: any) => api<any>('/fitness/workout-logs', { method: 'POST', body: JSON.stringify(data) }),
  },
  assessments: {
    progress: (memberId: string) => api<any>(`/fitness/assessments/progress/${memberId}`),
  },
  badges: {
    all: () => api<any>('/fitness/badges'),
    memberBadges: (memberId: string) => api<any>(`/fitness/customer-badges/member/${memberId}`),
  },
  trainers: () => api<any>('/fitness/trainers'),
  coach: {
    messages: (memberId: string) => api<any>(`/fitness/trainer-messages/member/${memberId}`),
    thread: (memberId: string, trainerId: string) => api<any>(`/fitness/trainer-messages/thread${qs({ memberId, trainerId })}`),
    send: (data: { memberId: string; trainerId?: string; senderType: string; message: string }) =>
      api<any>('/fitness/trainer-messages', { method: 'POST', body: JSON.stringify(data) }),
    markThreadRead: (memberId: string, trainerId: string) =>
      api<any>('/fitness/trainer-messages/thread/read', { method: 'POST', body: JSON.stringify({ memberId, trainerId }) }),
  },
  referrals: {
    mine: (memberId: string) => api<any>(`/fitness/referrals${qs({ referrerId: memberId })}`),
    create: (data: { referrerId: string; refereeEmail?: string; refereePhone?: string }) =>
      api<any>('/fitness/referrals', { method: 'POST', body: JSON.stringify(data) }),
    stats: (memberId: string) => api<any>(`/fitness/referrals/stats/${memberId}`),
  },
  checkin: {
    qr: (qrCode: string, branchId?: string) => api<any>('/fitness/checkin/qr', { method: 'POST', body: JSON.stringify({ qrCode, branchId }) }),
    history: (memberId: string, days = 30) => api<any>(`/fitness/checkin/member/${memberId}?days=${days}`),
  },
  /** My attendance across all sources — QR, manual and biometric device punches. */
  myAttendance: (days = 60) => api<any>(`/attendance-logs/me?days=${days}`),
  foodLogs: {
    summary: (memberId: string, date?: string) => api<any>(`/fitness/food-logs/summary/${memberId}${qs({ date })}`),
    create: (data: any) => api<any>('/fitness/food-logs', { method: 'POST', body: JSON.stringify(data) }),
  },
  nepaliFoods: (search?: string) => api<any>(`/fitness/nepali-foods${qs({ search })}`),
  classes: () => api<any>('/fitness/classes'),
  bookClass: (data: any) => api<any>('/fitness/bookings', { method: 'POST', body: JSON.stringify(data) }),
};

/** Generic (all-vertical) payment history for the logged-in customer —
 * not fitness-specific like fitnessApi above. */
export const paymentApi = {
  myTransactions: (limit = 50) => api<any[]>(`/payment-gateway/transactions/me?limit=${limit}`),
};

export interface Announcement {
  title: string;
  message: string;
  audience?: string;
  sentAt: string;
  recipients?: number;
}

/** Tenant-scoped (from JWT) announcements broadcast by staff — any authenticated user. */
export const notificationsApi = {
  announcements: () => api<Announcement[]>('/notifications/announcements'),
};

/** Public "message to the gym" form — no auth required, tenant resolved via subdomain. */
export const contactApi = {
  send: (data: { name: string; email: string; phone?: string; subject?: string; message: string; source?: string }) =>
    api<{ success: boolean; message: string; id: string }>('/contact', {
      method: 'POST',
      body: JSON.stringify({ ...data, subdomain: resolveSubdomain() }),
    }),
};
