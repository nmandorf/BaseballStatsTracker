ALTER TABLE "Team"
ADD COLUMN "ownerUid" TEXT NOT NULL DEFAULT 'legacy',
ADD COLUMN "ownerEmail" TEXT;

ALTER TABLE "Team" DROP CONSTRAINT IF EXISTS "Team_name_key";

CREATE UNIQUE INDEX "Team_ownerUid_name_key" ON "Team"("ownerUid", "name");
CREATE INDEX "Team_ownerUid_idx" ON "Team"("ownerUid");
