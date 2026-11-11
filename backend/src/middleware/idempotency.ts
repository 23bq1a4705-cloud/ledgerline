import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../db/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { AppError, ConflictError } from './errorHandler.js';

export function idempotencyMiddleware(options: { required?: boolean } = { required: true }) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const rawKey = req.headers['idempotency-key'] || req.body?.idempotencyKey;
    const idempotencyKey = typeof rawKey === 'string' ? rawKey.trim() : null;

    if (!idempotencyKey) {
      if (options.required) {
        return next(
          new AppError(
            'Missing required Idempotency-Key header for financial transaction.',
            400,
            'MISSING_IDEMPOTENCY_KEY'
          )
        );
      }
      return next();
    }

    req.idempotencyKey = idempotencyKey;
    const userId = req.user?.id || 'anonymous';

    // Generate deterministic hash of method + path + body
    const normalizedBody = JSON.stringify(req.body || {});
    const requestHash = crypto
      .createHash('sha256')
      .update(`${req.method}:${req.originalUrl}:${userId}:${normalizedBody}`)
      .digest('hex');

    try {
      // Check existing idempotency record
      const existing = await prisma.idempotencyKey.findUnique({
        where: { key: idempotencyKey },
      });

      if (existing) {
        // Verify user ownership of the key
        if (existing.userId !== userId) {
          return next(
            new ConflictError('Idempotency key was previously used by a different identity.')
          );
        }

        // Verify payload integrity
        if (existing.requestHash !== requestHash) {
          return next(
            new ConflictError(
              'Idempotency key was previously used with different request parameters.'
            )
          );
        }

        // Return cached original response (FR-8)
        res.setHeader('X-Idempotent-Replay', 'true');
        let parsedBody = existing.responseBody;
        try {
          parsedBody = JSON.parse(existing.responseBody);
        } catch {
          parsedBody = existing.responseBody;
        }
        return res.status(existing.responseStatus).json(parsedBody);
      }

      // Intercept response to store result atomically upon completion
      const originalJson = res.json.bind(res);

      res.json = function (body: any) {
        if (res.statusCode < 500) {
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour retention

          prisma.idempotencyKey
            .create({
              data: {
                key: idempotencyKey,
                userId,
                endpoint: req.originalUrl,
                requestHash,
                responseStatus: res.statusCode,
                responseBody: JSON.stringify(body),
                expiresAt,
              },
            })
            .catch((err) => {
              console.error('Failed to store idempotency record:', err);
            });
        }

        return originalJson(body);
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}
