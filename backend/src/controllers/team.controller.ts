import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import crypto from 'crypto';

export const getTeam = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { teamId: true, role: true } });
    if (!user?.teamId) return res.status(404).json({ message: 'No team found' });

    const team = await prisma.team.findUnique({
      where: { id: user.teamId },
      include: {
        members: { select: { id: true, name: true, email: true, role: true }, orderBy: { createdAt: 'asc' } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    if (!team) return res.status(404).json({ message: 'Team not found' });

    res.json({
      id: team.id,
      name: team.name,
      inviteCode: user.role === 'admin' ? team.inviteCode : undefined,
      ownerId: team.ownerId,
      members: team.members,
      memberCount: team.members.length,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to load team', detail: error?.message });
  }
};

export const updateTeam = async (req: AuthRequest, res: Response) => {
  if (req.userRole !== 'admin') return res.status(403).json({ message: 'Admin only' });

  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Team name is required' });

  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { teamId: true } });
    if (!user?.teamId) return res.status(404).json({ message: 'No team found' });

    const team = await prisma.team.update({ where: { id: user.teamId }, data: { name: name.trim() } });
    res.json({ id: team.id, name: team.name });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update team', detail: error?.message });
  }
};

export const regenerateInviteCode = async (req: AuthRequest, res: Response) => {
  if (req.userRole !== 'admin') return res.status(403).json({ message: 'Admin only' });

  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { teamId: true } });
    if (!user?.teamId) return res.status(404).json({ message: 'No team found' });

    const newCode = crypto.randomBytes(4).toString('hex');
    const team = await prisma.team.update({ where: { id: user.teamId }, data: { inviteCode: newCode } });
    res.json({ inviteCode: team.inviteCode });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to regenerate invite code', detail: error?.message });
  }
};

export const removeMember = async (req: AuthRequest, res: Response) => {
  if (req.userRole !== 'admin') return res.status(403).json({ message: 'Admin only' });

  const memberId = req.params.memberId as string;
  if (memberId === req.userId) return res.status(400).json({ message: 'Cannot remove yourself' });

  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { teamId: true } });
    if (!user?.teamId) return res.status(404).json({ message: 'No team found' });

    const member = await prisma.user.findFirst({ where: { id: memberId, teamId: user.teamId } });
    if (!member) return res.status(404).json({ message: 'Member not found in your team' });

    await prisma.user.update({ where: { id: memberId }, data: { teamId: null } });

    res.json({ message: 'Member removed' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to remove member', detail: error?.message });
  }
};
