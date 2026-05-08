-- Migration: macroprocesso
-- Adds Macroprocesso model and macroprocessoId FK on Processo

CREATE TABLE IF NOT EXISTS "Macroprocesso" (
  "id"                   TEXT NOT NULL,
  "tenantId"             TEXT NOT NULL,
  "nome"                 TEXT NOT NULL,
  "descricao"            TEXT,
  "xprocMacroprocessoId" TEXT,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt"            TIMESTAMP(3),
  CONSTRAINT "Macroprocesso_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "Macroprocesso"
    ADD CONSTRAINT "Macroprocesso_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Macroprocesso_tenantId_nome_key"
  ON "Macroprocesso"("tenantId", "nome") WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS "Macroprocesso_tenantId_idx" ON "Macroprocesso"("tenantId");
CREATE INDEX IF NOT EXISTS "Macroprocesso_deletedAt_idx" ON "Macroprocesso"("deletedAt");

-- Add macroprocessoId to Processo
ALTER TABLE "Processo"
  ADD COLUMN IF NOT EXISTS "macroprocessoId" TEXT;

DO $$ BEGIN
  ALTER TABLE "Processo"
    ADD CONSTRAINT "Processo_macroprocessoId_fkey"
    FOREIGN KEY ("macroprocessoId") REFERENCES "Macroprocesso"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Processo_macroprocessoId_idx" ON "Processo"("macroprocessoId");

-- Drop the old unique constraint on (tenantId, nome) for Processo
-- (it was non-partial; replace with index-based or keep without partial if preferred)
DO $$ BEGIN
  ALTER TABLE "Processo" DROP CONSTRAINT "Processo_tenantId_nome_key";
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Processo_tenantId_idx" ON "Processo"("tenantId");
