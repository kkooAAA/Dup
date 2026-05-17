import { Request, Response } from 'express';
import { WideCreationService, WideCreationTemplate } from '../services/draft/WideCreationService';
import { AuthRequest } from '../middleware/auth.middleware';

export class WideCreationController {
  static async validate(req: Request, res: Response) {
    try {
      const template = req.body as WideCreationTemplate;
      const result = WideCreationService.validateTemplate(template);
      res.json(result);
    } catch (error: any) {
      console.error(`[WideCreation] Error in validate:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  static async generate(req: Request, res: Response) {
    try {
      const template = req.body as WideCreationTemplate;
      const authReq = req as AuthRequest;

      // Structural checks only (adAccountId, campaigns exist, valid objectives)
      if (!template.adAccountId) {
        return res.status(400).json({ error: 'adAccountId is required' });
      }
      if (!template.campaigns || template.campaigns.length === 0) {
        return res.status(400).json({ error: 'At least one campaign is required' });
      }

      const result = await WideCreationService.generateFromTemplate(template, authReq.userId!);
      res.json(result);
    } catch (error: any) {
      console.error(`[WideCreation] Error in generate:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  static async bulkApplyFields(req: Request, res: Response) {
    try {
      const { entityIds, entityType, fieldUpdates, cascadeToChildren } = req.body as {
        entityIds: string[];
        entityType: 'campaign' | 'adSet' | 'ad';
        fieldUpdates: Record<string, any>;
        cascadeToChildren?: boolean;
      };

      if (!Array.isArray(entityIds) || entityIds.length === 0) {
        return res.status(400).json({ error: 'entityIds must be a non-empty array' });
      }
      if (!fieldUpdates || Object.keys(fieldUpdates).length === 0) {
        return res.status(400).json({ error: 'fieldUpdates must be a non-empty object' });
      }

      const result = await WideCreationService.bulkApplyFields(
        entityIds, entityType, fieldUpdates, cascadeToChildren,
      );
      res.json(result);
    } catch (error: any) {
      console.error(`[WideCreation] Error in bulkApplyFields:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getTree(req: Request, res: Response) {
    try {
      const { campaignIds } = req.body as { campaignIds: string[] };

      if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
        return res.status(400).json({ error: 'campaignIds must be a non-empty array' });
      }

      const tree = await WideCreationService.getTreeStructure(campaignIds);
      res.json(tree);
    } catch (error: any) {
      console.error(`[WideCreation] Error in getTree:`, error);
      res.status(500).json({ error: error.message });
    }
  }
}
