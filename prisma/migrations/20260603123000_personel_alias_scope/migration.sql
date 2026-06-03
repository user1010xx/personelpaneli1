-- Alias benzersizliği global değil kapsam bazlı olmalı.
ALTER TABLE "PersonelAlias" ADD COLUMN IF NOT EXISTS "scopeKey" TEXT NOT NULL DEFAULT 'GLOBAL';

UPDATE "PersonelAlias"
SET "scopeKey" = COALESCE("moduleKey"::TEXT, 'GLOBAL')
WHERE "scopeKey" = 'GLOBAL';

DROP INDEX IF EXISTS "PersonelAlias_aliasKey_key";
CREATE UNIQUE INDEX IF NOT EXISTS "PersonelAlias_aliasKey_scopeKey_key"
ON "PersonelAlias"("aliasKey", "scopeKey");