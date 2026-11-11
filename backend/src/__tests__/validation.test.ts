import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { AuthService } from '../services/auth.service.js';

describe('Validation & Client Trust Tests (SR-2)', () => {
  let userToken: string;
  let accountId: string;

  beforeAll(async () => {
    // Register test user
    const res = await AuthService.register({
      email: `val-test-${Date.now()}@ledgerline.internal`,
      password: 'Password123!',
      fullName: 'Validation Tester',
      initialDeposit: 500,
    });
    userToken = res.token;
    accountId = res.account!.id;
  });

  it('rejects negative deposit amount', async () => {
    const res = await request(app)
      .post('/api/transactions/deposit')
      .set('Authorization', `Bearer ${userToken}`)
      .set('Idempotency-Key', `neg-dep-${Date.now()}`)
      .send({
        accountId,
        amount: -50,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects zero deposit amount', async () => {
    const res = await request(app)
      .post('/api/transactions/deposit')
      .set('Authorization', `Bearer ${userToken}`)
      .set('Idempotency-Key', `zero-dep-${Date.now()}`)
      .send({
        accountId,
        amount: 0,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects non-numeric string amount', async () => {
    const res = await request(app)
      .post('/api/transactions/withdraw')
      .set('Authorization', `Bearer ${userToken}`)
      .set('Idempotency-Key', `str-with-${Date.now()}`)
      .send({
        accountId,
        amount: 'fifty-dollars',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects fractional amounts with more than 2 decimal places (sub-cent attack)', async () => {
    const res = await request(app)
      .post('/api/transactions/withdraw')
      .set('Authorization', `Bearer ${userToken}`)
      .set('Idempotency-Key', `subcent-${Date.now()}`)
      .send({
        accountId,
        amount: 10.005,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects transaction without Idempotency-Key header', async () => {
    const res = await request(app)
      .post('/api/transactions/withdraw')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        accountId,
        amount: 50,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_IDEMPOTENCY_KEY');
  });
});

