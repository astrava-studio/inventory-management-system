import { Router } from 'express';
import { getDashboardKpis } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/kpis', authenticate, getDashboardKpis);

export default router;
