import { Request, Response } from 'express';
import { DraftService } from '../services/draft/DraftService';
import { DraftCampaignService } from '../services/draft/DraftCampaignService';
import { DraftAdSetService } from '../services/draft/DraftAdSetService';
import { DraftAdService } from '../services/draft/DraftAdService';
import { DraftValidationEngine } from '../services/draft/DraftValidationEngine';
import { DraftPublishService } from '../services/draft/DraftPublishService';
import { BulkEditCompatibilityEngine, EntityLevel } from '../services/draft/BulkEditCompatibilityEngine';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../prisma';

function isFacebookAuthError(message: string): boolean {
  return message?.includes('OAuthException') || message?.includes('access token') || message?.includes('Session has expired');
}

export class DraftController {
  static async duplicateToDraft(req: Request, res: Response) {
    try {
      const { campaignId } = req.body;
      const authReq = req as AuthRequest;

      const draft = await DraftService.duplicateCampaignToDraft(campaignId, authReq.userId!, authReq.userAccessToken!);
      res.json(draft);
    } catch (error: any) {
      console.error(`[DraftController] Error in duplicateToDraft:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  static async listCampaigns(req: Request, res: Response) {
    try {
      const { userId } = req as AuthRequest;
      console.log(`[DraftController] Listing campaigns for user: ${userId}`);
      const drafts = await DraftCampaignService.listByUser(userId!);
      console.log(`[DraftController] Found ${drafts.length} drafts`);
      res.json(drafts);
    } catch (error: any) {
      console.error(`[DraftController] Error in listCampaigns:`, error);
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  }

  static async getCampaign(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const draft = await DraftCampaignService.getById(id);
      res.json(draft);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateCampaign(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
      console.log(`[DraftController] Updating campaign: ${id}`, req.body);
      const draft = await DraftCampaignService.update(id, req.body);
      res.json(draft);
    } catch (error: any) {
      console.error(`[DraftController] Error updating campaign ${id}:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  static async updateAdSet(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
      console.log(`[DraftController] Updating adset: ${id}`, req.body);
      const draft = await DraftAdSetService.update(id, req.body);
      res.json(draft);
    } catch (error: any) {
      console.error(`[DraftController] Error updating adset ${id}:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  static async updateAd(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
      console.log(`[DraftController] Updating ad: ${id}`, req.body);
      const draft = await DraftAdService.update(id, req.body);
      res.json(draft);
    } catch (error: any) {
      console.error(`[DraftController] Error updating ad ${id}:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  static async validateDraft(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const draft = await DraftCampaignService.getById(id);
      if (!draft) return res.status(404).json({ error: 'Draft not found' });

      const validation = await DraftValidationEngine.validateFullDraft(draft);
      
      // Save validation results back to DB
      await DraftCampaignService.update(id, { 
        validationErrors: validation.campaignErrors,
        status: validation.isValid ? 'READY' : 'VALIDATION_FAILED'
      });

      for (const adSetId in validation.adSetErrors) {
        await DraftAdSetService.update(adSetId, { validationErrors: validation.adSetErrors[adSetId] });
      }

      for (const adId in validation.adErrors) {
        await DraftAdService.update(adId, { validationErrors: validation.adErrors[adId] });
      }

      res.json(validation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async publishDraft(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const authReq = req as AuthRequest;

      const result = await DraftPublishService.publishCampaign(id, authReq.userAccessToken!);
      res.json(result);
    } catch (error: any) {
      console.error(`[DraftController] Error in publishDraft:`, error);
      if (isFacebookAuthError(error.message)) {
        return res.status(401).json({ error: error.message, code: 'TOKEN_EXPIRED' });
      }
      res.status(500).json({ error: error.message });
    }
  }

  static async bulkPublishDrafts(req: Request, res: Response) {
    try {
      const { campaignIds } = req.body as { campaignIds: string[] };
      const authReq = req as AuthRequest;

      if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
        return res.status(400).json({ error: 'campaignIds must be a non-empty array' });
      }

      const results: { id: string; success: boolean; metaCampaignId?: string; error?: string }[] = [];
      for (const id of campaignIds) {
        try {
          const result = await DraftPublishService.publishCampaign(id, authReq.userAccessToken!);
          results.push({ id, success: true, metaCampaignId: result.metaCampaignId });
        } catch (error: any) {
          if (isFacebookAuthError(error.message)) {
            return res.status(401).json({ error: error.message, code: 'TOKEN_EXPIRED' });
          }
          results.push({ id, success: false, error: error.message });
        }
      }

      res.json({ results });
    } catch (error: any) {
      console.error(`[DraftController] Error in bulkPublishDrafts:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteCampaign(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await DraftCampaignService.delete(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async bulkUpdateCampaigns(req: Request, res: Response) {
    try {
      const { campaignIds, updates } = req.body as {
        campaignIds: string[];
        updates: { objective?: string; data?: Record<string, any> };
      };
      const { userId } = req as AuthRequest;

      if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
        return res.status(400).json({ error: 'campaignIds must be a non-empty array' });
      }

      let updatedCount = 0;
      for (const id of campaignIds) {
        const current = await prisma.draftCampaign.findFirst({
          where: { id, userId, status: { not: 'PUBLISHING' } },
        });
        if (!current) continue;

        const updatePayload: any = { status: 'DRAFT' };
        if (updates.objective !== undefined) {
          updatePayload.objective = updates.objective;
        }
        if (updates.data) {
          updatePayload.data = { ...(current.data as any), ...updates.data };
        }

        await prisma.draftCampaign.update({ where: { id }, data: updatePayload });
        updatedCount++;
      }

      res.json({ updated: updatedCount });
    } catch (error: any) {
      console.error(`[DraftController] Error in bulkUpdateCampaigns:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  static async cleanupMetaObjects(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const authReq = req as AuthRequest;

      const result = await DraftPublishService.cleanupOrphanedMetaObjects(id, authReq.userAccessToken!);
      res.json(result);
    } catch (error: any) {
      console.error(`[DraftController] Error in cleanupMetaObjects:`, error);
      if (isFacebookAuthError(error.message)) {
        return res.status(401).json({ error: error.message, code: 'TOKEN_EXPIRED' });
      }
      res.status(500).json({ error: error.message });
    }
  }

  static async bulkDeleteDrafts(req: Request, res: Response) {
    try {
      const { campaignIds } = req.body as { campaignIds: string[] };
      const { userId } = req as AuthRequest;

      if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
        return res.status(400).json({ error: 'campaignIds must be a non-empty array' });
      }

      // Only delete campaigns that belong to this user and are not currently PUBLISHING
      const deleted = await prisma.draftCampaign.deleteMany({
        where: {
          id: { in: campaignIds },
          userId,
          status: { not: 'PUBLISHING' },
        },
      });

      res.json({ deleted: deleted.count });
    } catch (error: any) {
      console.error(`[DraftController] Error in bulkDeleteDrafts:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  static async bulkEditSchema(req: Request, res: Response) {
    try {
      const { draftIds, level = 'campaign' } = req.body as { draftIds: string[]; level?: EntityLevel };
      const { userId } = req as AuthRequest;

      if (!Array.isArray(draftIds) || draftIds.length === 0) {
        return res.status(400).json({ error: 'draftIds must be a non-empty array' });
      }

      let drafts: any[];
      if (level === 'campaign') {
        drafts = await prisma.draftCampaign.findMany({
          where: { id: { in: draftIds }, userId },
        });
      } else if (level === 'adSet') {
        drafts = await prisma.draftAdSet.findMany({
          where: { id: { in: draftIds } },
          include: { campaign: { select: { objective: true, data: true } } },
        });
        drafts = drafts.map((d: any) => ({
          ...d,
          campaignObjective: d.campaign?.objective,
          isCBO: !!(d.campaign?.data as any)?.is_adset_budget_sharing_enabled,
        }));
      } else {
        drafts = await prisma.draftAd.findMany({
          where: { id: { in: draftIds } },
        });
      }

      if (drafts.length === 0) {
        return res.status(404).json({ error: 'No drafts found' });
      }

      const schema = BulkEditCompatibilityEngine.computeBulkSchema(drafts, level);
      res.json(schema);
    } catch (error: any) {
      console.error(`[DraftController] Error in bulkEditSchema:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  static async bulkEditValidate(req: Request, res: Response) {
    try {
      const { draftIds, fieldUpdates, level = 'campaign' } = req.body as {
        draftIds: string[];
        fieldUpdates: Record<string, any>;
        level?: EntityLevel;
      };
      const { userId } = req as AuthRequest;

      if (!Array.isArray(draftIds) || draftIds.length === 0) {
        return res.status(400).json({ error: 'draftIds must be a non-empty array' });
      }

      let drafts: any[];
      if (level === 'campaign') {
        drafts = await prisma.draftCampaign.findMany({
          where: { id: { in: draftIds }, userId },
        });
      } else if (level === 'adSet') {
        drafts = await prisma.draftAdSet.findMany({
          where: { id: { in: draftIds } },
          include: { campaign: { select: { objective: true } } },
        });
        drafts = drafts.map((d: any) => ({ ...d, objective: d.campaign?.objective }));
      } else {
        drafts = await prisma.draftAd.findMany({ where: { id: { in: draftIds } } });
      }

      const result = BulkEditCompatibilityEngine.validateBulkEdit(drafts, fieldUpdates, level);
      res.json(result);
    } catch (error: any) {
      console.error(`[DraftController] Error in bulkEditValidate:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  static async bulkEditApply(req: Request, res: Response) {
    try {
      const { draftIds, fieldUpdates, level = 'campaign' } = req.body as {
        draftIds: string[];
        fieldUpdates: Record<string, any>;
        level?: EntityLevel;
      };
      const { userId } = req as AuthRequest;

      if (!Array.isArray(draftIds) || draftIds.length === 0) {
        return res.status(400).json({ error: 'draftIds must be a non-empty array' });
      }

      if (!fieldUpdates || Object.keys(fieldUpdates).length === 0) {
        return res.status(400).json({ error: 'fieldUpdates must be a non-empty object' });
      }

      let drafts: any[];
      if (level === 'campaign') {
        drafts = await prisma.draftCampaign.findMany({
          where: { id: { in: draftIds }, userId, status: { not: 'PUBLISHING' } },
        });
      } else if (level === 'adSet') {
        drafts = await prisma.draftAdSet.findMany({
          where: { id: { in: draftIds } },
          include: { campaign: { select: { objective: true, userId: true } } },
        });
        drafts = drafts.filter((d: any) => d.campaign?.userId === userId);
      } else {
        drafts = await prisma.draftAd.findMany({
          where: { id: { in: draftIds } },
          include: { adSet: { include: { campaign: { select: { userId: true } } } } },
        });
        drafts = drafts.filter((d: any) => d.adSet?.campaign?.userId === userId);
      }

      // Validate before applying
      const validation = BulkEditCompatibilityEngine.validateBulkEdit(drafts, fieldUpdates, level);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Validation failed',
          ...validation,
        });
      }

      // Apply updates
      const updates = BulkEditCompatibilityEngine.applyBulkEdit(drafts, fieldUpdates, level);
      let updatedCount = 0;

      for (const update of updates) {
        const updatePayload: any = { data: update.updatedData, status: 'DRAFT' };
        if (update.objective) updatePayload.objective = update.objective;

        if (level === 'campaign') {
          await prisma.draftCampaign.update({ where: { id: update.draftId }, data: updatePayload });
        } else if (level === 'adSet') {
          await prisma.draftAdSet.update({ where: { id: update.draftId }, data: { data: update.updatedData } });
        } else {
          await prisma.draftAd.update({ where: { id: update.draftId }, data: { data: update.updatedData } });
        }
        updatedCount++;
      }

      res.json({ updated: updatedCount, validation });
    } catch (error: any) {
      console.error(`[DraftController] Error in bulkEditApply:`, error);
      res.status(500).json({ error: error.message });
    }
  }
}
