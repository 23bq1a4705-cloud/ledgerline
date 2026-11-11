import { Response, NextFunction } from 'express';
import { AuditService } from '../services/audit.service.js';
import { AuthenticatedRequest } from '../types/index.js';
import prisma from '../db/prisma.js';

export class AuditController {
  /**
   * Get paginated audit logs with search filters (Auditor & Admin)
   */
  static async getLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const action = req.query.action as string | undefined;
      const targetType = req.query.targetType as string | undefined;
      const outcome = req.query.outcome as any | undefined;
      const actorEmail = req.query.actorEmail as string | undefined;

      const result = await AuditService.getLogs({
        page,
        limit,
        action,
        targetType,
        outcome,
        actorEmail,
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
   * Get audit statistics (Total actions, security violations, success rate)
   */
  static async getSummary(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const [totalLogs, failureCount, securityBreaches] = await Promise.all([
        prisma.auditLog.count(),
        prisma.auditLog.count({ where: { outcome: 'FAILURE' } }),
        prisma.auditLog.count({
          where: {
            action: { startsWith: 'SECURITY_' },
          },
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          totalLogs,
          successfulLogs: totalLogs - failureCount,
          failedLogs: failureCount,
          securityBreaches,
          systemIntegrity: totalLogs > 0 ? ((totalLogs - failureCount) / totalLogs) * 100 : 100,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

