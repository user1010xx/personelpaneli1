-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "ModuleKey" AS ENUM ('PERSONEL', 'PUANTAJ', 'WHATSAPP', 'UYARI_KESINTI', 'UYE_ADEDI', 'CAGRI_SURECI');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SheetConfig" (
    "id" TEXT NOT NULL,
    "moduleKey" "ModuleKey" NOT NULL,
    "spreadsheetId" TEXT NOT NULL,
    "sheetName" TEXT NOT NULL DEFAULT 'Sheet1',
    "range" TEXT,
    "headerRow" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SheetConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncBatch" (
    "id" TEXT NOT NULL,
    "moduleKey" "ModuleKey" NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rowCount" INTEGER NOT NULL,

    CONSTRAINT "SyncBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SheetDataRow" (
    "id" TEXT NOT NULL,
    "moduleKey" "ModuleKey" NOT NULL,
    "syncBatchId" TEXT NOT NULL,
    "rowData" JSONB NOT NULL,
    "recordDate" TIMESTAMP(3),
    "personelName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SheetDataRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExcelUpload" (
    "id" TEXT NOT NULL,
    "moduleKey" "ModuleKey" NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT,
    "rowCount" INTEGER NOT NULL,

    CONSTRAINT "ExcelUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExcelDataRow" (
    "id" TEXT NOT NULL,
    "moduleKey" "ModuleKey" NOT NULL,
    "uploadId" TEXT NOT NULL,
    "rowData" JSONB NOT NULL,
    "recordDate" TIMESTAMP(3),
    "personelName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExcelDataRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityScore" (
    "id" TEXT NOT NULL,
    "personelName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "recordDate" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingFeedback" (
    "id" TEXT NOT NULL,
    "personelName" TEXT NOT NULL,
    "recordDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "trainer" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SheetConfig_moduleKey_key" ON "SheetConfig"("moduleKey");

-- CreateIndex
CREATE INDEX "SyncBatch_moduleKey_syncedAt_idx" ON "SyncBatch"("moduleKey", "syncedAt");

-- CreateIndex
CREATE INDEX "SheetDataRow_moduleKey_recordDate_idx" ON "SheetDataRow"("moduleKey", "recordDate");

-- CreateIndex
CREATE INDEX "SheetDataRow_moduleKey_personelName_idx" ON "SheetDataRow"("moduleKey", "personelName");

-- CreateIndex
CREATE INDEX "SheetDataRow_syncBatchId_idx" ON "SheetDataRow"("syncBatchId");

-- CreateIndex
CREATE INDEX "ExcelUpload_moduleKey_uploadedAt_idx" ON "ExcelUpload"("moduleKey", "uploadedAt");

-- CreateIndex
CREATE INDEX "ExcelDataRow_moduleKey_recordDate_idx" ON "ExcelDataRow"("moduleKey", "recordDate");

-- CreateIndex
CREATE INDEX "ExcelDataRow_moduleKey_personelName_idx" ON "ExcelDataRow"("moduleKey", "personelName");

-- CreateIndex
CREATE INDEX "ExcelDataRow_uploadId_idx" ON "ExcelDataRow"("uploadId");

-- CreateIndex
CREATE INDEX "QualityScore_personelName_recordDate_idx" ON "QualityScore"("personelName", "recordDate");

-- CreateIndex
CREATE INDEX "QualityScore_recordDate_idx" ON "QualityScore"("recordDate");

-- CreateIndex
CREATE INDEX "TrainingFeedback_personelName_recordDate_idx" ON "TrainingFeedback"("personelName", "recordDate");

-- CreateIndex
CREATE INDEX "TrainingFeedback_recordDate_idx" ON "TrainingFeedback"("recordDate");

-- AddForeignKey
ALTER TABLE "SheetDataRow" ADD CONSTRAINT "SheetDataRow_syncBatchId_fkey" FOREIGN KEY ("syncBatchId") REFERENCES "SyncBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExcelUpload" ADD CONSTRAINT "ExcelUpload_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExcelDataRow" ADD CONSTRAINT "ExcelDataRow_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "ExcelUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityScore" ADD CONSTRAINT "QualityScore_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingFeedback" ADD CONSTRAINT "TrainingFeedback_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
