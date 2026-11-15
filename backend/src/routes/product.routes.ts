import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  importProductsCsv,
  exportProductsCsv,
} from '../controllers/product.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', getProducts);
router.get('/export-csv', requireRole(UserRole.ADMIN, UserRole.MANAGER), exportProductsCsv);
router.get('/:id', getProductById);
router.post('/', requireRole(UserRole.ADMIN, UserRole.MANAGER), createProduct);
router.put('/:id', requireRole(UserRole.ADMIN, UserRole.MANAGER), updateProduct);
router.delete('/:id', requireRole(UserRole.ADMIN), deleteProduct);
router.post('/import-csv', requireRole(UserRole.ADMIN, UserRole.MANAGER), importProductsCsv);

export default router;
