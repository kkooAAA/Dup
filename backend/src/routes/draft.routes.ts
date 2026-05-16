import { Router } from 'express';
import { DraftController } from '../controllers/draft.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/duplicate', DraftController.duplicateToDraft);
router.get('/campaigns', DraftController.listCampaigns);
router.get('/campaigns/:id', DraftController.getCampaign);
router.patch('/campaigns/:id', DraftController.updateCampaign);
router.delete('/campaigns/:id', DraftController.deleteCampaign);

router.patch('/adsets/:id', DraftController.updateAdSet);
router.patch('/ads/:id', DraftController.updateAd);

router.post('/campaigns/bulk-publish', DraftController.bulkPublishDrafts);
router.post('/campaigns/bulk-update', DraftController.bulkUpdateCampaigns);
router.post('/campaigns/bulk-delete', DraftController.bulkDeleteDrafts);
router.post('/bulk-edit/schema', DraftController.bulkEditSchema);
router.post('/bulk-edit/validate', DraftController.bulkEditValidate);
router.post('/bulk-edit/apply', DraftController.bulkEditApply);
router.post('/form-schema', DraftController.getFormSchema);
router.post('/campaigns/:id/validate', DraftController.validateDraft);
router.post('/campaigns/:id/publish', DraftController.publishDraft);
router.post('/campaigns/:id/cleanup', DraftController.cleanupMetaObjects);

export default router;
