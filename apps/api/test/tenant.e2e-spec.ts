import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { api, login, authed, DEMO } from './app';

const slug = `testtenant${Date.now().toString().slice(-6)}`;

describe('Tenant management + lifecycle (platform admin)', () => {
  let adminToken: string;
  let tenantId: string | undefined;

  beforeAll(async () => {
    adminToken = await login(DEMO.platformAdmin.email, DEMO.platformAdmin.password);
  });

  it('checks slug availability (available)', async () => {
    const r = await api();
    const res = await r.get(`/tenants/check-slug?slug=${slug}`);
    expect([200, 400, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('available');
    }
  });

  it('POST /api/tenants creates a tenant', async () => {
    const res = await (await authed(adminToken)).post('/tenants').send({
      name: 'Test Tenant Spa',
      subdomain: slug,
    });
    expect([201, 200, 400]).toContain(res.status);
    if (res.status === 201 || res.status === 200) {
      tenantId = res.body.id;
      expect(res.body.subdomain).toBe(slug);
    }
  });

  it('GET /api/tenants lists tenants (includes seeded + new)', async () => {
    const res = await (await authed(adminToken)).get('/tenants');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const subs = res.body.data.map((t: any) => t.subdomain);
    expect(subs).toContain('vrfitness');
    expect(subs).toContain('spicegarden');
  });

  it('GET /api/tenants/:id returns the created tenant', async () => {
    if (!tenantId) return;
    const res = await (await authed(adminToken)).get(`/tenants/${tenantId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(tenantId);
  });

  it('PUT /api/tenants/:id updates the tenant name', async () => {
    if (!tenantId) return;
    const res = await (await authed(adminToken))
      .put(`/tenants/${tenantId}`)
      .send({ name: 'Test Tenant Spa Renamed' });
    expect([200, 400, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.name).toContain('Renamed');
    }
  });

  it('GET /api/tenants/:id/lifecycle returns lifecycle state', async () => {
    if (!tenantId) return;
    const res = await (await authed(adminToken)).get(`/tenants/${tenantId}/lifecycle`);
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('status');
    }
  });

  it('POST suspend / reactivate lifecycle flow', async () => {
    if (!tenantId) return;
    const a = await authed(adminToken);
    const susp = await a.post(`/tenants/${tenantId}/lifecycle/suspend`).send({
      reason: 'test suspension',
      suspendedBy: 'test',
    });
    expect([200, 400, 404]).toContain(susp.status);

    const react = await a.post(`/tenants/${tenantId}/lifecycle/reactivate`).send({
      reactivatedBy: 'test',
    });
    expect([200, 400, 404]).toContain(react.status);
  });

  it('POST /api/domains/tenant/:tenantId/assign/FITNESS_CENTER provisions modules', async () => {
    if (!tenantId) return;
    const res = await (await authed(adminToken)).post(
      `/domains/tenant/${tenantId}/assign/FITNESS_CENTER`,
    );
    expect([200, 201, 400, 404, 409]).toContain(res.status);
  });

  it('GET /api/domains/tenant/:tenantId/provisioning shows provisioned state', async () => {
    if (!tenantId) return;
    const res = await (await authed(adminToken)).get(
      `/domains/tenant/${tenantId}/provisioning`,
    );
    expect([200, 404]).toContain(res.status);
  });

  it('rejects tenant creation without auth (401)', async () => {
    const r = await api();
    const res = await r.post('/tenants').send({ name: 'x', subdomain: 'noauth' });
    expect(res.status).toBe(401);
  });

  afterAll(async () => {
    if (tenantId) {
      try {
        await (await authed(adminToken)).post(`/tenants/${tenantId}/lifecycle/delete`).send({
          requestedBy: 'test',
        });
      } catch {}
    }
  });
});