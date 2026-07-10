import { describe, it, expect, beforeAll } from '@jest/globals';
import { api, login, authed, DEMO } from './app';

describe('Auth module', () => {
  let r: Awaited<ReturnType<typeof api>>;

  beforeAll(async () => { r = await api(); });

  describe('POST /api/auth/login', () => {
    it('logs in platform admin with valid creds', async () => {
      const res = await r.post('/auth/login').send({
        email: DEMO.platformAdmin.email,
        password: DEMO.platformAdmin.password,
      });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.refreshToken).toBeTruthy();
      expect(res.body.user.isPlatformAdmin).toBe(true);
    });

    it('logs in tenant owner', async () => {
      const res = await r.post('/auth/login').send({
        email: DEMO.fitnessOwner.email,
        password: DEMO.fitnessOwner.password,
      });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.user.isPlatformAdmin).toBe(false);
    });

    it('rejects wrong password (401)', async () => {
      const res = await r.post('/auth/login').send({
        email: DEMO.platformAdmin.email,
        password: 'wrongpassword',
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('rejects unknown email (400/401)', async () => {
      const res = await r.post('/auth/login').send({
        email: 'nonexistent@nowhere.com',
        password: 'whatever',
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('validates body schema (missing password -> 400)', async () => {
      const res = await r.post('/auth/login').send({ email: 'a@b.com' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/profile (JWT)', () => {
    it('returns profile for valid token', async () => {
      const token = await login(DEMO.platformAdmin.email, DEMO.platformAdmin.password);
      const res = await (await authed(token)).get('/auth/profile');
      expect(res.status).toBe(200);
      expect(res.body.email).toBe(DEMO.platformAdmin.email);
    });

    it('rejects missing token (401)', async () => {
      const res = await r.get('/auth/profile');
      expect(res.status).toBe(401);
    });
  });
});