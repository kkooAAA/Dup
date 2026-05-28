import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../prisma';

export class ProfileController {
  static async listProfiles(req: AuthRequest, res: Response) {
    try {
      if (!req.teamId) return res.status(400).json({ error: 'No team found' });
      const profiles = await prisma.profile.findMany({
        where: { teamId: req.teamId },
        orderBy: { createdAt: 'asc' },
        include: {
          _count: { select: { draftCampaigns: true } },
        },
      });
      res.json(profiles);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createProfile(req: AuthRequest, res: Response) {
    try {
      if (!req.teamId) return res.status(400).json({ error: 'No team found' });
      const { name } = req.body;
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Profile name is required' });
      }
      const profile = await prisma.profile.create({
        data: { name: name.trim(), teamId: req.teamId },
      });
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteProfile(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id as string;
      if (!req.teamId) return res.status(400).json({ error: 'No team found' });

      const profile = await prisma.profile.findFirst({ where: { id, teamId: req.teamId } });
      if (!profile) return res.status(404).json({ error: 'Profile not found' });

      const draftCount = await prisma.draftCampaign.count({ where: { profileId: id } });
      if (draftCount > 0) {
        return res.status(400).json({ error: `Cannot delete profile with ${draftCount} draft(s). Delete drafts first.` });
      }

      await prisma.profile.delete({ where: { id } });
      res.json({ message: 'Profile deleted' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
