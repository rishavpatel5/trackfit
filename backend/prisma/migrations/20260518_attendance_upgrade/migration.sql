-- Upgrade path for DBs created before sessionCharged / reportToken / per-day uniqueness.
-- Idempotent: safe if 20260517_init already applied these objects.

ALTER TABLE "public"."ProfileClient" ADD COLUMN IF NOT EXISTS "reportToken" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ProfileClient_reportToken_key" ON "public"."ProfileClient"("reportToken");

ALTER TABLE "public"."AttendanceRecord" ADD COLUMN IF NOT EXISTS "sessionCharged" BOOLEAN NOT NULL DEFAULT false;

-- Prisma uses a UNIQUE INDEX (not a named CONSTRAINT) for @@unique([clientId, sessionDate]).
CREATE UNIQUE INDEX IF NOT EXISTS "AttendanceRecord_clientId_sessionDate_key" ON "public"."AttendanceRecord"("clientId", "sessionDate");

-- Backfill charge flag from legacy completed sessions.
UPDATE "public"."AttendanceRecord"
SET "sessionCharged" = true
WHERE "sessionCompleted" = true AND "sessionCharged" = false;
