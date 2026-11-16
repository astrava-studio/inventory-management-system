import { Router } from 'express';
import {
  getTeamUsers,
  inviteTeamUser,
  toggleUserStatus,
} from '../controllers/workspace.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getTeamUsers);
router.post('/', requireRole('ADMIN'), inviteTeamUser);
router.patch('/:id/status', requireRole('ADMIN'), toggleUserStatus);

export default router;
