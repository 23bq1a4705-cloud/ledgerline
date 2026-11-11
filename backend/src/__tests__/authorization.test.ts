import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { AuthService } from '../services/auth.service.js';
import prisma from '../db/prisma.js';

describe('Authorisation & Least Privilege Tests (SR-1, SR-4)', () => {
  let userAToken: string;
  let userBToken: string;
  let auditorToken: string;
  let accountAId: string;
  let accountBId: string;

  beforeAll(async () => {
    // User A
    const resA = await AuthService.register({
      email: `user-a-${Date.now()}@ledgerline.internal`,
      password: 'Password123!',
      fullName: 'Alice Test',
      initialDeposit: 1000,
    });
    userAToken = resA.token;
    accountAId = resA.account!.id;

    // User B
    const resB = await AuthService.register({
      email: `user-b-${Date.now()}@ledgerline.internal`,
      password: 'Password123!',
      fullName: 'Bob Test',
      initialDeposit: 500,
    });
    userBToken = resB.token;
    accountBId = resB.account!.id;

    // Auditor
    const resAud = await AuthService.register({
      email: `auditor-${Date.now()}@ledgerline.internal`,
      password: 'Password123!',
      fullName: 'Auditor Test',
      role: 'AUDITOR',
    });
    auditorToken = resAud.token;
  });

  it('prevents User A from withdrawing from User B account (SR-1)', async () => {
    const res = await request(app)
      .post('/api/transactions/withdraw')
      .set('Authorization', `Bearer ${userAToken}`)
      .set('Idempotency-Key', `theft-attempt-${Date.now()}`)
      .send({
        accountId: accountBId,
        amount: 100,
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('prevents User A from viewing User B statement (SR-1)', async () => {
    const res = await request(app)
      .get(`/api/accounts/${accountBId}/statement`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('allows Auditor to view User B statement but rejects Auditor write attempts', async () => {
    // Auditor can read
    const readRes = await request(app)
      .get(`/api/accounts/${accountBId}/statement`)
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(readRes.status).toBe(200);
    expect(readRes.body.data.account.id).toBe(accountBId);

    // Auditor cannot withdraw (write)
    const writeRes = await request(app)
      .post('/api/transactions/withdraw')
      .set('Authorization', `Bearer ${auditorToken}`)
      .set('Idempotency-Key', `auditor-write-${Date.now()}`)
      .send({
        accountId: accountBId,
        amount: 50,
      });

    expect(writeRes.status).toBe(403);
  });

  it('enforces append-only ledger entries and rejects any update or delete (SR-4)', async () => {
    // Attempting to update a ledger entry directly via Prisma
    await expect(
      prisma.ledgerEntry.update({
        where: { id: 'any-id' },
        data: { amount: 9999 } as any,
      })
    ).rejects.toThrow('SECURITY VIOLATION: Ledger entries are append-only');

    // Attempting to delete a ledger entry directly via Prisma
    await expect(
      prisma.ledgerEntry.delete({
        where: { id: 'any-id' },
      })
    ).rejects.toThrow('SECURITY VIOLATION: Ledger entries are append-only');
  });
});

