import { Router } from 'express';
import {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  restoreLocation,
} from '../controllers/location.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', getLocations);
router.post('/', requireRole(UserRole.ADMIN), createLocation);
router.put('/:id', requireRole(UserRole.ADMIN), updateLocation);
router.delete('/:id', requireRole(UserRole.ADMIN), deleteLocation);
router.patch('/:id/restore', requireRole(UserRole.ADMIN), restoreLocation);

export default router;
