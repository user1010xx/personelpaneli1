-- Drop leftover Google Sheets / Excel / alias tables after the manual-entry refactor

DROP TABLE IF EXISTS "ExcelDataRow" CASCADE;
DROP TABLE IF EXISTS "ExcelUpload" CASCADE;
DROP TABLE IF EXISTS "SheetDataRow" CASCADE;
DROP TABLE IF EXISTS "SyncBatch" CASCADE;
DROP TABLE IF EXISTS "SheetConfig" CASCADE;
DROP TABLE IF EXISTS "PersonelAlias" CASCADE;

DROP TYPE IF EXISTS "AliasScope";
DROP TYPE IF EXISTS "ModuleKey";
