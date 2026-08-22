-- CreateTable
CREATE TABLE "ExampleCall" (
    "id" TEXT NOT NULL,
    "personelName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "recordDate" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExampleCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExampleCall_personelName_recordDate_idx" ON "ExampleCall"("personelName", "recordDate");

-- CreateIndex
CREATE INDEX "ExampleCall_recordDate_idx" ON "ExampleCall"("recordDate");

-- AddForeignKey
ALTER TABLE "ExampleCall" ADD CONSTRAINT "ExampleCall_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
