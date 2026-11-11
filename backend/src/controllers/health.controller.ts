import { Request, Response } from 'express';
import prisma from '../db/prisma.js';

export class HealthController {
  /**
   * Liveness Probe (FR-14)
   */
  static getLiveness(_req: Request, res: Response) {
    res.status(200).json({
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: 'ledgerline-balancevault-api',
      version: '1.0.0',
    });
  }

  /**
   * Readiness Probe (FR-14)
   * Verifies database connectivity and readiness
   */
  static async getReadiness(_req: Request, res: Response) {
    try {
      // Execute lightweight DB ping
      await prisma.$queryRaw`SELECT 1`;

      res.status(200).json({
        status: 'READY',
        database: 'CONNECTED',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(503).json({
        status: 'NOT_READY',
        database: 'DISCONNECTED',
        error: 'Database connection failed',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

