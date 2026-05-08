-- Migration: schema_expansion
-- Adds: Pessoa hierarchy/area/location, Cargo area, Processo model,
--       TurmaInstrutor, TrainingMaterial, Modality enum values,
--       Turma notaLimiteAprovacao, InscricaoTurma notaExame/aprovado

-- ─── Enum additions ────────────────────────────────────────────

DO $$ BEGIN
  ALTER TYPE "Modality" ADD VALUE IF NOT EXISTS 'DINAMICA';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE "Modality" ADD VALUE IF NOT EXISTS 'ONE_ON_ONE';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE "Modality" ADD VALUE IF NOT EXISTS 'MULTIPLICADOR';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MaterialTipo" AS ENUM ('ONLINE', 'FISICO', 'DIGITAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Pessoa: add columns ───────────────────────────────────────

ALTER TABLE "Pessoa"
  ADD COLUMN IF NOT EXISTS "areaId"             TEXT,
  ADD COLUMN IF NOT EXISTS "superiorId"         TEXT,
  ADD COLUMN IF NOT EXISTS "localidadeTrabalho" TEXT;

-- FK: Pessoa.areaId → Area.id
DO $$ BEGIN
  ALTER TABLE "Pessoa"
    ADD CONSTRAINT "Pessoa_areaId_fkey"
    FOREIGN KEY ("areaId") REFERENCES "Area"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- FK: Pessoa.tenantId → Tenant.id (may already exist implicitly, add if missing)
DO $$ BEGIN
  ALTER TABLE "Pessoa"
    ADD CONSTRAINT "Pessoa_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- FK: Pessoa.superiorId → Pessoa.id (self-referential)
DO $$ BEGIN
  ALTER TABLE "Pessoa"
    ADD CONSTRAINT "Pessoa_superiorId_fkey"
    FOREIGN KEY ("superiorId") REFERENCES "Pessoa"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Pessoa_areaId_idx" ON "Pessoa"("areaId");

-- ─── Cargo: add areaId ─────────────────────────────────────────

ALTER TABLE "Cargo"
  ADD COLUMN IF NOT EXISTS "areaId" TEXT;

DO $$ BEGIN
  ALTER TABLE "Cargo"
    ADD CONSTRAINT "Cargo_areaId_fkey"
    FOREIGN KEY ("areaId") REFERENCES "Area"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Cargo_areaId_idx" ON "Cargo"("areaId");

-- ─── FuncaoProcesso: allow local Processo link ─────────────────

ALTER TABLE "FuncaoProcesso"
  ADD COLUMN IF NOT EXISTS "processoId" TEXT;

-- Remove old unique constraint (funcaoId, xprocProcessoId) if exists
DO $$ BEGIN
  ALTER TABLE "FuncaoProcesso"
    DROP CONSTRAINT IF EXISTS "FuncaoProcesso_funcaoId_xprocProcessoId_key";
EXCEPTION WHEN others THEN NULL; END $$;

-- Make xprocProcessoId nullable
ALTER TABLE "FuncaoProcesso"
  ALTER COLUMN "xprocProcessoId" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "FuncaoProcesso_funcaoId_idx"   ON "FuncaoProcesso"("funcaoId");
CREATE INDEX IF NOT EXISTS "FuncaoProcesso_processoId_idx" ON "FuncaoProcesso"("processoId");

-- ─── Turma: add notaLimiteAprovacao, remove instrutorId ────────

ALTER TABLE "Turma"
  ADD COLUMN IF NOT EXISTS "notaLimiteAprovacao" DOUBLE PRECISION;

-- instrutorId is replaced by TurmaInstrutor join table
-- Drop it only if it exists (safe to keep if it still has data, but we
-- replace the pattern going forward — drop the column cleanly)
ALTER TABLE "Turma" DROP COLUMN IF EXISTS "instrutorId";

-- ─── InscricaoTurma: add notaExame, aprovado ───────────────────

ALTER TABLE "InscricaoTurma"
  ADD COLUMN IF NOT EXISTS "notaExame" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "aprovado"  BOOLEAN;

-- ─── Processo (new table) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Processo" (
  "id"              TEXT NOT NULL,
  "tenantId"        TEXT NOT NULL,
  "nome"            TEXT NOT NULL,
  "descricao"       TEXT,
  "xprocProcessoId" TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt"       TIMESTAMP(3),
  CONSTRAINT "Processo_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "Processo"
    ADD CONSTRAINT "Processo_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "FuncaoProcesso"
    ADD CONSTRAINT "FuncaoProcesso_processoId_fkey"
    FOREIGN KEY ("processoId") REFERENCES "Processo"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Processo_tenantId_nome_key" ON "Processo"("tenantId", "nome") WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS "Processo_tenantId_idx" ON "Processo"("tenantId");
CREATE INDEX IF NOT EXISTS "Processo_deletedAt_idx" ON "Processo"("deletedAt");

-- ─── TurmaInstrutor (new table) ────────────────────────────────

CREATE TABLE IF NOT EXISTS "TurmaInstrutor" (
  "id"        TEXT NOT NULL,
  "turmaId"   TEXT NOT NULL,
  "pessoaId"  TEXT NOT NULL,
  "principal" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TurmaInstrutor_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "TurmaInstrutor"
    ADD CONSTRAINT "TurmaInstrutor_turmaId_fkey"
    FOREIGN KEY ("turmaId") REFERENCES "Turma"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TurmaInstrutor"
    ADD CONSTRAINT "TurmaInstrutor_pessoaId_fkey"
    FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "TurmaInstrutor_turmaId_pessoaId_key" ON "TurmaInstrutor"("turmaId", "pessoaId");
CREATE INDEX IF NOT EXISTS "TurmaInstrutor_turmaId_idx"  ON "TurmaInstrutor"("turmaId");
CREATE INDEX IF NOT EXISTS "TurmaInstrutor_pessoaId_idx" ON "TurmaInstrutor"("pessoaId");

-- ─── TrainingMaterial (new table) ──────────────────────────────

CREATE TABLE IF NOT EXISTS "TrainingMaterial" (
  "id"             TEXT NOT NULL,
  "trainingItemId" TEXT NOT NULL,
  "tipo"           "MaterialTipo" NOT NULL,
  "titulo"         TEXT NOT NULL,
  "url"            TEXT,
  "descricao"      TEXT,
  "deletedAt"      TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingMaterial_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "TrainingMaterial"
    ADD CONSTRAINT "TrainingMaterial_trainingItemId_fkey"
    FOREIGN KEY ("trainingItemId") REFERENCES "TrainingItem"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "TrainingMaterial_trainingItemId_idx" ON "TrainingMaterial"("trainingItemId");
CREATE INDEX IF NOT EXISTS "TrainingMaterial_deletedAt_idx"      ON "TrainingMaterial"("deletedAt");
