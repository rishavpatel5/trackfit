-- AlterTable
ALTER TABLE "public"."ProfileClient" ADD COLUMN     "dob" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."ClientOnboarding" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "dob" TIMESTAMP(3),
    "address" TEXT,
    "city" TEXT DEFAULT 'Surat',
    "state" TEXT DEFAULT 'Gujarat',
    "zipcode" TEXT,
    "secondaryPhone" TEXT,
    "secondaryEmail" TEXT,
    "amountPaid" DOUBLE PRECISION,
    "rulesAccepted" BOOLEAN NOT NULL DEFAULT true,
    "rulesAcceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registrationSignature" TEXT,
    "registrationSignedAt" TIMESTAMP(3),
    "parqHeartCondition" BOOLEAN NOT NULL DEFAULT false,
    "parqChestPainActivity" BOOLEAN NOT NULL DEFAULT false,
    "parqChestPainRest" BOOLEAN NOT NULL DEFAULT false,
    "parqDizziness" BOOLEAN NOT NULL DEFAULT false,
    "parqBoneJoint" BOOLEAN NOT NULL DEFAULT false,
    "parqBloodPressureDrugs" BOOLEAN NOT NULL DEFAULT false,
    "parqOtherReason" BOOLEAN NOT NULL DEFAULT false,
    "parqCleared" BOOLEAN NOT NULL DEFAULT true,
    "parqNotes" TEXT,
    "parqSignature" TEXT,
    "parqSignedAt" TIMESTAMP(3),
    "isMinor" BOOLEAN NOT NULL DEFAULT false,
    "guardianName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientOnboarding_clientId_key" ON "public"."ClientOnboarding"("clientId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_sessionDate_idx" ON "public"."AttendanceRecord"("sessionDate");

-- CreateIndex
CREATE INDEX "DietWeek_clientId_idx" ON "public"."DietWeek"("clientId");

-- CreateIndex
CREATE INDEX "GeneratedReport_clientId_idx" ON "public"."GeneratedReport"("clientId");

-- CreateIndex
CREATE INDEX "Measurement_clientId_recordedAt_idx" ON "public"."Measurement"("clientId", "recordedAt");

-- CreateIndex
CREATE INDEX "ProfileClient_trainerId_idx" ON "public"."ProfileClient"("trainerId");

-- CreateIndex
CREATE INDEX "ProgressEntry_clientId_idx" ON "public"."ProgressEntry"("clientId");

-- CreateIndex
CREATE INDEX "ProgressPhoto_clientId_idx" ON "public"."ProgressPhoto"("clientId");

-- CreateIndex
CREATE INDEX "WorkoutWeek_clientId_idx" ON "public"."WorkoutWeek"("clientId");

-- AddForeignKey
ALTER TABLE "public"."ClientOnboarding" ADD CONSTRAINT "ClientOnboarding_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."ProfileClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
