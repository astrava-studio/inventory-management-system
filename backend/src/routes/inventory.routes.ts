import { Router } from 'express';
import { getInventoryMatrix, recordStockAdjustment, exportInventoryCsv } from '../controllers/inventory.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/export-csv', exportInventoryCsv);
router.get('/', getInventoryMatrix);
router.post('/adjustments', requireRole(UserRole.ADMIN, UserRole.MANAGER), recordStockAdjustment);

export default router;
