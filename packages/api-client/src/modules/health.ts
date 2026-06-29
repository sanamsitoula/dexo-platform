import type { ApiClient } from '../client';

export const healthApi = (c: ApiClient) => ({
  check: () =>
    c.get<{ status: string; db: string; redis: string; minio: string; timestamp: string }>(
      '/api/health',
    ),
});
