import { Response, NextFunction } from 'express';
import { Role, AuthenticatedRequest } from '../types/index.js';
import { ForbiddenError, UnauthorizedError } from './errorHandler.js';
import { AuditService } from '../services/audit.service.js';

/**
 * Require user to possess at least one of the specified roles
 */
export function requireRole(...allowedRoles: Role[]) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!allowedRoles.includes(req.user.role)) {
      await AuditService.log({
        actorId: req.user.id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: 'SECURITY_RBAC_VIOLATION',
        targetType: 'ENDPOINT',
        targetId: req.originalUrl,
        outcome: 'FAILURE',
        details: {
          attemptedRole: req.user.role,
          requiredRoles: allowedRoles,
          method: req.method,
          path: req.originalUrl,
        },
        ipAddress: req.clientIp,
      });

      return next(
        new ForbiddenError(
          `Access forbidden: Role '${req.user.role}' is not authorized for this resource.`
        )
      );
    }

    next();
  };
}
