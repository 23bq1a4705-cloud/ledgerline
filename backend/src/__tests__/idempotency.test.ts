import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { AuthService } from '../services/auth.service.js';
import prisma from '../db/prisma.js';

describe('Idempotency Tests (FR-8, SR-3)', () => {
  let userToken: string;
  let accountId: string;

  beforeAll(async () => {
    const res = await AuthService.register({
      email: `idemp-test-${Date.now()}@ledgerline.internal`,
      password: 'Password123!',
      fullName: 'Idempotency Tester',
      initialDeposit: 1000,
    });
    userToken = res.token;
    accountId = res.account!.id;
  });

  it('deducts money once when same idempotency key is repeated 5 times', async () => {
    const key = `idemp-repeat-key-${Date.now()}`;

    // 1st request
    const res1 = await request(app)
      .post('/api/transactions/withdraw')
      .set('Authorization', `Bearer ${userToken}`)
      .set('Idempotency-Key', key)
      .send({ accountId, amount: 100 });

    expect(res1.status).toBe(200);
    expect(res1.headers['x-idempotent-replay']).toBeUndefined();
    const firstTxId = res1.body.data.transactionId;

    // Subsequent 4 repeated requests
    for (let i = 0; i < 4; i++) {
      const resRepeat = await request(app)
        .post('/api/transactions/withdraw')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', key)
        .send({ accountId, amount: 100 });

      expect(resRepeat.status).toBe(200);
      expect(resRepeat.headers['x-idempotent-replay']).toBe('true');
      expect(resRepeat.body.data.transactionId).toBe(firstTxId);
    }

    // Verify account balance is $900 ($1000 - $100 exactly once)
    const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });
    expect(Number(account.balance)).toBe(900);
  });

  it('rejects idempotency key reuse when payload differs (parameter tampering)', async () => {
    const key = `idemp-tamper-key-${Date.now()}`;

    // First request: withdraw 50
    await request(app)
      .post('/api/transactions/withdraw')
      .set('Authorization', `Bearer ${userToken}`)
      .set('Idempotency-Key', key)
      .send({ accountId, amount: 50 });

    // Second request: same key, but different amount 150
    const tamperRes = await request(app)
      .post('/api/transactions/withdraw')
      .set('Authorization', `Bearer ${userToken}`)
      .set('Idempotency-Key', key)
      .send({ accountId, amount: 150 });

    expect(tamperRes.status).toBe(409);
    expect(tamperRes.body.error.code).toBe('CONFLICT');
  });
});

