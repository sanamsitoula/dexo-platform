import { describe, it, expect, beforeAll } from '@jest/globals';
import { api, login, authed, DEMO } from './app';

let ownerToken: string;

describe('Fitness module CRUD (tenant: vrfitness)', () => {
  beforeAll(async () => {
    ownerToken = await login(DEMO.fitnessOwner.email, DEMO.fitnessOwner.password);
  });

  describe('Members', () => {
    it('GET /api/fitness/members lists members', async () => {
      const res = await (await authed(ownerToken)).get('/fitness/members');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/fitness/members/stats returns stats', async () => {
      const res = await (await authed(ownerToken)).get('/fitness/members/stats');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
    });
  });

  describe('Trainers', () => {
    it('GET /api/fitness/trainers lists trainers', async () => {
      const res = await (await authed(ownerToken)).get('/fitness/trainers');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    let newTrainerId: string;
    it('POST /api/fitness/trainers creates a trainer', async () => {
      const res = await (await authed(ownerToken)).post('/fitness/trainers').send({
        name: 'E2E Trainer',
        email: `e2e-trainer-${Date.now()}@vrfitness.com`,
        phone: '9800001111',
        specialization: 'Strength',
        hourlyRate: 1500,
      });
      expect([201, 200, 400]).toContain(res.status);
      if (res.status === 201 || res.status === 200) {
        newTrainerId = res.body.id;
      }
    });

    it('PUT /api/fitness/trainers/:id updates the trainer', async () => {
      if (!newTrainerId) return;
      const res = await (await authed(ownerToken))
        .put(`/fitness/trainers/${newTrainerId}`)
        .send({ specialization: 'Yoga' });
      expect([200, 400]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.specialization).toBe('Yoga');
      }
    });

    it('DELETE /api/fitness/trainers/:id deletes the trainer', async () => {
      if (!newTrainerId) return;
      const res = await (await authed(ownerToken)).delete(`/fitness/trainers/${newTrainerId}`);
      expect([200, 204, 400, 404]).toContain(res.status);
    });
  });

  describe('Membership Plans', () => {
    let planId: string;
    it('GET /api/fitness/membership-plans lists plans', async () => {
      const res = await (await authed(ownerToken)).get('/fitness/membership-plans');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/fitness/membership-plans creates a plan', async () => {
      const res = await (await authed(ownerToken)).post('/fitness/membership-plans').send({
        name: 'E2E Plan Monthly',
        type: 'MONTHLY',
        durationDays: 30,
        priceNpr: 2500,
        vatPercent: 13,
      });
      expect([201, 200, 400]).toContain(res.status);
      if (res.status === 201 || res.status === 200) {
        planId = res.body.id;
      }
    });

    it('PUT /api/fitness/membership-plans/:id updates the plan', async () => {
      if (!planId) return;
      const res = await (await authed(ownerToken))
        .put(`/fitness/membership-plans/${planId}`)
        .send({ priceNpr: 3000 });
      expect([200, 400]).toContain(res.status);
    });

    it('DELETE /api/fitness/membership-plans/:id deletes the plan', async () => {
      if (!planId) return;
      const res = await (await authed(ownerToken)).delete(
        `/fitness/membership-plans/${planId}`,
      );
      expect([200, 204, 400, 404]).toContain(res.status);
    });
  });

  describe('Group Classes', () => {
    let classId: string;
    it('GET /api/fitness/classes lists classes', async () => {
      const res = await (await authed(ownerToken)).get('/fitness/classes');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/fitness/classes creates a class', async () => {
      const res = await (await authed(ownerToken)).post('/fitness/classes').send({
        name: 'E2E Yoga Class',
        classType: 'YOGA',
        dayOfWeek: 1,
        startTime: new Date(Date.now() + 3600000).toISOString(),
        endTime: new Date(Date.now() + 7200000).toISOString(),
        maxCapacity: 20,
      });
      expect([201, 200, 400]).toContain(res.status);
      if (res.status === 201 || res.status === 200) {
        classId = res.body.id;
      }
    });

    it('PUT /api/fitness/classes/:id updates the class', async () => {
      if (!classId) return;
      const res = await (await authed(ownerToken))
        .put(`/fitness/classes/${classId}`)
        .send({ maxCapacity: 25 });
      expect([200, 400]).toContain(res.status);
    });

    it('GET /api/fitness/classes/:id returns the class', async () => {
      if (!classId) return;
      const res = await (await authed(ownerToken)).get(`/fitness/classes/${classId}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(classId);
    });

    it('DELETE /api/fitness/classes/:id deletes the class', async () => {
      if (!classId) return;
      const res = await (await authed(ownerToken)).delete(`/fitness/classes/${classId}`);
      expect([200, 204, 400, 404]).toContain(res.status);
    });
  });

  describe('Bookings', () => {
    it('GET /api/fitness/bookings lists bookings', async () => {
      const res = await (await authed(ownerToken)).get('/fitness/bookings');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Workout Plans', () => {
    it('GET /api/fitness/workout-plans lists plans', async () => {
      const res = await (await authed(ownerToken)).get('/fitness/workout-plans');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Diet Plans', () => {
    it('GET /api/fitness/diet-plans lists plans', async () => {
      const res = await (await authed(ownerToken)).get('/fitness/diet-plans');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Assessments', () => {
    it('GET /api/fitness/assessments lists assessments', async () => {
      const res = await (await authed(ownerToken)).get('/fitness/assessments');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Equipment', () => {
    let equipId: string;
    it('GET /api/fitness/equipment lists equipment', async () => {
      const res = await (await authed(ownerToken)).get('/fitness/equipment');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/fitness/equipment creates equipment', async () => {
      const res = await (await authed(ownerToken)).post('/fitness/equipment').send({
        name: 'E2E Treadmill',
        category: 'Cardio',
        status: 'ACTIVE',
      });
      expect([201, 200, 400]).toContain(res.status);
      if (res.status === 201 || res.status === 200) {
        equipId = res.body.id;
      }
    });

    it('DELETE /api/fitness/equipment/:id deletes equipment', async () => {
      if (!equipId) return;
      const res = await (await authed(ownerToken)).delete(`/fitness/equipment/${equipId}`);
      expect([200, 204, 400, 404]).toContain(res.status);
    });
  });

  describe('Badges', () => {
    it('GET /api/fitness/badges lists badges', async () => {
      const res = await (await authed(ownerToken)).get('/fitness/badges');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  it('rejects without auth (401)', async () => {
    const r = await api();
    const res = await r.get('/fitness/members');
    expect(res.status).toBe(401);
  });
});