CREATE TYPE "DefensiveRating" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TYPE "DefensivePosition" AS ENUM (
  'P',
  'C',
  'FIRST_BASE',
  'SECOND_BASE',
  'SHORTSTOP',
  'THIRD_BASE',
  'LEFT_FIELD',
  'LEFT_CENTER',
  'RIGHT_CENTER',
  'RIGHT_FIELD',
  'ROVER'
);

CREATE TYPE "DefensiveSlotStatus" AS ENUM ('ASSIGNED', 'VACANT');

CREATE TYPE "DefensiveEventType" AS ENUM (
  'ROUTINE_OUT',
  'HIT_NO_PLAY',
  'MISPLAY',
  'GREAT_PLAY',
  'EXTRA_BASES_ALLOWED',
  'DOUBLE_PLAY'
);

CREATE TYPE "DefensiveBallType" AS ENUM (
  'GROUND_BALL',
  'FLY_BALL',
  'LINE_DRIVE',
  'POP_UP',
  'SHORT_FLY',
  'HARD_HIT_BALL',
  'WEAK_HIT_BALL'
);

CREATE TYPE "DefensiveMisplayType" AS ENUM (
  'FIELDING_MISTAKE',
  'THROWING_MISTAKE',
  'CATCHING_MISTAKE',
  'MISSED_FLY_BALL',
  'BAD_DECISION',
  'DID_NOT_COVER_BASE',
  'DID_NOT_BACK_UP_PLAY'
);

CREATE TYPE "DefensiveMisplayResult" AS ENUM (
  'BATTER_REACHED_BASE',
  'RUNNER_ADVANCED',
  'RUN_SCORED',
  'EXTRA_BASE_ALLOWED',
  'OUT_MISSED'
);

CREATE TYPE "DefensiveGreatPlayImpact" AS ENUM (
  'SAVED_OUT',
  'SAVED_RUN',
  'PREVENTED_EXTRA_BASE',
  'ENDED_INNING',
  'DOUBLE_PLAY_STARTED'
);

ALTER TABLE "Player"
ADD COLUMN "armStrength" "DefensiveRating",
ADD COLUMN "throwAccuracy" "DefensiveRating",
ADD COLUMN "gloveSkill" "DefensiveRating",
ADD COLUMN "rangeRating" "DefensiveRating",
ADD COLUMN "positionConfidence" "DefensiveRating",
ADD COLUMN "defenseStrengths" TEXT,
ADD COLUMN "defenseWeaknesses" TEXT,
ADD COLUMN "bestDefensePosition" TEXT,
ADD COLUMN "avoidDefensePosition" TEXT,
ADD COLUMN "backupDefensePosition" TEXT,
ADD COLUMN "defenseCommunicationNotes" TEXT,
ADD COLUMN "defenseHealthNotes" TEXT;

CREATE TABLE "DefensiveAlignment" (
  "id" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "inning" INTEGER NOT NULL,
  "half" "InningHalf" NOT NULL,
  "roverEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DefensiveAlignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DefensiveAlignmentSlot" (
  "id" TEXT NOT NULL,
  "alignmentId" TEXT NOT NULL,
  "playerId" TEXT,
  "position" "DefensivePosition" NOT NULL,
  "status" "DefensiveSlotStatus" NOT NULL DEFAULT 'ASSIGNED',

  CONSTRAINT "DefensiveAlignmentSlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DefensiveEvent" (
  "id" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "inning" INTEGER NOT NULL,
  "half" "InningHalf" NOT NULL,
  "type" "DefensiveEventType" NOT NULL,
  "fielderId" TEXT,
  "position" "DefensivePosition",
  "ballType" "DefensiveBallType",
  "misplayType" "DefensiveMisplayType",
  "misplayResult" "DefensiveMisplayResult",
  "greatPlayImpact" "DefensiveGreatPlayImpact",
  "involvedPlayerIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "outsRecorded" INTEGER NOT NULL DEFAULT 0,
  "runsAllowed" INTEGER NOT NULL DEFAULT 0,
  "basesAllowed" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DefensiveEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DefensiveAlignment_gameId_inning_half_key" ON "DefensiveAlignment"("gameId", "inning", "half");
CREATE INDEX "DefensiveAlignment_gameId_idx" ON "DefensiveAlignment"("gameId");
CREATE UNIQUE INDEX "DefensiveAlignmentSlot_alignmentId_position_key" ON "DefensiveAlignmentSlot"("alignmentId", "position");
CREATE INDEX "DefensiveAlignmentSlot_playerId_idx" ON "DefensiveAlignmentSlot"("playerId");
CREATE INDEX "DefensiveEvent_gameId_idx" ON "DefensiveEvent"("gameId");
CREATE INDEX "DefensiveEvent_fielderId_idx" ON "DefensiveEvent"("fielderId");

ALTER TABLE "DefensiveAlignment"
ADD CONSTRAINT "DefensiveAlignment_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DefensiveAlignmentSlot"
ADD CONSTRAINT "DefensiveAlignmentSlot_alignmentId_fkey" FOREIGN KEY ("alignmentId") REFERENCES "DefensiveAlignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DefensiveAlignmentSlot"
ADD CONSTRAINT "DefensiveAlignmentSlot_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DefensiveEvent"
ADD CONSTRAINT "DefensiveEvent_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DefensiveEvent"
ADD CONSTRAINT "DefensiveEvent_fielderId_fkey" FOREIGN KEY ("fielderId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
