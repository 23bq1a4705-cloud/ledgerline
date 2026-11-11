import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { idempotencyMiddleware } from '../middleware/idempotency.js';

const router = Router();

// Financial endpoints require authentication and strict idempotency keys
router.post(
  '/deposit',
  authenticate,
  requireRole('ACCOUNT_HOLDER', 'ADMIN'),
  idempotencyMiddleware({ required: true }),
  TransactionController.deposit
);

router.post(
  '/withdraw',
  authenticate,
  requireRole('ACCOUNT_HOLDER'),
  idempotencyMiddleware({ required: true }),
  TransactionController.withdraw
);

router.post(
  '/transfer',
  authenticate,
  requireRole('ACCOUNT_HOLDER'),
  idempotencyMiddleware({ required: true }),
  TransactionController.transfer
);

router.get(
  '/conservation',
  authenticate,
  requireRole('AUDITOR', 'ADMIN'),
  TransactionController.verifyConservation
);

export default router;

