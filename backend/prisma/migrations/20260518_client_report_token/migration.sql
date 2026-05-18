-- One persistent live report link per client (PDF generated on demand, not stored).

ALTER TABLE "ProfileClient" ADD COLUMN IF NOT EXISTS "reportToken" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ProfileClient_reportToken_key" ON "ProfileClient" ("reportToken");

UPDATE "ProfileClient"
SET "reportToken" = gen_random_uuid()::text
WHERE "reportToken" IS NULL;
