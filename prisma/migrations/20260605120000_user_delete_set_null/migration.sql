ALTER TABLE "QualityScore" DROP CONSTRAINT "QualityScore_createdById_fkey";
ALTER TABLE "TrainingFeedback" DROP CONSTRAINT "TrainingFeedback_createdById_fkey";

ALTER TABLE "QualityScore" ALTER COLUMN "createdById" DROP NOT NULL;
ALTER TABLE "TrainingFeedback" ALTER COLUMN "createdById" DROP NOT NULL;

ALTER TABLE "QualityScore" ADD CONSTRAINT "QualityScore_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TrainingFeedback" ADD CONSTRAINT "TrainingFeedback_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;