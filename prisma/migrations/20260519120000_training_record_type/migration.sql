-- CreateEnum
CREATE TYPE "TrainingRecordType" AS ENUM ('EGITIM', 'GERIBILDIRIM');

-- AlterTable
ALTER TABLE "TrainingFeedback" ADD COLUMN "recordType" "TrainingRecordType" NOT NULL DEFAULT 'EGITIM';

-- CreateIndex
CREATE INDEX "TrainingFeedback_recordType_recordDate_idx" ON "TrainingFeedback"("recordType", "recordDate");
