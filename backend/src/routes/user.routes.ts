import { Router } from 'express';
import { getProfile, getTokenStatus, getStats, deleteAccount } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/profile', getProfile);
router.get('/token-status', getTokenStatus);
router.get('/stats', getStats);
router.delete('/account', deleteAccount);

export default router;
