import { prisma } from '../../prisma';
import { DraftStatus } from '@prisma/client';
import { IMMUTABLE_CAMPAIGN_FIELDS } from './MetaFieldRegistry';

function throwNotFound(entity: string): never {
  const err: any = new Error(`${entity} not found`);
  err.notFound = true;
  throw err;
}

export class DraftCampaignService {
  static async create(profileId: string, adAccountId: string, name: string, objective: string, data: any) {
    return prisma.draftCampaign.create({
      data: {
        profileId,
        adAccountId,
        name,
        objective,
        data,
        status: DraftStatus.DRAFT,
      },
    });
  }

  static async getById(id: string, profileId?: string) {
    if (profileId) {
      return prisma.draftCampaign.findFirst({
        where: { id, profileId },
        include: {
          adSets: {
            include: {
              ads: true,
            },
          },
        },
      });
    }
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

  static async listByProfile(profileId: string, page = 1, pageSize = 50) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      prisma.draftCampaign.findMany({
        where: { profileId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          _count: { select: { adSets: true } },
          adSets: { select: { _count: { select: { ads: true } } } },
        },
      }),
      prisma.draftCampaign.count({ where: { profileId } }),
    ]);
    const enriched = items.map(({ adSets, ...rest }) => ({
      ...rest,
      _count: { ...rest._count, ads: adSets.reduce((sum, s) => sum + s._count.ads, 0) },
    }));
    return { items: enriched, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  static async update(id: string, updateData: any, profileId?: string) {
    const cleanData: any = {};
    const allowedFields = ['name', 'status', 'data', 'validationErrors', 'metaId', 'adAccountId', 'objective'];
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        cleanData[field] = updateData[field];
      }
    }

    if (cleanData.data) {
      const existing = profileId
        ? await prisma.draftCampaign.findFirst({ where: { id, profileId } })
        : await prisma.draftCampaign.findUnique({ where: { id } });
      if (profileId && !existing) throwNotFound('Campaign');
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
    } else if (profileId) {
      const exists = await prisma.draftCampaign.findFirst({ where: { id, profileId } });
      if (!exists) throwNotFound('Campaign');
    }

    return prisma.draftCampaign.update({
      where: { id },
      data: cleanData,
    });
  }

  static async delete(id: string, profileId?: string) {
    if (profileId) {
      const exists = await prisma.draftCampaign.findFirst({ where: { id, profileId } });
      if (!exists) throwNotFound('Campaign');
    }
    return prisma.draftCampaign.delete({
      where: { id },
    });
  }
}
