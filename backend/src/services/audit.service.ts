import prisma from '../db/prisma.js';
import { Role, AuditOutcome } from '../types/index.js';

export interface CreateAuditLogParams {
  actorId?: string | null;
  actorEmail: string;
  actorRole: Role;
  action: string;
  targetType: string;
  targetId?: string | null;
  outcome: AuditOutcome;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuditService {
  /**
   * Log an audit event. Append-only, never throws uncaught exceptions that break business logic.
   */
  static async log(params: CreateAuditLogParams): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          actorId: params.actorId || null,
          actorEmail: params.actorEmail,
          actorRole: params.actorRole,
          action: params.action,
          targetType: params.targetType,
          targetId: params.targetId || null,
          outcome: params.outcome,
          details: params.details ? JSON.stringify(params.details) : null,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });
    } catch (err) {
      console.error('CRITICAL AUDIT LOGGING ERROR:', err);
    }
  }

  /**
   * Retrieve audit logs with filtering and pagination (Auditors and Admins only)
   */
  static async getLogs(filters: {
    actorEmail?: string;
    action?: string;
    targetType?: string;
    outcome?: AuditOutcome;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 50));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.actorEmail) {
      where.actorEmail = { contains: filters.actorEmail };
    }
    if (filters.action) {
      where.action = filters.action;
    }
    if (filters.targetType) {
      where.targetType = filters.targetType;
    }
    if (filters.outcome) {
      where.outcome = filters.outcome;
    }
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [total, rawLogs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const logs = rawLogs.map((log) => {
      let parsedDetails = null;
      if (log.details) {
        try {
          parsedDetails = JSON.parse(log.details);
        } catch {
          parsedDetails = log.details;
        }
      }
      return {
        ...log,
        details: parsedDetails,
      };
    });

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      logs,
    };
  }
}
