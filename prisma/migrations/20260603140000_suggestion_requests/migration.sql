CREATE TYPE "SuggestionRequestType" AS ENUM ('TALEP', 'ONERI');

CREATE TABLE "SuggestionRequest" (
    "id" TEXT NOT NULL,
    "type" "SuggestionRequestType" NOT NULL,
    "reporterName" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuggestionRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SuggestionRequest_type_idx" ON "SuggestionRequest"("type");
CREATE INDEX "SuggestionRequest_createdById_idx" ON "SuggestionRequest"("createdById");
CREATE INDEX "SuggestionRequest_createdAt_idx" ON "SuggestionRequest"("createdAt");

ALTER TABLE "SuggestionRequest" ADD CONSTRAINT "SuggestionRequest_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;