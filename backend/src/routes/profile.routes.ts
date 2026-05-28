import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', ProfileController.listProfiles);
router.post('/', ProfileController.createProfile);
router.delete('/:id', ProfileController.deleteProfile);

export default router;
