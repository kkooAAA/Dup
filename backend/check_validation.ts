import { PrismaClient } from '@prisma/client';
import { DraftValidationEngine } from './src/services/draft/DraftValidationEngine';

const prisma = new PrismaClient();

async function check() {
  const campaign = await prisma.draftCampaign.findUnique({
    where: { id: 'cmpg929vr0009yxpk2shfv6xu' },
    include: {
      adSets: {
        include: { ads: true }
      }
    }
  });

  if (!campaign) {
    console.log("Campaign not found");
    return;
  }

  console.log("Campaign objective:", campaign.data.objective || campaign.objective);
  for (const adSet of campaign.adSets) {
    console.log("AdSet", adSet.id, "DestType:", (adSet.data as any).destination_type);
    for (const ad of adSet.ads) {
      console.log("Ad", ad.id, "Creative:", JSON.stringify((ad.data as any).creative));
    }
  }

  const result = await DraftValidationEngine.validateFullDraft(campaign);
  console.log("Validation isValid:", result.isValid);
  console.log("Ad Errors:", JSON.stringify(result.adErrors, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
