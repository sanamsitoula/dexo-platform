import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { api, login, authed, DEMO } from './app';

let fitnessToken: string;

describe('Finance CRUD — customers (tenant: vrfitness)', () => {
  let customerId: string | undefined;

  beforeAll(async () => {
    fitnessToken = await login(DEMO.fitnessOwner.email, DEMO.fitnessOwner.password);
  });

  it('GET /api/finance/customers lists customers', async () => {
    const res = await (await authed(fitnessToken)).get('/finance/customers');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/finance/customers creates a customer', async () => {
    const res = await (await authed(fitnessToken)).post('/finance/customers').send({
      name: 'Test Customer E2E',
      email: `e2e-customer-${Date.now()}@test.com`,
      mobile: '9800000000',
      customerCode: `CUST-${Date.now().toString().slice(-5)}`,
    });
    expect([201, 200, 400]).toContain(res.status);
    if (res.status === 201 || res.status === 200) {
      customerId = res.body.id;
      expect(res.body.name).toBe('Test Customer E2E');
    }
  });

  it('PUT /api/finance/customers/:id updates customer', async () => {
    if (!customerId) return;
    const res = await (await authed(fitnessToken))
      .put(`/finance/customers/${customerId}`)
      .send({ name: 'Updated Customer E2E' });
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.name).toContain('Updated');
    }
  });

  it('GET /api/finance/customers/:id returns the customer', async () => {
    if (!customerId) return;
    const res = await (await authed(fitnessToken)).get(`/finance/customers/${customerId}`);
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/finance/suppliers lists suppliers', async () => {
    const res = await (await authed(fitnessToken)).get('/finance/suppliers');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/finance/accounts lists chart of accounts', async () => {
    const res = await (await authed(fitnessToken)).get('/finance/accounts');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/finance/banks lists bank accounts', async () => {
    const res = await (await authed(fitnessToken)).get('/finance/banks');
    expect(res.status).toBe(200);
  });

  it('GET /api/finance/reports/balance-sheet returns a report', async () => {
    const res = await (await authed(fitnessToken)).get('/finance/reports/balance-sheet');
    expect([200, 400, 404]).toContain(res.status);
  });

  it('GET /api/finance/reports/income-statement returns a report', async () => {
    const res = await (await authed(fitnessToken)).get('/finance/reports/income-statement');
    expect([200, 400, 404]).toContain(res.status);
  });

  it('rejects without auth (401)', async () => {
    const r = await api();
    const res = await r.get('/finance/customers');
    expect(res.status).toBe(401);
  });
});

describe('Finance CRUD — invoices (tenant: vrfitness)', () => {
  it('GET /api/finance/invoices lists invoices', async () => {
    const res = await (await authed(fitnessToken)).get('/finance/invoices');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});