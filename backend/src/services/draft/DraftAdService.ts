import { prisma } from '../../prisma';
import { DraftStatus } from '@prisma/client';

function throwNotFound(entity: string): never {
  const err: any = new Error(`${entity} not found`);
  err.notFound = true;
  throw err;
}

export class DraftAdService {
  static async create(userId: string, adAccountId: string, draftAdSetId: string, name: string, data: any) {
    return prisma.draftAd.create({
      data: {
        userId,
        adAccountId,
        draftAdSetId,
        name,
        data,
        status: DraftStatus.DRAFT,
      },
    });
  }

  static async getById(id: string, userId?: string) {
    if (userId) {
      return prisma.draftAd.findFirst({
        where: { id, userId },
        include: { adSet: { include: { campaign: true } } },
      });
    }
    return prisma.draftAd.findUnique({
      where: { id },
      include: { adSet: { include: { campaign: true } } },
    });
  }

  static async update(id: string, updateData: any, userId?: string) {
    if (userId) {
      const exists = await prisma.draftAd.findFirst({ where: { id, userId } });
      if (!exists) throwNotFound('Ad');
    }

    const cleanData: any = {};
    const allowedFields = ['name', 'status', 'data', 'validationErrors', 'metaId', 'adAccountId'];
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        cleanData[field] = updateData[field];
      }
    }

    return prisma.draftAd.update({
      where: { id },
      data: cleanData,
    });
  }

  static async delete(id: string, userId?: string) {
    if (userId) {
      const exists = await prisma.draftAd.findFirst({ where: { id, userId } });
      if (!exists) throwNotFound('Ad');
    }
    return prisma.draftAd.delete({
      where: { id },
    });
  }
}
