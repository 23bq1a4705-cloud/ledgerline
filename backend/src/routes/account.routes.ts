import { Router } from 'express';
import { AccountController } from '../controllers/account.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// Account Holder gets own accounts
router.get('/my', authenticate, requireRole('ACCOUNT_HOLDER'), AccountController.getMyAccounts);

// Create an account
router.post('/', authenticate, requireRole('ACCOUNT_HOLDER', 'ADMIN'), AccountController.createAccount);

// Admin & Auditor list all accounts
router.get('/', authenticate, requireRole('ADMIN', 'AUDITOR'), AccountController.getAllAccounts);

// Account statement (SR-1: Owner or Admin/Auditor)
router.get('/:accountId/statement', authenticate, AccountController.getStatement);

// Admin update account status (freeze/close)
router.patch('/:accountId/status', authenticate, requireRole('ADMIN'), AccountController.updateStatus);

export default router;

