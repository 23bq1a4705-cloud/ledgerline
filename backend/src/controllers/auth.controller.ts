import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service.js';
import { AuthenticatedRequest } from '../types/index.js';
import { AuditService } from '../services/audit.service.js';

const registerSchema = z.object({
  email: z.string().email('Valid email address required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  initialDeposit: z.number().nonnegative('Initial deposit cannot be negative').optional().default(0),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = registerSchema.parse(req.body);
      const forwarded = req.headers['x-forwarded-for'];
      const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;

      const result = await AuthService.register({
        ...validated,
        ipAddress: ip,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const forwarded = req.headers['x-forwarded-for'];
      const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;

      const result = await AuthService.login(email, password, ip);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async me(req: AuthenticatedRequest, res: Response) {
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  }

  static async logout(req: AuthenticatedRequest, res: Response) {
    if (req.user) {
      await AuditService.log({
        actorId: req.user.id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: 'AUTH_LOGOUT',
        targetType: 'USER',
        targetId: req.user.id,
        outcome: 'SUCCESS',
        ipAddress: req.clientIp,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Successfully logged out.',
    });
  }
}

