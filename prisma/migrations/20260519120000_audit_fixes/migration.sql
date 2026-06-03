-- CreateTable
CREATE TABLE IF NOT EXISTS "RateLimitEntry" (
    "key" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "windowEnds" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitEntry_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RateLimitEntry_windowEnds_idx" ON "RateLimitEntry"("windowEnds");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SheetDataRow_moduleKey_createdAt_idx" ON "SheetDataRow"("moduleKey", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExcelDataRow_moduleKey_createdAt_idx" ON "ExcelDataRow"("moduleKey", "createdAt");
