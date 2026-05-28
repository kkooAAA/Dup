-- AlterTable: make facebookId optional and add new User fields
ALTER TABLE "User" ALTER COLUMN "facebookId" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'member';
ALTER TABLE "User" ADD COLUMN "teamId" TEXT;

-- CreateTable: Team
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DraftShare
CREATE TABLE "DraftShare" (
    "id" TEXT NOT NULL,
    "draftCampaignId" TEXT NOT NULL,
    "sharedByUserId" TEXT NOT NULL,
    "sharedWithUserId" TEXT NOT NULL,
    "permission" TEXT NOT NULL DEFAULT 'view',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DraftShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_inviteCode_key" ON "Team"("inviteCode");
CREATE UNIQUE INDEX "Team_ownerId_key" ON "Team"("ownerId");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "DraftShare_draftCampaignId_sharedWithUserId_key" ON "DraftShare"("draftCampaignId", "sharedWithUserId");
CREATE INDEX "DraftShare_sharedWithUserId_idx" ON "DraftShare"("sharedWithUserId");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DraftShare" ADD CONSTRAINT "DraftShare_draftCampaignId_fkey" FOREIGN KEY ("draftCampaignId") REFERENCES "DraftCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DraftShare" ADD CONSTRAINT "DraftShare_sharedByUserId_fkey" FOREIGN KEY ("sharedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DraftShare" ADD CONSTRAINT "DraftShare_sharedWithUserId_fkey" FOREIGN KEY ("sharedWithUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Data migration: create a team for each existing user and set them as admin
DO $$
DECLARE
    r RECORD;
    team_id TEXT;
    invite TEXT;
BEGIN
    FOR r IN SELECT id, name FROM "User" WHERE "teamId" IS NULL
    LOOP
        team_id := gen_random_uuid()::text;
        invite := substr(md5(random()::text), 1, 8);
        INSERT INTO "Team" ("id", "name", "inviteCode", "ownerId", "createdAt", "updatedAt")
        VALUES (team_id, COALESCE(r.name, 'My Team') || '''s Team', invite, r.id, NOW(), NOW());
        UPDATE "User" SET "teamId" = team_id, "role" = 'admin' WHERE id = r.id;
    END LOOP;
END $$;
