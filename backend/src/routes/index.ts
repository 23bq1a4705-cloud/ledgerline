import { Router } from 'express';
import authRoutes from './auth.routes.js';
import accountRoutes from './account.routes.js';
import transactionRoutes from './transaction.routes.js';
import auditRoutes from './audit.routes.js';
import { HealthController } from '../controllers/health.controller.js';

const router = Router();

// Health & readiness probes (FR-14)
router.get('/health', HealthController.getLiveness);
router.get('/readiness', HealthController.getReadiness);

// Domain Routes
router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes);
router.use('/transactions', transactionRoutes);
router.use('/audit', auditRoutes);

export default router;

