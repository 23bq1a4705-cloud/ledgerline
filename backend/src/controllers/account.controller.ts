import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AccountService } from '../services/account.service.js';
import { AuthenticatedRequest } from '../types/index.js';
import { ForbiddenError } from '../middleware/errorHandler.js';
import prisma from '../db/prisma.js';

const createAccountSchema = z.object({
  currency: z.string().length(3).default('USD'),
  initialDeposit: z.number().nonnegative().optional().default(0),
  userId: z.string().uuid().optional(),
});

const statusUpdateSchema = z.object({
  status: z.enum(['ACTIVE', 'FROZEN', 'CLOSED']),
});

export class AccountController {
  /**
   * Get own accounts (Account Holder)
   */
  static async getMyAccounts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const accounts = await AccountService.getUserAccounts(req.user!.id);
      res.status(200).json({
        success: true,
        data: accounts,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create an account (User creates for self; Admin can specify userId)
   */
  static async createAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createAccountSchema.parse(req.body);

      let targetUserId = req.user!.id;
      if (validated.userId && req.user!.role === 'ADMIN') {
        targetUserId = validated.userId;
      }

      const account = await AccountService.createAccount({
        userId: targetUserId,
        currency: validated.currency,
        initialDeposit: validated.initialDeposit,
        actor: {
          id: req.user!.id,
          email: req.user!.email,
          role: req.user!.role,
          ip: req.clientIp,
        },
      });

      res.status(201).json({
        success: true,
        data: account,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get all accounts across system (Admin & Auditor)
   */
  static async getAllAccounts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const result = await AccountService.getAllAccounts(page, limit);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get detailed statement for an account (SR-1: Owner or Auditor/Admin only)
   */
  static async getStatement(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const accountId = req.params.accountId;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      // Ownership enforcement (SR-1)
      if (req.user?.role === 'ACCOUNT_HOLDER') {
        const account = await prisma.account.findUnique({ where: { id: accountId } });
        if (!account || account.userId !== req.user.id) {
          throw new ForbiddenError('You can only access statements for your own accounts.');
        }
      }

      const statement = await AccountService.getAccountStatement({
        accountId,
        startDate,
        endDate,
        page,
        limit,
      });

      res.status(200).json({
        success: true,
        data: statement,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update account status (Admin only)
   */
  static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const accountId = req.params.accountId;
      const { status } = statusUpdateSchema.parse(req.body);

      const updated = await AccountService.updateAccountStatus({
        accountId,
        status,
        actor: {
          id: req.user!.id,
          email: req.user!.email,
          role: req.user!.role,
          ip: req.clientIp,
        },
      });

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
}

