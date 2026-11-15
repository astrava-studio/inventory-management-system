import { Router } from 'express';
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  markPoOrdered,
  receivePurchaseOrder,
  cancelPurchaseOrder,
} from '../controllers/purchase-order.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', getPurchaseOrders);
router.get('/:id', getPurchaseOrderById);
router.post('/', requireRole(UserRole.ADMIN, UserRole.MANAGER), createPurchaseOrder);
router.post('/:id/order', requireRole(UserRole.ADMIN, UserRole.MANAGER), markPoOrdered);
router.post('/:id/receive', requireRole(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF), receivePurchaseOrder);
router.post('/:id/cancel', requireRole(UserRole.ADMIN, UserRole.MANAGER), cancelPurchaseOrder);

export default router;
