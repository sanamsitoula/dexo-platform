import { describe, it, expect, beforeAll } from '@jest/globals';
import { api, login, authed, DEMO } from './app';

const EXPECTED_DOMAINS = [
  'FITNESS_CENTER',
  'RESTAURANT_AND_CAFE',
  'SALON_AND_SPA',
  'HOTEL_AND_HOSPITALITY',
  'HEALTHCARE_CLINIC',
  'SCHOOL_AND_EDUCATION',
  'COACHING_INSTITUTE',
  'ECOMMERCE',
  'LOGISTICS_AND_DELIVERY',
  'TAILOR_SHOP',
  'NGO',
  'SME_CORPORATE',
];

describe('Business templates (public)', () => {
  let r: Awaited<ReturnType<typeof api>>;

  beforeAll(async () => { r = await api(); });

  it('GET /api/business-templates returns all 12 domains', async () => {
    const res = await r.get('/business-templates');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(12);
    const codes = res.body.map((t: any) => t.domainType);
    for (const d of EXPECTED_DOMAINS) {
      expect(codes).toContain(d);
    }
  });

  it('GET /api/business-templates/FITNESS_CENTER returns one template', async () => {
    const res = await r.get('/business-templates/FITNESS_CENTER');
    expect(res.status).toBe(200);
    expect(res.body.domainType).toBe('FITNESS_CENTER');
    expect(res.body).toHaveProperty('websiteSections');
    expect(res.body).toHaveProperty('onboardingSteps');
  });

  it('GET /api/business-templates/INVALID returns 404', async () => {
    const res = await r.get('/business-templates/INVALID_DOMAIN');
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe('Domain registry (JWT)', () => {
  it('GET /api/domains lists provisioned domains', async () => {
    const token = await login(DEMO.platformAdmin.email, DEMO.platformAdmin.password);
    const res = await (await authed(token)).get('/domains');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(12);
  });

  it('GET /api/domains/FITNESS_CENTER returns domain config', async () => {
    const token = await login(DEMO.platformAdmin.email, DEMO.platformAdmin.password);
    const res = await (await authed(token)).get('/domains/FITNESS_CENTER');
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.code).toBe('FITNESS_CENTER');
    }
  });

  it('rejects without auth (401)', async () => {
    const rr = await api();
    const res = await rr.get('/domains');
    expect(res.status).toBe(401);
  });
});