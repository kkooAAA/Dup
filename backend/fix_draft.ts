import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fix() {
  const adSets = await prisma.draftAdSet.findMany({
    where: { draftCampaignId: 'cmpg929vr0009yxpk2shfv6xu' }
  });

  for (const adSet of adSets) {
    if (adSet.metaId) {
      const data = adSet.data as any;
      if (data.destination_type === 'APP' && data._original_destination_type === undefined) {
        data._original_destination_type = 'MESSENGER';
        await prisma.draftAdSet.update({
          where: { id: adSet.id },
          data: { data }
        });
        console.log(`Fixed AdSet ${adSet.id}`);
      }
    }
  }
}

fix().catch(console.error).finally(() => prisma.$disconnect());
