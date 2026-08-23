-- CreateEnum
CREATE TYPE "KnowledgeDuelResult" AS ENUM ('DOGRU', 'YANLIS');

-- CreateTable
CREATE TABLE "KnowledgeDuel" (
    "id" TEXT NOT NULL,
    "personelName" TEXT NOT NULL,
    "personelKey" TEXT NOT NULL,
    "recordDate" TIMESTAMP(3) NOT NULL,
    "result" "KnowledgeDuelResult" NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeDuel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeDuel_personelKey_recordDate_key" ON "KnowledgeDuel"("personelKey", "recordDate");

-- CreateIndex
CREATE INDEX "KnowledgeDuel_personelName_recordDate_idx" ON "KnowledgeDuel"("personelName", "recordDate");

-- CreateIndex
CREATE INDEX "KnowledgeDuel_recordDate_idx" ON "KnowledgeDuel"("recordDate");

-- CreateIndex
CREATE INDEX "KnowledgeDuel_createdById_idx" ON "KnowledgeDuel"("createdById");

-- AddForeignKey
ALTER TABLE "KnowledgeDuel" ADD CONSTRAINT "KnowledgeDuel_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
