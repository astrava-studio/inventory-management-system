import { Router } from 'express';
import {
  getWorkspace,
  updateWorkspace,
} from '../controllers/workspace.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getWorkspace);
router.put('/', requireRole('ADMIN'), updateWorkspace);

export default router;
