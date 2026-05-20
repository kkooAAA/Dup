import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../prisma';
import { FacebookService } from '../services/facebook.service';
import axios from 'axios';

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, facebookId: true, name: true, email: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const getTokenStatus = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { accessToken: true },
    });
    if (!user?.accessToken) {
      return res.json({ valid: false, message: 'No access token stored' });
    }

    const fbRes = await axios.get(
      `https://graph.facebook.com/debug_token?input_token=${user.accessToken}&access_token=${user.accessToken}`
    );
    const data = fbRes.data?.data;
    res.json({
      valid: data?.is_valid ?? false,
      expiresAt: data?.expires_at ? new Date(data.expires_at * 1000).toISOString() : null,
      scopes: data?.scopes || [],
    });
  } catch (error: any) {
    res.json({ valid: false, message: 'Token validation failed' });
  }
};

export const getStats = async (req: AuthRequest, res: Response) => {
  try {
    const [draftCount, publishedCount, jobCount] = await Promise.all([
      prisma.draftCampaign.count({ where: { userId: req.userId, status: { not: 'PUBLISHED' } } }),
      prisma.draftCampaign.count({ where: { userId: req.userId, status: 'PUBLISHED' } }),
      prisma.duplicateJob.count({ where: { userId: req.userId } }),
    ]);

    let accountCount = 0;
    try {
      const fbService = new FacebookService(req.userAccessToken!);
      const accounts = await fbService.getAdAccounts();
      accountCount = accounts.length;
    } catch {
      // Token may be invalid — just show 0
    }

    res.json({ draftCount, publishedCount, jobCount, accountCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.$transaction([
      prisma.draftAd.deleteMany({ where: { userId: req.userId } }),
      prisma.draftAdSet.deleteMany({ where: { userId: req.userId } }),
      prisma.draftCampaign.deleteMany({ where: { userId: req.userId } }),
      prisma.duplicateJob.deleteMany({ where: { userId: req.userId } }),
      prisma.namingTemplate.deleteMany({ where: { userId: req.userId } }),
      prisma.facebookAccount.deleteMany({ where: { userId: req.userId } }),
      prisma.user.delete({ where: { id: req.userId } }),
    ]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
};
