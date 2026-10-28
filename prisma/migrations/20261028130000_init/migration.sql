CREATE TABLE "Church" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "monthlyGoal" DOUBLE PRECISION NOT NULL,
    "openingBalance" DOUBLE PRECISION NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Church_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialTransaction" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChurchAsset" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "acquiredAt" TEXT NOT NULL,
    "responsible" TEXT NOT NULL,
    CONSTRAINT "ChurchAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChurchEvent" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "leader" TEXT NOT NULL,
    "attendanceIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "visitors" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ChurchEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChurchPerson" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "birthday" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "firstVisit" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "contactDates" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    CONSTRAINT "ChurchPerson_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChurchCommitment" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "installments" INTEGER NOT NULL,
    "paidInstallments" INTEGER NOT NULL,
    "nextDueDate" TEXT NOT NULL,
    CONSTRAINT "ChurchCommitment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChurchAsset_churchId_code_key" ON "ChurchAsset"("churchId", "code");
CREATE INDEX "FinancialTransaction_churchId_date_idx" ON "FinancialTransaction"("churchId", "date");
CREATE INDEX "FinancialTransaction_churchId_category_idx" ON "FinancialTransaction"("churchId", "category");
CREATE INDEX "ChurchAsset_churchId_name_idx" ON "ChurchAsset"("churchId", "name");
CREATE INDEX "ChurchEvent_churchId_date_time_idx" ON "ChurchEvent"("churchId", "date", "time");
CREATE INDEX "ChurchPerson_churchId_stage_idx" ON "ChurchPerson"("churchId", "stage");
CREATE INDEX "ChurchPerson_churchId_name_idx" ON "ChurchPerson"("churchId", "name");
CREATE INDEX "ChurchCommitment_churchId_nextDueDate_idx" ON "ChurchCommitment"("churchId", "nextDueDate");

ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChurchAsset" ADD CONSTRAINT "ChurchAsset_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChurchEvent" ADD CONSTRAINT "ChurchEvent_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChurchPerson" ADD CONSTRAINT "ChurchPerson_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChurchCommitment" ADD CONSTRAINT "ChurchCommitment_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
