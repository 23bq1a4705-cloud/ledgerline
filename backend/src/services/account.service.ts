import crypto from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';
import { Role } from '../types/index.js';
import prisma from '../db/prisma.js';
import { AppError, NotFoundError } from '../middleware/errorHandler.js';
import { AuditService } from './audit.service.js';
import { LedgerService } from './ledger.service.js';

export interface CreateAccountParams {
  userId: string;
  currency?: string;
  initialDeposit?: number;
  actor: {
    id: string;
    email: string;
    role: Role;
    ip?: string;
  };
}

export class AccountService {
  /**
   * Generates a cryptographically strong unique account number
   */
  static generateAccountNumber(): string {
    const randomDigits = crypto.randomInt(1000000000, 9999999999).toString();
    return `ACC-${randomDigits}`;
  }

  /**
   * Create an account for a user (FR-3, FR-4)
   */
  static async createAccount(params: CreateAccountParams) {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
    });

    if (!user) throw new NotFoundError('User');

    // Generate unique account number
    let accountNumber = this.generateAccountNumber();
    let exists = await prisma.account.findUnique({ where: { accountNumber } });
    while (exists) {
      accountNumber = this.generateAccountNumber();
      exists = await prisma.account.findUnique({ where: { accountNumber } });
    }

    const account = await prisma.account.create({
      data: {
        accountNumber,
        userId: user.id,
        currency: params.currency || 'USD',
        balance: new Decimal(0),
        status: 'ACTIVE',
      },
    });

    // Handle initial deposit through double-entry ledger if specified
    if (params.initialDeposit && params.initialDeposit > 0) {
      await LedgerService.deposit({
        type: 'DEPOSIT',
        amount: params.initialDeposit,
        targetAccountId: account.id,
        description: 'Initial account funding on onboarding',
        idempotencyKey: `init-deposit-${account.id}`,
        actor: params.actor,
      });

      // Refetch account with updated balance
      const updated = await prisma.account.findUniqueOrThrow({
        where: { id: account.id },
      });
      return {
        id: updated.id,
        accountNumber: updated.accountNumber,
        balance: updated.balance.toFixed(2),
        currency: updated.currency,
        status: updated.status,
        createdAt: updated.createdAt,
      };
    }

    // Log account creation
    await AuditService.log({
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      actorRole: params.actor.role,
      action: 'ACCOUNT_CREATED',
      targetType: 'ACCOUNT',
      targetId: account.id,
      outcome: 'SUCCESS',
      details: {
        accountNumber: account.accountNumber,
        ownerId: user.id,
        currency: account.currency,
      },
      ipAddress: params.actor.ip,
    });

    return {
      id: account.id,
      accountNumber: account.accountNumber,
      balance: account.balance.toFixed(2),
      currency: account.currency,
      status: account.status,
      createdAt: account.createdAt,
    };
  }

  /**
   * Get accounts belonging to a specific user (Account Holder view)
   */
  static async getUserAccounts(userId: string) {
    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map((acc) => ({
      id: acc.id,
      accountNumber: acc.accountNumber,
      balance: acc.balance.toFixed(2),
      currency: acc.currency,
      status: acc.status,
      createdAt: acc.createdAt,
    }));
  }

  /**
   * Get all accounts across system (Admin & Auditor view)
   */
  static async getAllAccounts(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [total, accounts] = await Promise.all([
      prisma.account.count(),
      prisma.account.findMany({
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, email: true, fullName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      total,
      page,
      limit,
      accounts: accounts.map((acc) => ({
        id: acc.id,
        accountNumber: acc.accountNumber,
        balance: acc.balance.toFixed(2),
        currency: acc.currency,
        status: acc.status,
        owner: acc.user,
        createdAt: acc.createdAt,
      })),
    };
  }

  /**
   * Get detailed account statement with date range filtering (FR-11)
   */
  static async getAccountStatement(params: {
    accountId: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const account = await prisma.account.findUnique({
      where: { id: params.accountId },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
      },
    });

    if (!account) throw new NotFoundError('Account');

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 50));
    const skip = (page - 1) * limit;

    const where: any = { accountId: params.accountId };
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
    }

    const [totalEntries, entries] = await Promise.all([
      prisma.ledgerEntry.count({ where }),
      prisma.ledgerEntry.findMany({
        where,
        skip,
        take: limit,
        include: {
          transaction: {
            select: {
              referenceId: true,
              type: true,
              status: true,
              description: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Derive reconciliation status
    const reconciliation = await LedgerService.reconcileAccount(account.id);

    return {
      account: {
        id: account.id,
        accountNumber: account.accountNumber,
        currency: account.currency,
        balance: account.balance.toFixed(2),
        status: account.status,
        owner: account.user,
      },
      statementPeriod: {
        startDate: params.startDate?.toISOString() || 'Earliest',
        endDate: params.endDate?.toISOString() || 'Present',
      },
      reconciliation,
      pagination: {
        total: totalEntries,
        page,
        limit,
        totalPages: Math.ceil(totalEntries / limit),
      },
      entries: entries.map((e) => ({
        id: e.id,
        referenceId: e.transaction.referenceId,
        type: e.transaction.type,
        direction: e.direction,
        amount: e.amount.toFixed(2),
        balanceAfter: e.balanceAfter.toFixed(2),
        description: e.description || e.transaction.description,
        timestamp: e.createdAt,
      })),
    };
  }

  /**
   * Admin account status update (e.g. freeze or close account)
   */
  static async updateAccountStatus(params: {
    accountId: string;
    status: 'ACTIVE' | 'FROZEN' | 'CLOSED';
    actor: { id: string; email: string; role: Role; ip?: string };
  }) {
    const account = await prisma.account.findUnique({
      where: { id: params.accountId },
    });

    if (!account) throw new NotFoundError('Account');

    const updated = await prisma.account.update({
      where: { id: account.id },
      data: { status: params.status },
    });

    await AuditService.log({
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      actorRole: params.actor.role,
      action: 'ADMIN_UPDATE_ACCOUNT_STATUS',
      targetType: 'ACCOUNT',
      targetId: account.id,
      outcome: 'SUCCESS',
      details: {
        accountNumber: account.accountNumber,
        previousStatus: account.status,
        newStatus: params.status,
      },
      ipAddress: params.actor.ip,
    });

    return updated;
  }
}

