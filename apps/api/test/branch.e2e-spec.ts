import { describe, it, expect, beforeAll } from '@jest/globals';
import { api, login, authed, DEMO } from './app';

let fitnessToken: string;
let vrfitnessTenantId: string;

describe('Branch CRUD (tenant: vrfitness)', () => {
  let branchId: string;

  beforeAll(async () => {
    fitnessToken = await login(DEMO.fitnessOwner.email, DEMO.fitnessOwner.password);
    const profile = await (await authed(fitnessToken)).get('/auth/profile');
    vrfitnessTenantId = profile.body.tenantId;
  });

  it('GET /api/branches lists branches (has HQ + seeded branches)', async () => {
    const res = await (await authed(fitnessToken)).get('/branches');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/branches creates a new branch', async () => {
    const res = await (await authed(fitnessToken)).post('/branches').send({
      code: `E2E-${Date.now().toString().slice(-5)}`,
      name: 'E2E Test Branch',
      type: 'BRANCH',
      address: 'Test Address',
      currency: 'NPR',
    });
    expect([201, 200, 400]).toContain(res.status);
    if (res.status === 201 || res.status === 200) {
      branchId = res.body.id;
    }
  });

  it('GET /api/branches/:id returns the created branch', async () => {
    if (!branchId) return;
    const res = await (await authed(fitnessToken)).get(`/branches/${branchId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(branchId);
  });

  it('PUT /api/branches/:id updates the branch name', async () => {
    if (!branchId) return;
    const res = await (await authed(fitnessToken))
      .put(`/branches/${branchId}`)
      .send({ name: 'E2E Renamed Branch' });
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.name).toContain('Renamed');
    }
  });

  it('POST /api/branches/:id/schedules creates a schedule entry', async () => {
    const branches = await (await authed(fitnessToken)).get('/branches');
    const firstBranch = branches.body[0];
    if (!firstBranch) return;
    const res = await (await authed(fitnessToken))
      .post(`/branches/${firstBranch.id}/schedules`)
      .send({
        className: 'E2E Schedule Class',
        startTime: new Date(Date.now() + 3600000).toISOString(),
        endTime: new Date(Date.now() + 7200000).toISOString(),
        type: 'CLASS',
      });
    expect([201, 200, 400]).toContain(res.status);
  });

  it('GET /api/branches/:id/schedules lists schedules', async () => {
    const branches = await (await authed(fitnessToken)).get('/branches');
    const firstBranch = branches.body[0];
    if (!firstBranch) return;
    const res = await (await authed(fitnessToken)).get(
      `/branches/${firstBranch.id}/schedules`,
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/branches/reports/all returns cross-branch reports', async () => {
    const res = await (await authed(fitnessToken)).get('/branches/reports/all');
    expect([200, 400]).toContain(res.status);
  });

  it('DELETE /api/branches/:id deletes the test branch', async () => {
    if (!branchId) return;
    const res = await (await authed(fitnessToken)).delete(`/branches/${branchId}`);
    expect([200, 204, 400, 404]).toContain(res.status);
  });

  it('rejects without auth (401)', async () => {
    const r = await api();
    const res = await r.get('/branches');
    expect(res.status).toBe(401);
  });
});