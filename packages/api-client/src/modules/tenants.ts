import type { ApiClient } from '../client';

export const tenantsApi = (c: ApiClient) => ({
  checkSlug: (slug: string) =>
    c.get<{ available: boolean; reason?: string }>(
      `/api/tenants/check-slug?slug=${encodeURIComponent(slug)}`,
    ),
  create: (input: { slug: string; name: string; domainType: string }) =>
    c.post('/api/tenants', input),
  lifecycle: (id: string) => c.get(`/api/tenants/${id}/lifecycle`),
  suspend: (id: string, reason: string) =>
    c.post(`/api/tenants/${id}/lifecycle/suspend`, { reason }),
  reactivate: (id: string) => c.post(`/api/tenants/${id}/lifecycle/reactivate`),
  archive: (id: string) => c.post(`/api/tenants/${id}/lifecycle/archive`),
  delete: (id: string) => c.post(`/api/tenants/${id}/lifecycle/delete`),
  cancelDelete: (id: string) => c.post(`/api/tenants/${id}/lifecycle/cancel-delete`),
  requestDomain: (id: string, domain: string) =>
    c.post(`/api/tenants/${id}/domain/request`, { domain }),
  verifyDomain: (id: string) => c.post(`/api/tenants/${id}/domain/verify`),
  domainStatus: (id: string) => c.get(`/api/tenants/${id}/domain/status`),
});
