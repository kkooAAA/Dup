import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';

// CSRF posture: JWTs are read from the `Authorization: Bearer …` header
// (not from a cookie), so a cross-site form/script cannot attach the
// credential automatically — traditional CSRF does not apply here.

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export interface AuthRequest extends Request {
  userId?: string;
  teamId?: string;
  profileId?: string;
  userAccessToken?: string;
  userRole?: string;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    console.log(`[Auth] Missing token for: ${req.method} ${req.url}`);
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; teamId?: string };
    req.userId = decoded.userId;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        team: {
          include: {
            owner: {
              select: { accessToken: true, accessTokenExpiresAt: true }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found', code: 'TOKEN_EXPIRED' });
    }

    req.teamId = user.teamId || decoded.teamId || undefined;
    req.userRole = user.role;

    const ownerToken = user.team?.owner?.accessToken;
    const ownerExpiry = user.team?.owner?.accessTokenExpiresAt;

    if (!ownerToken) {
      return res.status(401).json({ message: 'No Meta access token. Ask your team admin to connect Facebook.', code: 'TOKEN_EXPIRED' });
    }

    if (ownerExpiry) {
      const now = Date.now();
      const expiresAt = ownerExpiry.getTime();
      if (now >= expiresAt) {
        return res.status(401).json({ message: 'Facebook access token has expired. Ask your team admin to reconnect.', code: 'TOKEN_EXPIRED' });
      }
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      if (expiresAt - now < sevenDaysMs) {
        res.setHeader('X-Token-Expiry-Warning', ownerExpiry.toISOString());
      }
    }

    req.userAccessToken = ownerToken;

    const profileId = req.headers['x-profile-id'] as string | undefined;
    if (profileId) {
      req.profileId = profileId;
    }

    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
