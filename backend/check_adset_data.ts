import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const campaign = await prisma.draftCampaign.findUnique({
    where: { id: 'cmpg929vr0009yxpk2shfv6xu' },
    include: {
      adSets: true
    }
  });

  if (!campaign) {
    console.log("Campaign not found");
    return;
  }

  for (const adSet of campaign.adSets) {
    console.log(`AdSet ${adSet.id} metaId: ${adSet.metaId}`);
    const data = adSet.data as any;
    console.log("Keys in data:", Object.keys(data));
    console.log("_original_destination_type:", data._original_destination_type);
    console.log("destination_type:", data.destination_type);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
