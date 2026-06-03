-- Personel isim eşleştirme / alias tablosu
CREATE TABLE "PersonelAlias" (
    "id" TEXT NOT NULL,
    "aliasName" TEXT NOT NULL,
    "aliasKey" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "canonicalKey" TEXT NOT NULL,
    "moduleKey" "ModuleKey",
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonelAlias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PersonelAlias_aliasKey_key" ON "PersonelAlias"("aliasKey");
CREATE INDEX "PersonelAlias_canonicalKey_idx" ON "PersonelAlias"("canonicalKey");
CREATE INDEX "PersonelAlias_moduleKey_idx" ON "PersonelAlias"("moduleKey");

ALTER TABLE "PersonelAlias" ADD CONSTRAINT "PersonelAlias_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;