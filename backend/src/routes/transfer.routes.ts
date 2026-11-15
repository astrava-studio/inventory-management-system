import { Router } from 'express';
import {
  getTransfers,
  getTransferById,
  createTransfer,
  dispatchTransfer,
  completeTransfer,
  cancelTransfer,
} from '../controllers/transfer.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', getTransfers);
router.get('/:id', getTransferById);
router.post('/', requireRole(UserRole.ADMIN, UserRole.MANAGER), createTransfer);
router.post('/:id/dispatch', requireRole(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF), dispatchTransfer);
router.post('/:id/complete', requireRole(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF), completeTransfer);
router.post('/:id/cancel', requireRole(UserRole.ADMIN, UserRole.MANAGER), cancelTransfer);

export default router;
