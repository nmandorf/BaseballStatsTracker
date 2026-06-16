-- CreateEnum
CREATE TYPE "PlayerGender" AS ENUM ('FEMALE', 'MALE', 'UNKNOWN');

-- AlterTable
ALTER TABLE "Player" ADD COLUMN "gender" "PlayerGender" NOT NULL DEFAULT 'UNKNOWN';
