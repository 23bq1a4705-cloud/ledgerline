import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// Only Auditor and Admin can read audit logs (SR-4, FR-10, FR-12)
router.get('/logs', authenticate, requireRole('AUDITOR', 'ADMIN'), AuditController.getLogs);
router.get('/summary', authenticate, requireRole('AUDITOR', 'ADMIN'), AuditController.getSummary);

export default router;

