import type { ApiClient } from '../client';

export const onboardingApi = (c: ApiClient) => ({
  getTenant: () => c.get('/api/onboarding/tenant'),
  saveTenantStep: (n: number, data: unknown) =>
    c.put(`/api/onboarding/tenant/step/${n}`, data),
  completeTenant: () => c.post('/api/onboarding/tenant/complete'),
  startCustomer: (input: { email: string; source: string }) =>
    c.post('/api/onboarding/customer/start', input),
  getCustomer: (id: string) => c.get(`/api/onboarding/customer/${id}`),
  saveCustomerStep: (id: string, n: number, data: unknown) =>
    c.put(`/api/onboarding/customer/${id}/step/${n}`, data),
  completeCustomer: (id: string) =>
    c.post(`/api/onboarding/customer/${id}/complete`),
});
