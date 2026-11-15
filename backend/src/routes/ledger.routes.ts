import { Router } from 'express';
import { getLedger } from '../controllers/ledger.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getLedger);

export default router;
