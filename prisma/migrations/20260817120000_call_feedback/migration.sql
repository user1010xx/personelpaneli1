-- CreateTable
CREATE TABLE "CallFeedback" (
    "id" TEXT NOT NULL,
    "personelName" TEXT NOT NULL,
    "recordType" "TrainingRecordType" NOT NULL DEFAULT 'GERIBILDIRIM',
    "recordDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "trainer" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CallFeedback_personelName_recordDate_idx" ON "CallFeedback"("personelName", "recordDate");

-- CreateIndex
CREATE INDEX "CallFeedback_recordDate_idx" ON "CallFeedback"("recordDate");

-- CreateIndex
CREATE INDEX "CallFeedback_recordType_recordDate_idx" ON "CallFeedback"("recordType", "recordDate");

-- AddForeignKey
ALTER TABLE "CallFeedback" ADD CONSTRAINT "CallFeedback_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
