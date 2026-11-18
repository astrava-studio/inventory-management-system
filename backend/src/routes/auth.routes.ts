import { Router } from 'express';
import { login, register, changePassword, getMe, googleAuth } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/google', googleAuth);
router.post('/change-password', authenticate, changePassword);
router.get('/me', authenticate, getMe);

export default router;
