import { Request, Response } from 'express';
import { prisma, withRetry } from '../prisma';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex');
}

function signToken(userId: string, teamId: string): string {
  return jwt.sign({ userId, teamId }, JWT_SECRET, { expiresIn: '60d' });
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

export const registerWithEmail = async (req: Request, res: Response) => {
  const { email, password, name, facebookAccessToken } = req.body;

  if (!email || !password || !name || !facebookAccessToken) {
    return res.status(400).json({ message: 'All fields are required: email, password, name, facebookAccessToken' });
  }

  try {
    // Verify the Facebook token and get the FB user ID
    const fbResponse = await axios.get(`https://graph.facebook.com/me?fields=id&access_token=${facebookAccessToken}`);
    const fbId = fbResponse.data.id;

    // Find the team owner with this Facebook ID
    const owner = await prisma.user.findUnique({
      where: { facebookId: fbId },
      include: { ownedTeam: true },
    });
    if (!owner?.ownedTeam) {
      return res.status(400).json({ message: 'No team found for this Facebook account. The admin must log in with Facebook first.' });
    }
    const team = owner.ownedTeam;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: 'member',
        teamId: team.id,
      },
    });

    const token = signToken(user.id, team.id);
    res.json({ token, user: { id: user.id, facebookId: null, name: user.name, email: user.email, role: user.role, teamId: team.id } });
  } catch (error: any) {
    console.error('Register Error:', error);
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      return res.status(401).json({ message: 'Invalid Facebook token' });
    }
    if (error?.code === 'P2002') {
      return res.status(400).json({ message: 'Email already registered' });
    }
    res.status(500).json({ message: 'Registration failed', detail: error?.message });
  }
};

export const loginWithEmail = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user.id, user.teamId!);
    res.json({ token, user: { id: user.id, facebookId: user.facebookId, name: user.name, email: user.email, role: user.role, teamId: user.teamId } });
  } catch (error: any) {
    console.error('Email Login Error:', error);
    res.status(500).json({ message: 'Login failed', detail: error?.message });
  }
};
