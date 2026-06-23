-- Existing teams stay setup-complete. New teams explicitly begin incomplete in application code.
ALTER TABLE "Team"
ADD COLUMN "timeZone" TEXT,
ADD COLUMN "scheduleSetupCompleted" BOOLEAN NOT NULL DEFAULT true;

CREATE TYPE "ScheduleWeekKind" AS ENUM ('GAME', 'BYE');
CREATE TYPE "GamePreparationStatus" AS ENUM ('SETUP', 'GENERATED', 'ACCEPTED', 'STARTED');
ALTER TYPE "GameStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

ALTER TABLE "Game"
ADD COLUMN "preparationStatus" "GamePreparationStatus" NOT NULL DEFAULT 'SETUP';

ALTER TABLE "GameLineup"
ALTER COLUMN "battingOrderPosition" DROP NOT NULL;

CREATE TABLE "ScheduleWeek" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "kind" "ScheduleWeekKind" NOT NULL,
  "localDate" TEXT NOT NULL,
  "gameId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScheduleWeek_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScheduleWeek_gameId_key" ON "ScheduleWeek"("gameId");
CREATE UNIQUE INDEX "ScheduleWeek_seasonId_position_key" ON "ScheduleWeek"("seasonId", "position");
CREATE INDEX "ScheduleWeek_teamId_idx" ON "ScheduleWeek"("teamId");
CREATE INDEX "ScheduleWeek_seasonId_idx" ON "ScheduleWeek"("seasonId");

ALTER TABLE "ScheduleWeek"
ADD CONSTRAINT "ScheduleWeek_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "ScheduleWeek_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "ScheduleWeek_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
