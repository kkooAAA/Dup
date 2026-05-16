import { Router } from 'express';
import { WideCreationController } from '../controllers/wideCreation.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/validate', WideCreationController.validate);
router.post('/generate', WideCreationController.generate);
router.post('/bulk-apply', WideCreationController.bulkApplyFields);
router.post('/tree', WideCreationController.getTree);

export default router;
