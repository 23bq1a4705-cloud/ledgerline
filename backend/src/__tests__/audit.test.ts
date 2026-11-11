import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { AuthService } from '../services/auth.service.js';
import prisma from '../db/prisma.js';

describe('Audit Trail & Compliance Logging (FR-10, FR-12)', () => {
  let userToken: string;
  let auditorToken: string;
  let accountId: string;
  let userEmail: string;

  beforeAll(async () => {
    userEmail = `audit-test-${Date.now()}@ledgerline.internal`;
    const res = await AuthService.register({
      email: userEmail,
      password: 'Password123!',
      fullName: 'Audit Tester',
      initialDeposit: 400,
    });
    userToken = res.token;
    accountId = res.account!.id;

    const resAud = await AuthService.register({
      email: `audit-officer-${Date.now()}@ledgerline.internal`,
      password: 'Password123!',
      fullName: 'Audit Officer',
      role: 'AUDITOR',
    });
    auditorToken = resAud.token;
  });

  it('creates an immutable audit log entry when a transaction occurs', async () => {
    await request(app)
      .post('/api/transactions/deposit')
      .set('Authorization', `Bearer ${userToken}`)
      .set('Idempotency-Key', `audit-dep-${Date.now()}`)
      .send({ accountId, amount: 100 });

    const auditEntry = await prisma.auditLog.findFirst({
      where: {
        actorEmail: userEmail,
        action: 'TRANSACTION_DEPOSIT',
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(auditEntry).toBeDefined();
    expect(auditEntry?.outcome).toBe('SUCCESS');
    expect(auditEntry?.targetType).toBe('ACCOUNT');
    expect(auditEntry?.targetId).toBe(accountId);
  });

  it('allows Auditor to query paginated audit logs and summary statistics', async () => {
    const logsRes = await request(app)
      .get('/api/audit/logs')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(logsRes.status).toBe(200);
    expect(logsRes.body.data.logs).toBeInstanceOf(Array);
    expect(logsRes.body.data.logs.length).toBeGreaterThan(0);

    const summaryRes = await request(app)
      .get('/api/audit/summary')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.data.totalLogs).toBeGreaterThan(0);
    expect(summaryRes.body.data.systemIntegrity).toBeDefined();
  });
});

