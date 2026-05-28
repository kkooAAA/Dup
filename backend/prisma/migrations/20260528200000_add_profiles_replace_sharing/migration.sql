-- Create Profile table
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Profile_teamId_idx" ON "Profile"("teamId");
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old foreign keys BEFORE updating values
ALTER TABLE "DraftCampaign" DROP CONSTRAINT IF EXISTS "DraftCampaign_userId_fkey";
ALTER TABLE "DraftAdSet" DROP CONSTRAINT IF EXISTS "DraftAdSet_userId_fkey";
ALTER TABLE "DraftAd" DROP CONSTRAINT IF EXISTS "DraftAd_userId_fkey";

-- Create a default profile for each team user and migrate draft ownership
DO $$
DECLARE
    r RECORD;
    profile_id TEXT;
BEGIN
    FOR r IN SELECT DISTINCT u."id" AS user_id, u."name", u."teamId"
             FROM "User" u
             WHERE u."teamId" IS NOT NULL
    LOOP
        profile_id := 'prof_' || substr(md5(r.user_id), 1, 20);
        INSERT INTO "Profile" ("id", "name", "teamId", "createdAt")
        VALUES (profile_id, COALESCE(r."name", 'Default'), r."teamId", NOW())
        ON CONFLICT DO NOTHING;

        UPDATE "DraftCampaign" SET "userId" = profile_id WHERE "userId" = r.user_id;
        UPDATE "DraftAdSet" SET "userId" = profile_id WHERE "userId" = r.user_id;
        UPDATE "DraftAd" SET "userId" = profile_id WHERE "userId" = r.user_id;
    END LOOP;
END $$;

-- Rename userId to profileId
ALTER TABLE "DraftCampaign" RENAME COLUMN "userId" TO "profileId";
ALTER TABLE "DraftAdSet" RENAME COLUMN "userId" TO "profileId";
ALTER TABLE "DraftAd" RENAME COLUMN "userId" TO "profileId";

-- Add new foreign keys pointing to Profile
ALTER TABLE "DraftCampaign" ADD CONSTRAINT "DraftCampaign_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DraftAdSet" ADD CONSTRAINT "DraftAdSet_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DraftAd" ADD CONSTRAINT "DraftAd_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Recreate indexes with new column name
DROP INDEX IF EXISTS "DraftCampaign_userId_status_idx";
DROP INDEX IF EXISTS "DraftCampaign_userId_createdAt_idx";
DROP INDEX IF EXISTS "DraftAdSet_userId_idx";
DROP INDEX IF EXISTS "DraftAdSet_userId_status_idx";
DROP INDEX IF EXISTS "DraftAd_userId_idx";
DROP INDEX IF EXISTS "DraftAd_userId_status_idx";

CREATE INDEX "DraftCampaign_profileId_status_idx" ON "DraftCampaign"("profileId", "status");
CREATE INDEX "DraftCampaign_profileId_createdAt_idx" ON "DraftCampaign"("profileId", "createdAt" DESC);
CREATE INDEX "DraftAdSet_profileId_idx" ON "DraftAdSet"("profileId");
CREATE INDEX "DraftAdSet_profileId_status_idx" ON "DraftAdSet"("profileId", "status");
CREATE INDEX "DraftAd_profileId_idx" ON "DraftAd"("profileId");
CREATE INDEX "DraftAd_profileId_status_idx" ON "DraftAd"("profileId", "status");

-- Drop DraftShare table (no longer needed)
DROP TABLE IF EXISTS "DraftShare";
