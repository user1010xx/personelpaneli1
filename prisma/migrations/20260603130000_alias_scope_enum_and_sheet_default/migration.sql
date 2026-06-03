CREATE TYPE "AliasScope" AS ENUM (
    'PERSONEL',
    'PUANTAJ',
    'WHATSAPP',
    'UYARI_KESINTI',
    'UYE_ADEDI',
    'CAGRI_SURECI',
    'KALITE',
    'EGITIM'
);

ALTER TABLE "PersonelAlias" ADD COLUMN "scope" "AliasScope";

UPDATE "PersonelAlias"
SET "scope" = CASE
    WHEN "moduleKey" IS NULL THEN NULL
    ELSE "moduleKey"::TEXT::"AliasScope"
END;

CREATE INDEX "PersonelAlias_scope_idx" ON "PersonelAlias"("scope");

ALTER TABLE "SheetConfig" ALTER COLUMN "sheetName" SET DEFAULT 'Sayfa1';