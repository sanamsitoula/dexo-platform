import { describe, it, expect, beforeAll } from '@jest/globals';
import { api } from './app';

describe('Health (GET /api/health)', () => {
  let r: Awaited<ReturnType<typeof api>>;

  beforeAll(async () => { r = await api(); });

  it('returns 200 with status ok', async () => {
    const res = await r.get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('reports db status', async () => {
    const res = await r.get('/health');
    expect(res.body).toHaveProperty('db');
    expect(['up', 'down']).toContain(res.body.db);
  });
});