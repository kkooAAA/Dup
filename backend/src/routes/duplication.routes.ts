import { Router } from 'express';
import { 
  duplicateCampaign, 
  duplicateAdSet, 
  duplicateAd,
  duplicateItems,
  getHistory,
  deleteHistoryItem,
  cleanupHistory
} from '../controllers/duplication.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/sync', cleanupHistory);
router.get('/history', getHistory);
router.delete('/history/:id', deleteHistoryItem);
router.post('/campaign', duplicateCampaign);
router.post('/adset', duplicateAdSet);
router.post('/ad', duplicateAd);
router.post('/bulk', duplicateItems);

export default router;
