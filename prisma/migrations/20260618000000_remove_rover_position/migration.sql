DELETE FROM "DefensiveEvent"
WHERE "position" = 'ROVER';

DELETE FROM "DefensiveAlignmentSlot"
WHERE "position" = 'ROVER';

UPDATE "Player"
SET
  "primaryPosition" = CASE WHEN UPPER(TRIM("primaryPosition")) = 'ROVER' THEN NULL ELSE "primaryPosition" END,
  "bestDefensePosition" = CASE WHEN UPPER(TRIM("bestDefensePosition")) = 'ROVER' THEN NULL ELSE "bestDefensePosition" END,
  "avoidDefensePosition" = CASE WHEN UPPER(TRIM("avoidDefensePosition")) = 'ROVER' THEN NULL ELSE "avoidDefensePosition" END,
  "backupDefensePosition" = CASE WHEN UPPER(TRIM("backupDefensePosition")) = 'ROVER' THEN NULL ELSE "backupDefensePosition" END;

CREATE TYPE "DefensivePosition_without_rover" AS ENUM (
  'P',
  'C',
  'FIRST_BASE',
  'SECOND_BASE',
  'SHORTSTOP',
  'THIRD_BASE',
  'LEFT_FIELD',
  'LEFT_CENTER',
  'RIGHT_CENTER',
  'RIGHT_FIELD'
);

ALTER TABLE "DefensiveAlignmentSlot"
ALTER COLUMN "position" TYPE "DefensivePosition_without_rover"
USING ("position"::text::"DefensivePosition_without_rover");

ALTER TABLE "DefensiveEvent"
ALTER COLUMN "position" TYPE "DefensivePosition_without_rover"
USING ("position"::text::"DefensivePosition_without_rover");

DROP TYPE "DefensivePosition";

ALTER TYPE "DefensivePosition_without_rover"
RENAME TO "DefensivePosition";

ALTER TABLE "DefensiveAlignment"
DROP COLUMN "roverEnabled";
