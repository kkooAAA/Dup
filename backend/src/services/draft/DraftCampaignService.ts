import { prisma } from '../../prisma';
import { DraftStatus } from '@prisma/client';
import { IMMUTABLE_CAMPAIGN_FIELDS } from './MetaFieldRegistry';

export class DraftCampaignService {
  static async create(userId: string, adAccountId: string, name: string, objective: string, data: any) {
    return prisma.draftCampaign.create({
      data: {
        userId,
        adAccountId,
        name,
        objective,
        data,
        status: DraftStatus.DRAFT,
      },
    });
  }

  static async getById(id: string) {
    return prisma.draftCampaign.findUnique({
      where: { id },
      include: {
        adSets: {
          include: {
            ads: true,
          },
        },
      },
    });
  }

  static async listByUser(userId: string) {
    return prisma.draftCampaign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { adSets: true },
        },
      },
    });
  }

  static async update(id: string, updateData: any) {
    const { id: _id, adSets, user, createdAt, updatedAt, userId, _count, ...cleanData } = updateData;

    if (cleanData.data) {
      const existing = await prisma.draftCampaign.findUnique({ where: { id } });
      if (existing?.metaId && typeof cleanData.data === 'object') {
        const existingData = existing.data as any;
        const warnings: string[] = [];
        for (const field of IMMUTABLE_CAMPAIGN_FIELDS) {
          if (cleanData.data[field] !== undefined &&
              existingData[field] !== undefined &&
              JSON.stringify(cleanData.data[field]) !== JSON.stringify(existingData[field])) {
            warnings.push(`${field} is immutable on Meta and will not be updated when re-published`);
            if (existingData[`_original_${field}`] === undefined) {
              cleanData.data[`_original_${field}`] = existingData[field];
            } else {
              cleanData.data[`_original_${field}`] = existingData[`_original_${field}`];
            }
          } else if (existingData[`_original_${field}`] !== undefined) {
            cleanData.data[`_original_${field}`] = existingData[`_original_${field}`];
          }
        }
        if (warnings.length > 0) {
          console.warn(`[DraftCampaignService] Immutable field edit on published draft ${id}:`, warnings);
        }
      }
    }

    return prisma.draftCampaign.update({
      where: { id },
      data: cleanData,
    });
  }

  static async delete(id: string) {
    return prisma.draftCampaign.delete({
      where: { id },
    });
  }
}
