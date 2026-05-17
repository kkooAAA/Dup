import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDrafts() {
  console.log('Cleaning up draft data...');

  const [ads, adSets, campaigns, logs] = await prisma.$transaction([
    prisma.draftAd.deleteMany({}),
    prisma.draftAdSet.deleteMany({}),
    prisma.draftCampaign.deleteMany({}),
    prisma.draftPublishLog.deleteMany({}),
  ]);

  console.log(
    `Deleted: ${campaigns.count} campaigns, ${adSets.count} ad sets, ${ads.count} ads, ${logs.count} publish logs`
  );
  await prisma.$disconnect();
}

cleanupDrafts().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
