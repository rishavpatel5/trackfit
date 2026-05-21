-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'TRAINER', 'CLIENT');

-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."TrainerAttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "public"."ClientAttendanceStatus" AS ENUM ('PENDING', 'PRESENT', 'ABSENT', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "public"."ProgressPhotoType" AS ENUM ('BEFORE', 'AFTER', 'WEEKLY');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('MEMBERSHIP_EXPIRING', 'WORKOUT_UPDATED', 'DIET_UPDATED', 'MISSED_SESSION', 'ATTENDANCE_REMINDER');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProfileTrainer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "specialization" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileTrainer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProfileClient" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "age" INTEGER,
    "gender" "public"."Gender",
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "goal" TEXT,
    "medicalNotes" TEXT,
    "membershipStart" TIMESTAMP(3),
    "membershipEnd" TIMESTAMP(3),
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "sessionsCompleted" INTEGER NOT NULL DEFAULT 0,
    "reportToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AttendanceRecord" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "sessionDate" DATE NOT NULL,
    "pinHash" TEXT NOT NULL,
    "verifyToken" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "trainerStatus" "public"."TrainerAttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "clientStatus" "public"."ClientAttendanceStatus" NOT NULL DEFAULT 'PENDING',
    "trainerCheckedAt" TIMESTAMP(3),
    "clientVerifiedAt" TIMESTAMP(3),
    "sessionCompleted" BOOLEAN NOT NULL DEFAULT false,
    "sessionCharged" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkoutWeek" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkoutDay" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WorkoutDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExerciseRow" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sets" INTEGER,
    "reps" TEXT,
    "weight" TEXT,
    "restSec" INTEGER,
    "tempo" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExerciseRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DietWeek" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DietWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DietDay" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DietDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MealRow" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "slotLabel" TEXT NOT NULL DEFAULT 'Meal',
    "foodName" TEXT NOT NULL,
    "quantity" TEXT,
    "calories" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "protein" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MealRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Measurement" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "chest" DOUBLE PRECISION,
    "waist" DOUBLE PRECISION,
    "hips" DOUBLE PRECISION,
    "biceps" DOUBLE PRECISION,
    "forearms" DOUBLE PRECISION,
    "thigh" DOUBLE PRECISION,
    "calves" DOUBLE PRECISION,
    "bodyFat" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "recordedById" TEXT,

    CONSTRAINT "Measurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProgressEntry" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "weekNumber" INTEGER,
    "weekStartDate" TIMESTAMP(3),
    "trainerComments" TEXT,
    "recovery" TEXT,
    "energyLevel" TEXT,
    "performanceNotes" TEXT,
    "strengthNotes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProgressPhoto" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "public"."ProgressPhotoType" NOT NULL,
    "weekNumber" INTEGER,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GeneratedReport" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileTrainer_userId_key" ON "public"."ProfileTrainer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileClient_userId_key" ON "public"."ProfileClient"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileClient_reportToken_key" ON "public"."ProfileClient"("reportToken");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_verifyToken_key" ON "public"."AttendanceRecord"("verifyToken");

-- CreateIndex
CREATE INDEX "AttendanceRecord_clientId_sessionDate_idx" ON "public"."AttendanceRecord"("clientId", "sessionDate");

-- CreateIndex
CREATE INDEX "AttendanceRecord_trainerId_sessionDate_idx" ON "public"."AttendanceRecord"("trainerId", "sessionDate");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_clientId_sessionDate_key" ON "public"."AttendanceRecord"("clientId", "sessionDate");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutWeek_clientId_weekNumber_key" ON "public"."WorkoutWeek"("clientId", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DietWeek_clientId_weekNumber_key" ON "public"."DietWeek"("clientId", "weekNumber");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "public"."Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "public"."AuditLog"("entity", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "public"."PasswordResetToken"("tokenHash");

-- AddForeignKey
ALTER TABLE "public"."ProfileTrainer" ADD CONSTRAINT "ProfileTrainer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfileClient" ADD CONSTRAINT "ProfileClient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfileClient" ADD CONSTRAINT "ProfileClient_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "public"."ProfileTrainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."ProfileClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "public"."ProfileTrainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkoutWeek" ADD CONSTRAINT "WorkoutWeek_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."ProfileClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkoutDay" ADD CONSTRAINT "WorkoutDay_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "public"."WorkoutWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExerciseRow" ADD CONSTRAINT "ExerciseRow_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "public"."WorkoutDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DietWeek" ADD CONSTRAINT "DietWeek_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."ProfileClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DietDay" ADD CONSTRAINT "DietDay_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "public"."DietWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MealRow" ADD CONSTRAINT "MealRow_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "public"."DietDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Measurement" ADD CONSTRAINT "Measurement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."ProfileClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProgressEntry" ADD CONSTRAINT "ProgressEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."ProfileClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProgressPhoto" ADD CONSTRAINT "ProgressPhoto_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."ProfileClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GeneratedReport" ADD CONSTRAINT "GeneratedReport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."ProfileClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
