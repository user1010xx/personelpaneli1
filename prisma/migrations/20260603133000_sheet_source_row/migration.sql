ALTER TABLE "SheetDataRow" ADD COLUMN "sourceRow" INTEGER;

CREATE INDEX "SheetDataRow_moduleKey_sourceRow_idx" ON "SheetDataRow"("moduleKey", "sourceRow");