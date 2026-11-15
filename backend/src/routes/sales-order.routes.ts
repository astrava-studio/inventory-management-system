import { Router } from 'express';
import {
  getSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  confirmSalesOrder,
  fulfillSalesOrder,
  cancelSalesOrder,
} from '../controllers/sales-order.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', getSalesOrders);
router.get('/:id', getSalesOrderById);
router.post('/', requireRole(UserRole.ADMIN, UserRole.MANAGER), createSalesOrder);
router.post('/:id/confirm', requireRole(UserRole.ADMIN, UserRole.MANAGER), confirmSalesOrder);
router.post('/:id/fulfill', requireRole(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF), fulfillSalesOrder);
router.post('/:id/cancel', requireRole(UserRole.ADMIN, UserRole.MANAGER), cancelSalesOrder);

export default router;
