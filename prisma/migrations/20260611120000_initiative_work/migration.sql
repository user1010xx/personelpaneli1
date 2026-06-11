CREATE TABLE "InitiativeWork" (
    "id" TEXT NOT NULL,
    "personelName" TEXT NOT NULL,
    "recordDate" TIMESTAMP(3) NOT NULL,
    "callCount" INTEGER NOT NULL,
    "talkDurationSeconds" INTEGER NOT NULL,
    "memberCount" INTEGER NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InitiativeWork_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InitiativeWork_personelName_recordDate_idx" ON "InitiativeWork"("personelName", "recordDate");
CREATE INDEX "InitiativeWork_recordDate_idx" ON "InitiativeWork"("recordDate");
CREATE INDEX "InitiativeWork_createdById_idx" ON "InitiativeWork"("createdById");

ALTER TABLE "InitiativeWork" ADD CONSTRAINT "InitiativeWork_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;