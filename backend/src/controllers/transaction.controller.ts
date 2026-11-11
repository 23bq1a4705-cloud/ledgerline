import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { LedgerService } from '../services/ledger.service.js';
import { AuthenticatedRequest } from '../types/index.js';
import { AppError, ForbiddenError } from '../middleware/errorHandler.js';
import prisma from '../db/prisma.js';

// Financial input validation schema (SR-2)
const amountSchema = z
  .number({ invalid_type_error: 'Amount must be a numeric value' })
  .positive('Amount must be strictly greater than zero')
  .max(1000000000, 'Transaction amount exceeds maximum allowable ceiling')
  .refine(
    (val) => {
      // Maximum 2 decimal places allowed for currency
      const parts = val.toString().split('.');
      return parts.length <= 1 || parts[1].length <= 2;
    },
    { message: 'Amount precision cannot exceed 2 decimal places' }
  );

const depositSchema = z.object({
  accountId: z.string().uuid('Valid account UUID required'),
  amount: amountSchema,
  description: z.string().max(255).optional(),
});

const withdrawSchema = z.object({
  accountId: z.string().uuid('Valid account UUID required'),
  amount: amountSchema,
  description: z.string().max(255).optional(),
});

const transferSchema = z.object({
  sourceAccountId: z.string().uuid('Valid source account UUID required'),
  targetAccountNumber: z.string().min(5, 'Valid target account number required'),
  amount: amountSchema,
  description: z.string().max(255).optional(),
});

export class TransactionController {
  /**
   * Deposit money into account
   */
  static async deposit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { accountId, amount, description } = depositSchema.parse(req.body);

      // Verify ownership (SR-1): Account holder can only deposit to their own account; Admin can deposit to any
      if (req.user?.role === 'ACCOUNT_HOLDER') {
        const account = await prisma.account.findUnique({ where: { id: accountId } });
        if (!account || account.userId !== req.user.id) {
          throw new ForbiddenError('You can only make deposits to accounts you own.');
        }
      }

      const result = await LedgerService.deposit({
        type: 'DEPOSIT',
        amount,
        targetAccountId: accountId,
        description,
        idempotencyKey: req.idempotencyKey,
        actor: {
          id: req.user!.id,
          email: req.user!.email,
          role: req.user!.role,
          ip: req.clientIp,
        },
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Withdraw money from account (Strict ownership required)
   */
  static async withdraw(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { accountId, amount, description } = withdrawSchema.parse(req.body);

      // Strict Ownership Check (SR-1): Only the account owner can withdraw money!
      const account = await prisma.account.findUnique({ where: { id: accountId } });
      if (!account) {
        throw new AppError('Account not found', 404);
      }

      if (req.user?.role === 'ACCOUNT_HOLDER' && account.userId !== req.user.id) {
        throw new ForbiddenError('You can only withdraw funds from your own account.');
      }

      const result = await LedgerService.withdraw({
        type: 'WITHDRAWAL',
        amount,
        sourceAccountId: accountId,
        description,
        idempotencyKey: req.idempotencyKey,
        actor: {
          id: req.user!.id,
          email: req.user!.email,
          role: req.user!.role,
          ip: req.clientIp,
        },
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Transfer money from own account to another account
   */
  static async transfer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { sourceAccountId, targetAccountNumber, amount, description } =
        transferSchema.parse(req.body);

      // Verify ownership of source account (SR-1)
      const sourceAccount = await prisma.account.findUnique({
        where: { id: sourceAccountId },
      });
      if (!sourceAccount) {
        throw new AppError('Source account not found', 404);
      }

      if (req.user?.role === 'ACCOUNT_HOLDER' && sourceAccount.userId !== req.user.id) {
        throw new ForbiddenError('You can only transfer funds from your own account.');
      }

      // Look up target account by account number
      const targetAccount = await prisma.account.findUnique({
        where: { accountNumber: targetAccountNumber.trim() },
      });
      if (!targetAccount) {
        throw new AppError(
          `Destination account '${targetAccountNumber}' does not exist.`,
          404,
          'TARGET_ACCOUNT_NOT_FOUND'
        );
      }

      const result = await LedgerService.transfer({
        type: 'TRANSFER',
        amount,
        sourceAccountId: sourceAccount.id,
        targetAccountId: targetAccount.id,
        description,
        idempotencyKey: req.idempotencyKey,
        actor: {
          id: req.user!.id,
          email: req.user!.email,
          role: req.user!.role,
          ip: req.clientIp,
        },
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Ledger Money Conservation Verification Endpoint (Auditor & Admin only)
   */
  static async verifyConservation(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const status = await LedgerService.verifySystemConservation();
      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (err) {
      next(err);
    }
  }
}

