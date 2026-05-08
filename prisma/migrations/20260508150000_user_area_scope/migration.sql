-- User: optional area assignment for ManagerScope OCAI filtering
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "areaId" TEXT;

-- Soft foreign key (no CASCADE) — area deletion won't drop users
DO $$ BEGIN
  ALTER TABLE "User"
    ADD CONSTRAINT "User_areaId_fkey"
    FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "User_areaId_idx" ON "User"("areaId");
