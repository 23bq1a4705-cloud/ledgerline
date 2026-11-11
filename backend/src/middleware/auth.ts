import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AuthenticatedRequest, AuthenticatedUser } from '../types/index.js';
import { UnauthorizedError } from './errorHandler.js';

export function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  try {
    // Extract IP for audit and rate-limiting
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
    req.clientIp = ip || 'unknown';

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Authentication token missing');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
    if (!decoded || !decoded.id || !decoded.role) {
      throw new UnauthorizedError('Invalid token payload');
    }

    req.user = decoded;
    next();
  } catch (err: any) {
    if (err instanceof UnauthorizedError) {
      return next(err);
    }
    if (err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Token expired. Please re-authenticate.'));
    }
    return next(new UnauthorizedError('Invalid or corrupted authentication token'));
  }
}

