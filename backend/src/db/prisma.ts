import { PrismaClient } from '@prisma/client';

const rawPrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

/**
 * Append-Only Security Extension (Enforces SR-4)
 * Explicitly rejects any UPDATE or DELETE on LedgerEntry and AuditLog
 */
export const prisma = rawPrisma.$extends({
  query: {
    ledgerEntry: {
      async update() {
        throw new Error('SECURITY VIOLATION: Ledger entries are append-only and cannot be updated.');
      },
      async updateMany() {
        throw new Error('SECURITY VIOLATION: Ledger entries are append-only and cannot be updated.');
      },
      async delete() {
        throw new Error('SECURITY VIOLATION: Ledger entries are append-only and cannot be deleted.');
      },
      async deleteMany() {
        throw new Error('SECURITY VIOLATION: Ledger entries are append-only and cannot be deleted.');
      },
    },
    auditLog: {
      async update() {
        throw new Error('SECURITY VIOLATION: Audit logs are append-only and cannot be updated.');
      },
      async updateMany() {
        throw new Error('SECURITY VIOLATION: Audit logs are append-only and cannot be updated.');
      },
      async delete() {
        throw new Error('SECURITY VIOLATION: Audit logs are append-only and cannot be deleted.');
      },
      async deleteMany() {
        throw new Error('SECURITY VIOLATION: Audit logs are append-only and cannot be deleted.');
      },
    },
  },
});

export default prisma;

