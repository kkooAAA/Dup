import { prisma } from '../../prisma';
import { DraftStatus } from '@prisma/client';

export class DraftAdSetService {
  static async create(userId: string, adAccountId: string, draftCampaignId: string, name: string, data: any) {
    return prisma.draftAdSet.create({
      data: {
        userId,
        adAccountId,
        draftCampaignId,
        name,
        data,
        status: DraftStatus.DRAFT,
      },
    });
  }

  static async getById(id: string) {
    return prisma.draftAdSet.findUnique({
      where: { id },
      include: {
        ads: true,
        campaign: true,
      },
    });
  }

  static async update(id: string, updateData: any) {
    const { id: _id, ads, campaign, user, createdAt, updatedAt, userId, draftCampaignId, _count, ...cleanData } = updateData;
    
    if (cleanData.data) {
      const existing = await prisma.draftAdSet.findUnique({ where: { id } });
      if (existing?.metaId && typeof cleanData.data === 'object') {
        const existingData = existing.data as any;
        const { IMMUTABLE_ADSET_FIELDS } = require('./MetaFieldRegistry');
        for (const field of IMMUTABLE_ADSET_FIELDS) {
          if (cleanData.data[field] !== undefined &&
              existingData[field] !== undefined &&
              JSON.stringify(cleanData.data[field]) !== JSON.stringify(existingData[field])) {
            if (existingData[`_original_${field}`] === undefined) {
              cleanData.data[`_original_${field}`] = existingData[field];
            } else {
              cleanData.data[`_original_${field}`] = existingData[`_original_${field}`];
            }
          } else if (existingData[`_original_${field}`] !== undefined) {
            cleanData.data[`_original_${field}`] = existingData[`_original_${field}`];
          }
        }
      }
    }

    return prisma.draftAdSet.update({
      where: { id },
      data: cleanData,
    });
  }

  static async delete(id: string) {
    return prisma.draftAdSet.delete({
      where: { id },
    });
  }
}
