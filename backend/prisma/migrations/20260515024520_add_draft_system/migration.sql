-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('DRAFT', 'READY', 'VALIDATION_FAILED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "DraftCampaign" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT,
    "status" "DraftStatus" NOT NULL DEFAULT 'DRAFT',
    "metaId" TEXT,
    "data" JSONB NOT NULL,
    "validationErrors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftAdSet" (
    "id" TEXT NOT NULL,
    "draftCampaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "DraftStatus" NOT NULL DEFAULT 'DRAFT',
    "metaId" TEXT,
    "data" JSONB NOT NULL,
    "validationErrors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftAdSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftAd" (
    "id" TEXT NOT NULL,
    "draftAdSetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "DraftStatus" NOT NULL DEFAULT 'DRAFT',
    "metaId" TEXT,
    "data" JSONB NOT NULL,
    "validationErrors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftAd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftPublishLog" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "draftType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "payload" JSONB,
    "response" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DraftPublishLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DraftCampaign" ADD CONSTRAINT "DraftCampaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftAdSet" ADD CONSTRAINT "DraftAdSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftAdSet" ADD CONSTRAINT "DraftAdSet_draftCampaignId_fkey" FOREIGN KEY ("draftCampaignId") REFERENCES "DraftCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftAd" ADD CONSTRAINT "DraftAd_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftAd" ADD CONSTRAINT "DraftAd_draftAdSetId_fkey" FOREIGN KEY ("draftAdSetId") REFERENCES "DraftAdSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
