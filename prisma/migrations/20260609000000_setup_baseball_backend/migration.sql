-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BattingSide" AS ENUM ('RIGHT', 'LEFT', 'SWITCH', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ThrowingSide" AS ENUM ('RIGHT', 'LEFT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "SpeedRating" AS ENUM ('FAST', 'AVERAGE', 'SLOW');

-- CreateEnum
CREATE TYPE "InningHalf" AS ENUM ('TOP', 'BOTTOM');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'FINAL');

-- CreateEnum
CREATE TYPE "GameResult" AS ENUM ('WIN', 'LOSS', 'TIE');

-- CreateEnum
CREATE TYPE "BatterResult" AS ENUM ('SINGLE', 'DOUBLE', 'TRIPLE', 'HOME_RUN', 'WALK', 'REACHED_ON_ERROR', 'FIELDERS_CHOICE', 'SAC_FLY', 'OUT', 'DOUBLE_PLAY');

-- CreateEnum
CREATE TYPE "RunnerStart" AS ENUM ('BATTER', 'FIRST', 'SECOND', 'THIRD');

-- CreateEnum
CREATE TYPE "RunnerEnd" AS ENUM ('FIRST', 'SECOND', 'THIRD', 'HOME', 'OUT');

-- CreateEnum
CREATE TYPE "AdvanceReason" AS ENUM ('HIT', 'WALK', 'ERROR', 'FIELDERS_CHOICE', 'SAC_FLY', 'OUT', 'RUNNER_DECISION');

-- CreateEnum
CREATE TYPE "HomeRunLimitOutcome" AS ENUM ('OUT', 'SINGLE', 'OTHER');

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "label" TEXT,
    "startsOn" TIMESTAMP(3),
    "endsOn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bats" "BattingSide" NOT NULL DEFAULT 'UNKNOWN',
    "throws" "ThrowingSide" NOT NULL DEFAULT 'UNKNOWN',
    "primaryPosition" TEXT,
    "speedRating" "SpeedRating" NOT NULL DEFAULT 'AVERAGE',
    "notes" TEXT,
    "contactNotes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "roleHint" TEXT,
    "seedOrder" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "seasonId" TEXT,
    "opponent" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isHome" BOOLEAN NOT NULL DEFAULT true,
    "teamScore" INTEGER NOT NULL DEFAULT 0,
    "opponentScore" INTEGER NOT NULL DEFAULT 0,
    "inning" INTEGER NOT NULL DEFAULT 1,
    "half" "InningHalf" NOT NULL DEFAULT 'TOP',
    "outs" INTEGER NOT NULL DEFAULT 0,
    "currentBatterIndex" INTEGER NOT NULL DEFAULT 0,
    "bases" JSONB,
    "snapshot" JSONB,
    "status" "GameStatus" NOT NULL DEFAULT 'SCHEDULED',
    "result" "GameResult",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRuleSettings" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "homeRunLimitEnabled" BOOLEAN NOT NULL DEFAULT false,
    "homeRunLimit" INTEGER,
    "afterHomeRunLimit" "HomeRunLimitOutcome" NOT NULL DEFAULT 'OUT',
    "runLimitPerInning" INTEGER,
    "mercyRule" TEXT,
    "courtesyRunnersAllowed" BOOLEAN NOT NULL DEFAULT true,
    "walksAllowed" BOOLEAN NOT NULL DEFAULT true,
    "sacFliesTracked" BOOLEAN NOT NULL DEFAULT true,
    "errorsTracked" BOOLEAN NOT NULL DEFAULT true,
    "fieldersChoicesTracked" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameRuleSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameLineup" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "battingOrderPosition" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameLineup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtBat" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "inning" INTEGER NOT NULL,
    "batterId" TEXT NOT NULL,
    "outsBefore" INTEGER NOT NULL,
    "result" "BatterResult" NOT NULL,
    "basesBefore" JSONB NOT NULL,
    "runsScored" INTEGER NOT NULL DEFAULT 0,
    "rbis" INTEGER NOT NULL DEFAULT 0,
    "outsOnPlay" INTEGER NOT NULL DEFAULT 0,
    "basesAfter" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtBat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunnerAdvancement" (
    "id" TEXT NOT NULL,
    "atBatId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "originalPlayerId" TEXT,
    "fromBase" "RunnerStart" NOT NULL,
    "toBase" "RunnerEnd" NOT NULL,
    "advancedBases" INTEGER NOT NULL DEFAULT 0,
    "scored" BOOLEAN NOT NULL DEFAULT false,
    "out" BOOLEAN NOT NULL DEFAULT false,
    "rbiCredited" BOOLEAN NOT NULL DEFAULT false,
    "reason" "AdvanceReason" NOT NULL,

    CONSTRAINT "RunnerAdvancement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerGameStats" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 1,
    "plateAppearances" INTEGER NOT NULL DEFAULT 0,
    "atBats" INTEGER NOT NULL DEFAULT 0,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "singles" INTEGER NOT NULL DEFAULT 0,
    "doubles" INTEGER NOT NULL DEFAULT 0,
    "triples" INTEGER NOT NULL DEFAULT 0,
    "homeRuns" INTEGER NOT NULL DEFAULT 0,
    "walks" INTEGER NOT NULL DEFAULT 0,
    "reachedOnError" INTEGER NOT NULL DEFAULT 0,
    "fieldersChoice" INTEGER NOT NULL DEFAULT 0,
    "sacFlies" INTEGER NOT NULL DEFAULT 0,
    "outs" INTEGER NOT NULL DEFAULT 0,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "rbis" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerGameStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerSeasonStats" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "seasonId" TEXT,
    "season" INTEGER NOT NULL,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "plateAppearances" INTEGER NOT NULL DEFAULT 0,
    "atBats" INTEGER NOT NULL DEFAULT 0,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "singles" INTEGER NOT NULL DEFAULT 0,
    "doubles" INTEGER NOT NULL DEFAULT 0,
    "triples" INTEGER NOT NULL DEFAULT 0,
    "homeRuns" INTEGER NOT NULL DEFAULT 0,
    "walks" INTEGER NOT NULL DEFAULT 0,
    "reachedOnError" INTEGER NOT NULL DEFAULT 0,
    "fieldersChoice" INTEGER NOT NULL DEFAULT 0,
    "sacFlies" INTEGER NOT NULL DEFAULT 0,
    "outs" INTEGER NOT NULL DEFAULT 0,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "rbis" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerSeasonStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamGameStats" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "plateAppearances" INTEGER NOT NULL DEFAULT 0,
    "atBats" INTEGER NOT NULL DEFAULT 0,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "singles" INTEGER NOT NULL DEFAULT 0,
    "doubles" INTEGER NOT NULL DEFAULT 0,
    "triples" INTEGER NOT NULL DEFAULT 0,
    "homeRuns" INTEGER NOT NULL DEFAULT 0,
    "walks" INTEGER NOT NULL DEFAULT 0,
    "reachedOnError" INTEGER NOT NULL DEFAULT 0,
    "fieldersChoice" INTEGER NOT NULL DEFAULT 0,
    "sacFlies" INTEGER NOT NULL DEFAULT 0,
    "outs" INTEGER NOT NULL DEFAULT 0,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "rbis" INTEGER NOT NULL DEFAULT 0,
    "opponentRuns" INTEGER NOT NULL DEFAULT 0,
    "leftOnBase" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TeamGameStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamSeasonStats" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "runsFor" INTEGER NOT NULL DEFAULT 0,
    "runsAgainst" INTEGER NOT NULL DEFAULT 0,
    "plateAppearances" INTEGER NOT NULL DEFAULT 0,
    "atBats" INTEGER NOT NULL DEFAULT 0,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "singles" INTEGER NOT NULL DEFAULT 0,
    "doubles" INTEGER NOT NULL DEFAULT 0,
    "triples" INTEGER NOT NULL DEFAULT 0,
    "homeRuns" INTEGER NOT NULL DEFAULT 0,
    "walks" INTEGER NOT NULL DEFAULT 0,
    "reachedOnError" INTEGER NOT NULL DEFAULT 0,
    "fieldersChoice" INTEGER NOT NULL DEFAULT 0,
    "sacFlies" INTEGER NOT NULL DEFAULT 0,
    "outs" INTEGER NOT NULL DEFAULT 0,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "rbis" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamSeasonStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamRecord" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "seasonId" TEXT,
    "label" TEXT NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "runsFor" INTEGER NOT NULL DEFAULT 0,
    "runsAgainst" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE INDEX "Season_teamId_idx" ON "Season"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Season_teamId_year_key" ON "Season"("teamId", "year");

-- CreateIndex
CREATE INDEX "Player_teamId_idx" ON "Player"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_teamId_name_key" ON "Player"("teamId", "name");

-- CreateIndex
CREATE INDEX "Game_teamId_idx" ON "Game"("teamId");

-- CreateIndex
CREATE INDEX "Game_seasonId_idx" ON "Game"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "GameRuleSettings_gameId_key" ON "GameRuleSettings"("gameId");

-- CreateIndex
CREATE INDEX "GameLineup_playerId_idx" ON "GameLineup"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "GameLineup_gameId_battingOrderPosition_key" ON "GameLineup"("gameId", "battingOrderPosition");

-- CreateIndex
CREATE UNIQUE INDEX "GameLineup_gameId_playerId_key" ON "GameLineup"("gameId", "playerId");

-- CreateIndex
CREATE INDEX "AtBat_gameId_idx" ON "AtBat"("gameId");

-- CreateIndex
CREATE INDEX "AtBat_batterId_idx" ON "AtBat"("batterId");

-- CreateIndex
CREATE INDEX "RunnerAdvancement_atBatId_idx" ON "RunnerAdvancement"("atBatId");

-- CreateIndex
CREATE INDEX "RunnerAdvancement_playerId_idx" ON "RunnerAdvancement"("playerId");

-- CreateIndex
CREATE INDEX "PlayerGameStats_playerId_idx" ON "PlayerGameStats"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerGameStats_gameId_playerId_key" ON "PlayerGameStats"("gameId", "playerId");

-- CreateIndex
CREATE INDEX "PlayerSeasonStats_seasonId_idx" ON "PlayerSeasonStats"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSeasonStats_playerId_season_key" ON "PlayerSeasonStats"("playerId", "season");

-- CreateIndex
CREATE UNIQUE INDEX "TeamGameStats_gameId_key" ON "TeamGameStats"("gameId");

-- CreateIndex
CREATE INDEX "TeamGameStats_teamId_idx" ON "TeamGameStats"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamSeasonStats_seasonId_key" ON "TeamSeasonStats"("seasonId");

-- CreateIndex
CREATE INDEX "TeamSeasonStats_teamId_idx" ON "TeamSeasonStats"("teamId");

-- CreateIndex
CREATE INDEX "TeamRecord_teamId_idx" ON "TeamRecord"("teamId");

-- CreateIndex
CREATE INDEX "TeamRecord_seasonId_idx" ON "TeamRecord"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamRecord_teamId_seasonId_label_key" ON "TeamRecord"("teamId", "seasonId", "label");

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRuleSettings" ADD CONSTRAINT "GameRuleSettings_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameLineup" ADD CONSTRAINT "GameLineup_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameLineup" ADD CONSTRAINT "GameLineup_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtBat" ADD CONSTRAINT "AtBat_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtBat" ADD CONSTRAINT "AtBat_batterId_fkey" FOREIGN KEY ("batterId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunnerAdvancement" ADD CONSTRAINT "RunnerAdvancement_atBatId_fkey" FOREIGN KEY ("atBatId") REFERENCES "AtBat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunnerAdvancement" ADD CONSTRAINT "RunnerAdvancement_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerGameStats" ADD CONSTRAINT "PlayerGameStats_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerGameStats" ADD CONSTRAINT "PlayerGameStats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSeasonStats" ADD CONSTRAINT "PlayerSeasonStats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSeasonStats" ADD CONSTRAINT "PlayerSeasonStats_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamGameStats" ADD CONSTRAINT "TeamGameStats_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamGameStats" ADD CONSTRAINT "TeamGameStats_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSeasonStats" ADD CONSTRAINT "TeamSeasonStats_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSeasonStats" ADD CONSTRAINT "TeamSeasonStats_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamRecord" ADD CONSTRAINT "TeamRecord_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamRecord" ADD CONSTRAINT "TeamRecord_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;
