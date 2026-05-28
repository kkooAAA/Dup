import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getTeam, updateTeam, regenerateInviteCode, removeMember } from '../controllers/team.controller';

const router = Router();

router.use(authMiddleware as any);

router.get('/', getTeam as any);
router.patch('/', updateTeam as any);
router.post('/regenerate-invite', regenerateInviteCode as any);
router.delete('/members/:memberId', removeMember as any);

export default router;
