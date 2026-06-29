import type { ApiClient } from '../client';

export const authApi = (c: ApiClient) => ({
  login: (email: string, password: string) =>
    c.post('/api/auth/login', { email, password }),
  me: () => c.get('/api/auth/me'),
  refresh: () => c.post('/api/auth/refresh'),
  logout: () => c.post('/api/auth/logout'),
});
