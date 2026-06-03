-- Excel yükleme dönemi (Üye Adedi / Çağrı Süreci)
ALTER TABLE "ExcelUpload" ADD COLUMN IF NOT EXISTS "periodFrom" TIMESTAMP(3);
ALTER TABLE "ExcelUpload" ADD COLUMN IF NOT EXISTS "periodTo" TIMESTAMP(3);
