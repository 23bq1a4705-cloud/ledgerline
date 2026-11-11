import { Response, NextFunction } from 'express';
import prisma from '../db/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { ForbiddenError, NotFoundError, UnauthorizedError } from './errorHandler.js';
import { AuditService } from '../services/audit.service.js';

/**
 * Validates that the authenticated caller owns the target account,
 * OR has an elevated role (AUDITOR for read, ADMIN for admin actions).
 * Enforces SR-1 (Object-level authorization).
 */
export function requireAccountOwnership(paramName = 'accountId', allowedRolesForOverride: ('ADMIN' | 'AUDITOR')[] = ['AUDITOR', 'ADMIN']) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new UnauthorizedError());
      }

      const accountId = req.params[paramName] || req.body[paramName];
      if (!accountId) {
        return next();
      }

      const account = await prisma.account.findUnique({
        where: { id: accountId },
        select: { id: true, userId: true, accountNumber: true },
      });

      if (!account) {
        return next(new NotFoundError('Account'));
      }

      // Check if user is owner
      const isOwner = account.userId === req.user.id;
      const hasOverrideRole = allowedRolesForOverride.includes(req.user.role as any);

      if (!isOwner && !hasOverrideRole) {
        // Enforce SR-1: Log audit breach attempt
        await AuditService.log({
          actorId: req.user.id,
          actorEmail: req.user.email,
          actorRole: req.user.role,
          action: 'SECURITY_OBJECT_AUTHORIZATION_BREACH_ATTEMPT',
          targetType: 'ACCOUNT',
          targetId: account.id,
          outcome: 'FAILURE',
          details: {
            accountNumber: account.accountNumber,
            resourceOwnerId: account.userId,
            attackerId: req.user.id,
            attemptedEndpoint: req.originalUrl,
          },
          ipAddress: req.clientIp,
        });

        return next(
          new ForbiddenError('Access forbidden: You do not have permission to view or manipulate this account.')
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

