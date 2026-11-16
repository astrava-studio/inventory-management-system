import { Router } from 'express';
import { getLedger, exportLedgerCsv } from '../controllers/ledger.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/export-csv', exportLedgerCsv);
router.get('/', getLedger);

export default router;
