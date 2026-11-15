import { Router } from 'express';
import { getLocations, createLocation, updateLocation } from '../controllers/location.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', getLocations);
router.post('/', requireRole(UserRole.ADMIN), createLocation);
router.put('/:id', requireRole(UserRole.ADMIN), updateLocation);

export default router;
