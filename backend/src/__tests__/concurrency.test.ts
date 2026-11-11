import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { AuthService } from '../services/auth.service.js';
import prisma from '../db/prisma.js';

describe('Concurrency & Race Condition Protection (FR-7, FR-9, SR-3)', () => {
  let userToken: string;
  let accountId: string;

  beforeAll(async () => {
    // Seed account with exactly $150
    const res = await AuthService.register({
      email: `concur-test-${Date.now()}@ledgerline.internal`,
      password: 'Password123!',
      fullName: 'Concurrency Tester',
      initialDeposit: 150,
    });
    userToken = res.token;
    accountId = res.account!.id;
  });

  it('handles 10 simultaneous concurrent withdrawals of $100 from a $150 balance without overdrawing', async () => {
    const concurrentCount = 10;
    const withdrawalAmount = 100;

    // Fire 10 simultaneous requests with distinct idempotency keys
    const requests = Array.from({ length: concurrentCount }, (_, i) =>
      request(app)
        .post('/api/transactions/withdraw')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', `race-with-${i}-${Date.now()}`)
        .send({ accountId, amount: withdrawalAmount })
    );

    const responses = await Promise.all(requests);

    const successful = responses.filter((r) => r.status === 200);
    const failedInsufficientFunds = responses.filter(
      (r) => r.status === 422 && r.body.error?.code === 'INSUFFICIENT_FUNDS'
    );

    // Exactly 1 must succeed because 150 - 100 = 50 (cannot afford a 2nd withdrawal of 100)
    expect(successful.length).toBe(1);
    expect(failedInsufficientFunds.length).toBe(9);

    // Verify database balance is non-negative and strictly $50
    const finalAccount = await prisma.account.findUniqueOrThrow({
      where: { id: accountId },
    });
    expect(Number(finalAccount.balance)).toBe(50.0);
    expect(Number(finalAccount.balance)).toBeGreaterThanOrEqual(0);
  });
});

