import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../db/prisma.js';
import { env } from '../config/env.js';
import { Role } from '../types/index.js';
import {
  AppError,
  InsufficientFundsError,
  NotFoundError,
} from '../middleware/errorHandler.js';
import { AuditService } from './audit.service.js';

export interface ExecuteTransactionParams {
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
  amount: number | string;
  sourceAccountId?: string;
  targetAccountId?: string;
  description?: string;
  idempotencyKey?: string;
  actor: {
    id: string;
    email: string;
    role: Role;
    ip?: string;
  };
}

export class LedgerService {
  /**
   * Helper to ensure the System Clearing Account exists
   */
  static async getOrCreateSystemClearingAccount(tx?: any) {
    const client = tx || prisma;
    let clearing = await client.account.findUnique({
      where: { accountNumber: env.SYSTEM_CLEARING_ACCOUNT_NUMBER },
    });

    if (!clearing) {
      let systemUser = await client.user.findFirst({
        where: { email: 'system@ledgerline.internal' },
      });

      if (!systemUser) {
        systemUser = await client.user.create({
          data: {
            email: 'system@ledgerline.internal',
            fullName: 'System Clearing House',
            passwordHash: 'DISABLED_AUTHENTICATION_SYSTEM_USER',
            role: 'ADMIN',
          },
        });
      }

      clearing = await client.account.create({
        data: {
          accountNumber: env.SYSTEM_CLEARING_ACCOUNT_NUMBER,
          userId: systemUser.id,
          balance: new Decimal('1000000000.00'),
          currency: 'USD',
          status: 'ACTIVE',
        },
      });
    }

    return clearing;
  }

  /**
   * Execute a Deposit
   * System Clearing Account -> Customer Account (Double-Entry: Clearing DEBIT, Customer CREDIT)
   */
  static async deposit(params: ExecuteTransactionParams) {
    const amountDec = new Decimal(params.amount);
    if (amountDec.lte(0)) {
      throw new AppError('Deposit amount must be strictly greater than zero.', 400);
    }
    if (!params.targetAccountId) {
      throw new AppError('Target account ID is required for deposits.', 400);
    }

    const txResult = await prisma.$transaction(
      async (tx: any) => {
        const clearingAcc = await this.getOrCreateSystemClearingAccount(tx);

      const targetAcc = await tx.account.findUnique({
        where: { id: params.targetAccountId },
      });

      if (!targetAcc) {
        throw new NotFoundError('Target Account');
      }

      if (targetAcc.status !== 'ACTIVE') {
        throw new AppError(`Target account is ${targetAcc.status.toLowerCase()} and cannot receive deposits.`, 400);
      }

      // Update target account balance
      const updatedTarget = await tx.account.update({
        where: { id: targetAcc.id },
        data: {
          balance: { increment: amountDec },
          version: { increment: 1 },
        },
      });

      // Update clearing account balance
      const updatedClearing = await tx.account.update({
        where: { id: clearingAcc.id },
        data: {
          balance: { decrement: amountDec },
          version: { increment: 1 },
        },
      });

      // Create Transaction record
      const transaction = await tx.transaction.create({
        data: {
          type: 'DEPOSIT',
          status: 'COMPLETED',
          amount: amountDec,
          currency: targetAcc.currency,
          sourceAccountId: clearingAcc.id,
          targetAccountId: targetAcc.id,
          description: params.description || `Deposit to ${targetAcc.accountNumber}`,
          idempotencyKey: params.idempotencyKey,
        },
      });

      // Balanced Double-Entry: Debit Clearing, Credit Customer
      await tx.ledgerEntry.createMany({
        data: [
          {
            transactionId: transaction.id,
            accountId: clearingAcc.id,
            direction: 'DEBIT',
            amount: amountDec,
            balanceAfter: updatedClearing.balance,
            description: `Contra debit for deposit into ${targetAcc.accountNumber}`,
          },
          {
            transactionId: transaction.id,
            accountId: targetAcc.id,
            direction: 'CREDIT',
            amount: amountDec,
            balanceAfter: updatedTarget.balance,
            description: params.description || 'Customer deposit',
          },
        ],
      });

      return {
        transactionId: transaction.id,
        referenceId: transaction.referenceId,
        type: 'DEPOSIT' as const,
        amount: amountDec.toFixed(2),
        currency: targetAcc.currency,
        account: {
          id: targetAcc.id,
          accountNumber: targetAcc.accountNumber,
          balance: updatedTarget.balance.toFixed(2),
        },
        createdAt: transaction.createdAt,
      };
    }, { maxWait: 15000, timeout: 15000 });

    // Audit log after transaction commits
    await AuditService.log({
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      actorRole: params.actor.role,
      action: 'TRANSACTION_DEPOSIT',
      targetType: 'ACCOUNT',
      targetId: txResult.account.id,
      outcome: 'SUCCESS',
      details: {
        transactionId: txResult.transactionId,
        amount: amountDec.toString(),
        currency: txResult.currency,
        accountNumber: txResult.account.accountNumber,
        newBalance: txResult.account.balance,
      },
      ipAddress: params.actor.ip,
    });

    return txResult;
  }

  /**
   * Execute a Withdrawal
   * Customer Account -> System Clearing Account (Double-Entry: Customer DEBIT, Clearing CREDIT)
   */
  static async withdraw(params: ExecuteTransactionParams) {
    const amountDec = new Decimal(params.amount);
    if (amountDec.lte(0)) {
      throw new AppError('Withdrawal amount must be strictly greater than zero.', 400);
    }
    if (!params.sourceAccountId) {
      throw new AppError('Source account ID is required for withdrawals.', 400);
    }

    let sourceAccountNumber = '';
    const txResult = await prisma.$transaction(
      async (tx: any) => {
        const clearingAcc = await this.getOrCreateSystemClearingAccount(tx);

      const sourceAcc = await tx.account.findUnique({
        where: { id: params.sourceAccountId },
      });

      if (!sourceAcc) {
        throw new NotFoundError('Source Account');
      }

      sourceAccountNumber = sourceAcc.accountNumber;

      if (sourceAcc.status !== 'ACTIVE') {
        throw new AppError(`Source account is ${sourceAcc.status.toLowerCase()} and cannot perform withdrawals.`, 400);
      }

      // Concurrency & Negative Balance Guard (SR-3, FR-7, FR-9)
      const updateResult = await tx.account.updateMany({
        where: {
          id: sourceAcc.id,
          balance: { gte: amountDec },
          status: 'ACTIVE',
        },
        data: {
          balance: { decrement: amountDec },
          version: { increment: 1 },
        },
      });

      if (updateResult.count === 0) {
        throw new InsufficientFundsError(
          `Withdrawal declined: Account ${sourceAcc.accountNumber} has insufficient funds.`
        );
      }

      const updatedSource = await tx.account.findUniqueOrThrow({
        where: { id: sourceAcc.id },
      });

      const updatedClearing = await tx.account.update({
        where: { id: clearingAcc.id },
        data: {
          balance: { increment: amountDec },
          version: { increment: 1 },
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          type: 'WITHDRAWAL',
          status: 'COMPLETED',
          amount: amountDec,
          currency: sourceAcc.currency,
          sourceAccountId: sourceAcc.id,
          targetAccountId: clearingAcc.id,
          description: params.description || `Withdrawal from ${sourceAcc.accountNumber}`,
          idempotencyKey: params.idempotencyKey,
        },
      });

      await tx.ledgerEntry.createMany({
        data: [
          {
            transactionId: transaction.id,
            accountId: sourceAcc.id,
            direction: 'DEBIT',
            amount: amountDec,
            balanceAfter: updatedSource.balance,
            description: params.description || 'Customer withdrawal',
          },
          {
            transactionId: transaction.id,
            accountId: clearingAcc.id,
            direction: 'CREDIT',
            amount: amountDec,
            balanceAfter: updatedClearing.balance,
            description: `Contra credit for withdrawal from ${sourceAcc.accountNumber}`,
          },
        ],
      });

      return {
        transactionId: transaction.id,
        referenceId: transaction.referenceId,
        type: 'WITHDRAWAL' as const,
        amount: amountDec.toFixed(2),
        currency: sourceAcc.currency,
        account: {
          id: sourceAcc.id,
          accountNumber: sourceAcc.accountNumber,
          balance: updatedSource.balance.toFixed(2),
        },
        createdAt: transaction.createdAt,
      };
    }, { maxWait: 15000, timeout: 15000 });

    await AuditService.log({
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      actorRole: params.actor.role,
      action: 'TRANSACTION_WITHDRAW',
      targetType: 'ACCOUNT',
      targetId: txResult.account.id,
      outcome: 'SUCCESS',
      details: {
        transactionId: txResult.transactionId,
        amount: amountDec.toString(),
        currency: txResult.currency,
        accountNumber: sourceAccountNumber,
        remainingBalance: txResult.account.balance,
      },
      ipAddress: params.actor.ip,
    });

    return txResult;
  }

  /**
   * Execute a Transfer between two customer accounts
   */
  static async transfer(params: ExecuteTransactionParams) {
    const amountDec = new Decimal(params.amount);
    if (amountDec.lte(0)) {
      throw new AppError('Transfer amount must be strictly greater than zero.', 400);
    }
    if (!params.sourceAccountId || !params.targetAccountId) {
      throw new AppError('Both sourceAccountId and targetAccountId are required for transfers.', 400);
    }
    if (params.sourceAccountId === params.targetAccountId) {
      throw new AppError('Cannot transfer funds to the identical account.', 400);
    }

    const txResult = await prisma.$transaction(async (tx: any) => {
      const [sourceAcc, targetAcc] = await Promise.all([
        tx.account.findUnique({ where: { id: params.sourceAccountId } }),
        tx.account.findUnique({ where: { id: params.targetAccountId } }),
      ]);

      if (!sourceAcc) throw new NotFoundError('Source Account');
      if (!targetAcc) throw new NotFoundError('Target Account');

      if (sourceAcc.status !== 'ACTIVE') {
        throw new AppError(`Source account is ${sourceAcc.status.toLowerCase()} and cannot transfer funds.`, 400);
      }
      if (targetAcc.status !== 'ACTIVE') {
        throw new AppError(`Target account is ${targetAcc.status.toLowerCase()} and cannot receive funds.`, 400);
      }

      // Concurrency Guard on Source
      const debitResult = await tx.account.updateMany({
        where: {
          id: sourceAcc.id,
          balance: { gte: amountDec },
          status: 'ACTIVE',
        },
        data: {
          balance: { decrement: amountDec },
          version: { increment: 1 },
        },
      });

      if (debitResult.count === 0) {
        throw new InsufficientFundsError(
          `Transfer declined: Account ${sourceAcc.accountNumber} has insufficient funds.`
        );
      }

      const updatedTarget = await tx.account.update({
        where: { id: targetAcc.id },
        data: {
          balance: { increment: amountDec },
          version: { increment: 1 },
        },
      });

      const updatedSource = await tx.account.findUniqueOrThrow({
        where: { id: sourceAcc.id },
      });

      const transaction = await tx.transaction.create({
        data: {
          type: 'TRANSFER',
          status: 'COMPLETED',
          amount: amountDec,
          currency: sourceAcc.currency,
          sourceAccountId: sourceAcc.id,
          targetAccountId: targetAcc.id,
          description:
            params.description ||
            `Transfer from ${sourceAcc.accountNumber} to ${targetAcc.accountNumber}`,
          idempotencyKey: params.idempotencyKey,
        },
      });

      await tx.ledgerEntry.createMany({
        data: [
          {
            transactionId: transaction.id,
            accountId: sourceAcc.id,
            direction: 'DEBIT',
            amount: amountDec,
            balanceAfter: updatedSource.balance,
            description: `Transfer out to ${targetAcc.accountNumber}`,
          },
          {
            transactionId: transaction.id,
            accountId: targetAcc.id,
            direction: 'CREDIT',
            amount: amountDec,
            balanceAfter: updatedTarget.balance,
            description: `Transfer in from ${sourceAcc.accountNumber}`,
          },
        ],
      });

      return {
        transactionId: transaction.id,
        referenceId: transaction.referenceId,
        type: 'TRANSFER' as const,
        amount: amountDec.toFixed(2),
        currency: sourceAcc.currency,
        sourceAccount: {
          id: sourceAcc.id,
          accountNumber: sourceAcc.accountNumber,
          balance: updatedSource.balance.toFixed(2),
        },
        targetAccount: {
          id: targetAcc.id,
          accountNumber: targetAcc.accountNumber,
        },
        createdAt: transaction.createdAt,
      };
    }, { maxWait: 15000, timeout: 15000 });

    await AuditService.log({
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      actorRole: params.actor.role,
      action: 'TRANSACTION_TRANSFER',
      targetType: 'TRANSACTION',
      targetId: txResult.transactionId,
      outcome: 'SUCCESS',
      details: {
        transactionId: txResult.transactionId,
        amount: amountDec.toString(),
        sourceAccountNumber: txResult.sourceAccount.accountNumber,
        targetAccountNumber: txResult.targetAccount.accountNumber,
        sourceBalanceAfter: txResult.sourceAccount.balance,
      },
      ipAddress: params.actor.ip,
    });

    return txResult;
  }

  /**
   * Verify mathematical conservation of money across the entire system
   */
  static async verifySystemConservation() {
    const debits = await prisma.ledgerEntry.aggregate({
      _sum: { amount: true },
      where: { direction: 'DEBIT' },
    });

    const credits = await prisma.ledgerEntry.aggregate({
      _sum: { amount: true },
      where: { direction: 'CREDIT' },
    });

    const totalDebits = debits._sum.amount || new Decimal(0);
    const totalCredits = credits._sum.amount || new Decimal(0);
    const difference = totalDebits.minus(totalCredits);

    return {
      isConserved: difference.isZero(),
      totalDebits: totalDebits.toFixed(4),
      totalCredits: totalCredits.toFixed(4),
      discrepancy: difference.toFixed(4),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reconcile an individual account's balance from its append-only ledger entries
   */
  static async reconcileAccount(accountId: string) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) throw new NotFoundError('Account');

    const credits = await prisma.ledgerEntry.aggregate({
      _sum: { amount: true },
      where: { accountId, direction: 'CREDIT' },
    });

    const debits = await prisma.ledgerEntry.aggregate({
      _sum: { amount: true },
      where: { accountId, direction: 'DEBIT' },
    });

    const totalCredits = credits._sum.amount || new Decimal(0);
    const totalDebits = debits._sum.amount || new Decimal(0);
    const derivedBalance = totalCredits.minus(totalDebits);
    const matchesStored = account.balance.equals(derivedBalance);

    return {
      accountId: account.id,
      accountNumber: account.accountNumber,
      storedBalance: account.balance.toFixed(4),
      derivedBalance: derivedBalance.toFixed(4),
      isReconciled: matchesStored,
      totalCredits: totalCredits.toFixed(4),
      totalDebits: totalDebits.toFixed(4),
    };
  }
}
