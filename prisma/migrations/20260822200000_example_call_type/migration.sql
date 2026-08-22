-- CreateEnum
CREATE TYPE "ExampleCallType" AS ENUM ('ORNEK_CAGRI', 'MOTIVASYON');

-- AlterTable
ALTER TABLE "ExampleCall" ADD COLUMN "recordType" "ExampleCallType" NOT NULL DEFAULT 'ORNEK_CAGRI';

ALTER TABLE "ExampleCall" ALTER COLUMN "phone" SET DEFAULT '';

-- CreateIndex
CREATE INDEX "ExampleCall_recordType_recordDate_idx" ON "ExampleCall"("recordType", "recordDate");
