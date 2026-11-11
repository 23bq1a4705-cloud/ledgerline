import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { AuthService } from '../services/auth.service.js';
import { LedgerService } from '../services/ledger.service.js';

describe('Double-Entry Bookkeeping & Money Conservation Tests (FR-6)', () => {
  let userAToken: string;
  let userBToken: string;
  let auditorToken: string;
  let accountAId: string;
  let accountBId: string;
  let accountBNumber: string;

  beforeAll(async () => {
    // User A with $1,000
    const resA = await AuthService.register({
      email: `cons-a-${Date.now()}@ledgerline.internal`,
      password: 'Password123!',
      fullName: 'Conservation A',
      initialDeposit: 1000,
    });
    userAToken = resA.token;
    accountAId = resA.account!.id;

    // User B with $500
    const resB = await AuthService.register({
      email: `cons-b-${Date.now()}@ledgerline.internal`,
      password: 'Password123!',
      fullName: 'Conservation B',
      initialDeposit: 500,
    });
    userBToken = resB.token;
    accountBId = resB.account!.id;
    accountBNumber = resB.account!.accountNumber;

    // Auditor
    const resAud = await AuthService.register({
      email: `cons-aud-${Date.now()}@ledgerline.internal`,
      password: 'Password123!',
      fullName: 'Conservation Auditor',
      role: 'AUDITOR',
    });
    auditorToken = resAud.token;
  });

  it('maintains perfect mathematical money conservation after deposits, transfers, and withdrawals', async () => {
    // 1. User A deposits $250
    await request(app)
      .post('/api/transactions/deposit')
      .set('Authorization', `Bearer ${userAToken}`)
      .set('Idempotency-Key', `cons-dep-${Date.now()}`)
      .send({ accountId: accountAId, amount: 250 });

    // 2. User A transfers $300 to User B
    await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${userAToken}`)
      .set('Idempotency-Key', `cons-trn-${Date.now()}`)
      .send({
        sourceAccountId: accountAId,
        targetAccountNumber: accountBNumber,
        amount: 300,
      });

    // 3. User B withdraws $150
    await request(app)
      .post('/api/transactions/withdraw')
      .set('Authorization', `Bearer ${userBToken}`)
      .set('Idempotency-Key', `cons-wth-${Date.now()}`)
      .send({ accountId: accountBId, amount: 150 });

    // 4. Verify system-wide money conservation via LedgerService and Auditor API
    const conservationResult = await LedgerService.verifySystemConservation();
    expect(conservationResult.isConserved).toBe(true);
    expect(Number(conservationResult.discrepancy)).toBe(0);

    // Verify Auditor endpoint
    const apiRes = await request(app)
      .get('/api/transactions/conservation')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(apiRes.status).toBe(200);
    expect(apiRes.body.data.isConserved).toBe(true);
  });

  it('verifies that account balance strictly reconciles against its append-only ledger entries', async () => {
    const reconciliationA = await LedgerService.reconcileAccount(accountAId);
    expect(reconciliationA.isReconciled).toBe(true);
    expect(reconciliationA.storedBalance).toBe(reconciliationA.derivedBalance);

    const reconciliationB = await LedgerService.reconcileAccount(accountBId);
    expect(reconciliationB.isReconciled).toBe(true);
    expect(reconciliationB.storedBalance).toBe(reconciliationB.derivedBalance);
  });
});

