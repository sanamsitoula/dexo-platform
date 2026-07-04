const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '');
const API_BASE = `${API_HOST}/api`;

/** The tenant this app instance serves. In dev it's vrfitness; in prod it's the
 * subdomain of the host. */
export function resolveSubdomain(): string {
  if (typeof window !== 'undefined') {
    const parts = window.location.hostname.split('.');
    if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'localhost') return parts[0];
  }
  return process.env.NEXT_PUBLIC_DEV_TENANT || 'vrfitness';
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
    const t = await api<any>(`/tenants/subdomain/${resolveSubdomain()}`);
    if (!t.data?.id) return { error: 'Could not resolve business' } as ApiResult<any>;
    return api<{ accessToken: string; refreshToken: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...data, tenantId: t.data.id, signupAs: 'MEMBER' }),
    });
  },
  profile: () => api<any>('/auth/profile'),
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

export const fitnessApi = {
  me: () => api<any>('/fitness/members/me'),
  updateMe: (data: any) => api<any>('/fitness/members/me', { method: 'PUT', body: JSON.stringify(data) }),
  plans: () => api<any>('/fitness/membership-plans?active=true'),
  memberships: {
    list: (memberId: string) => api<any>(`/fitness/memberships${qs({ memberId })}`),
    create: (memberId: string, planId: string) => api<any>('/fitness/memberships', { method: 'POST', body: JSON.stringify({ memberId, planId }) }),
    activate: (id: string, paymentRef: string, paymentMethod: string) =>
      api<any>(`/fitness/memberships/${id}/activate-payment`, { method: 'POST', body: JSON.stringify({ paymentRef, paymentMethod }) }),
  },
  workoutPlans: (memberId: string) => api<any>(`/fitness/workout-plans${qs({ memberId })}`),
  workoutLogs: {
    list: (memberId: string) => api<any>(`/fitness/workout-logs${qs({ memberId })}`),
    create: (data: any) => api<any>('/fitness/workout-logs', { method: 'POST', body: JSON.stringify(data) }),
  },
  foodLogs: {
    summary: (memberId: string, date?: string) => api<any>(`/fitness/food-logs/summary/${memberId}${qs({ date })}`),
    create: (data: any) => api<any>('/fitness/food-logs', { method: 'POST', body: JSON.stringify(data) }),
  },
  nepaliFoods: (search?: string) => api<any>(`/fitness/nepali-foods${qs({ search })}`),
  classes: () => api<any>('/fitness/classes'),
  bookClass: (data: any) => api<any>('/fitness/bookings', { method: 'POST', body: JSON.stringify(data) }),
};
