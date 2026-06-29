export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => string | null;
  tenantSlug?: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  requestId?: string;
  tenantId?: string;
}

export class ApiClient {
  private baseUrl: string;
  private getToken: () => string | null;
  private tenantSlug?: string;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.getToken = config.getToken ?? (() => null);
    this.tenantSlug = config.tenantSlug;
  }

  setTenantSlug(slug: string | undefined): void {
    this.tenantSlug = slug;
  }

  async request<T = unknown>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const headers = new Headers(init.headers);
    const token = this.getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (this.tenantSlug) headers.set('X-Dev-Tenant', this.tenantSlug);
    headers.set('Content-Type', 'application/json');

    const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as ApiError;
      throw Object.assign(new Error(err.message || res.statusText), { ...err, status: res.status });
    }
    return (await res.json()) as T;
  }

  get<T = unknown>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }
  post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
  }
  put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
  }
  delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}
