-- Attendance policy: sessionCharged + one session per client per calendar day

ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "sessionCharged" BOOLEAN NOT NULL DEFAULT false;

UPDATE "AttendanceRecord"
SET "sessionCharged" = true
WHERE "trainerStatus" = 'PRESENT'
  AND "clientStatus" IN ('PRESENT', 'ABSENT');

-- Drop duplicate same-day rows before unique index (keeps earliest startedAt)
DELETE FROM "AttendanceRecord" a
USING "AttendanceRecord" b
WHERE a."clientId" = b."clientId"
  AND a."sessionDate" = b."sessionDate"
  AND a."startedAt" > b."startedAt";

CREATE UNIQUE INDEX IF NOT EXISTS "AttendanceRecord_clientId_sessionDate_key"
  ON "AttendanceRecord" ("clientId", "sessionDate");
