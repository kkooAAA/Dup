import { Request, Response } from 'express';
import { prisma, withRetry } from '../prisma';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config';

function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex');
}

function signToken(userId: string, teamId: string): string {
  return jwt.sign({ userId, teamId }, config.jwtSecret, { expiresIn: '60d' });
}

export const loginWithFacebook = async (req: Request, res: Response) => {
  const { accessToken } = req.body;

  try {
    const fbResponse = await axios.get(`https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`);
    const { id, name, email } = fbResponse.data;

    let tokenToStore = accessToken;
    let tokenExpiresAt: Date | undefined;
    const appId = process.env.FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;
    if (appId && appSecret) {
      try {
        const exchangeResponse = await axios.get('https://graph.facebook.com/oauth/access_token', {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: appId,
            client_secret: appSecret,
            fb_exchange_token: accessToken,
          },
        });
        tokenToStore = exchangeResponse.data.access_token;
        if (exchangeResponse.data.expires_in) {
          tokenExpiresAt = new Date(Date.now() + exchangeResponse.data.expires_in * 1000);
        }
        console.log('[Auth] Successfully exchanged for long-lived token');
      } catch (exchangeError) {
        console.warn('[Auth] Could not exchange for long-lived token, using original:', exchangeError);
      }
    }

    let user = await withRetry(() => prisma.user.findUnique({
      where: { facebookId: id },
      include: { ownedTeam: true }
    }));

    if (!user) {
      user = await withRetry(() => prisma.user.create({
        data: { facebookId: id, name, email, accessToken: tokenToStore, accessTokenExpiresAt: tokenExpiresAt, role: 'admin' },
        include: { ownedTeam: true }
      }));
    } else {
      user = await withRetry(() => prisma.user.update({
        where: { id: user!.id },
        data: { name, email, accessToken: tokenToStore, accessTokenExpiresAt: tokenExpiresAt },
        include: { ownedTeam: true }
      }));
    }

    let teamId = user.teamId;
    if (!user.ownedTeam) {
      const team = await prisma.team.create({
        data: {
          name: `${name || 'My'}'s Team`,
          inviteCode: generateInviteCode(),
          ownerId: user.id,
        }
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { teamId: team.id, role: 'admin' },
      });
      teamId = team.id;
    }

    const token = signToken(user.id, teamId!);
    res.json({ token, user: { id: user.id, facebookId: user.facebookId, name: user.name, email: user.email, role: user.role, teamId } });
  } catch (error: any) {
    console.error('FB Login Error:', error);
    const prismaCode = error?.code;
    if (prismaCode === 'P1001' || prismaCode === 'P1017' || prismaCode === 'P1002') {
      return res.status(503).json({ message: 'Database unavailable. Please try again in a moment.' });
    }
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      return res.status(401).json({ message: 'Invalid Facebook token' });
    }
    res.status(500).json({ message: 'Login failed', detail: error?.message });
  }
};

