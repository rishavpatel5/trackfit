-- For databases created from the older init migration (before main merge).
-- Safe to run on fresh DBs that already have these objects (IF NOT EXISTS / DO blocks).

ALTER TABLE "public"."ProfileClient" ADD COLUMN IF NOT EXISTS "reportToken" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ProfileClient_reportToken_key" ON "public"."ProfileClient"("reportToken");

ALTER TABLE "public"."AttendanceRecord" ADD COLUMN IF NOT EXISTS "sessionCharged" BOOLEAN NOT NULL DEFAULT false;

-- One attendance row per client per calendar day (drop duplicate rows first if this fails).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AttendanceRecord_clientId_sessionDate_key'
  ) THEN
    ALTER TABLE "public"."AttendanceRecord"
      ADD CONSTRAINT "AttendanceRecord_clientId_sessionDate_key" UNIQUE ("clientId", "sessionDate");
  END IF;
END $$;

-- Backfill charge flag from legacy completed sessions.
UPDATE "public"."AttendanceRecord"
SET "sessionCharged" = true
WHERE "sessionCompleted" = true AND "sessionCharged" = false;
