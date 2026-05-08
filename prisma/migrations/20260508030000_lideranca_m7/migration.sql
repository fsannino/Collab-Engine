-- Migration: lideranca_m7
-- Adds Lideranca and AvaliacaoLideranca for M7 Leadership Console

CREATE TABLE IF NOT EXISTS "Lideranca" (
  "id"        TEXT NOT NULL,
  "tenantId"  TEXT NOT NULL,
  "pessoaId"  TEXT NOT NULL,
  "projectId" TEXT,
  "areaId"    TEXT,
  "papel"     TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Lideranca_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN ALTER TABLE "Lideranca" ADD CONSTRAINT "Lideranca_tenantId_fkey"  FOREIGN KEY ("tenantId")  REFERENCES "Tenant"("id")  ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Lideranca" ADD CONSTRAINT "Lideranca_pessoaId_fkey"  FOREIGN KEY ("pessoaId")  REFERENCES "Pessoa"("id")  ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Lideranca" ADD CONSTRAINT "Lideranca_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Lideranca" ADD CONSTRAINT "Lideranca_areaId_fkey"    FOREIGN KEY ("areaId")    REFERENCES "Area"("id")    ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Lideranca_tenantId_idx"  ON "Lideranca"("tenantId");
CREATE INDEX IF NOT EXISTS "Lideranca_pessoaId_idx"  ON "Lideranca"("pessoaId");
CREATE INDEX IF NOT EXISTS "Lideranca_projectId_idx" ON "Lideranca"("projectId");
CREATE INDEX IF NOT EXISTS "Lideranca_deletedAt_idx" ON "Lideranca"("deletedAt");

CREATE TABLE IF NOT EXISTS "AvaliacaoLideranca" (
  "id"          TEXT NOT NULL,
  "liderancaId" TEXT NOT NULL,
  "dimensao"    TEXT NOT NULL,
  "pontuacao"   DOUBLE PRECISION NOT NULL,
  "observacao"  TEXT,
  "avaliadoPor" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AvaliacaoLideranca_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN ALTER TABLE "AvaliacaoLideranca" ADD CONSTRAINT "AvaliacaoLideranca_liderancaId_fkey" FOREIGN KEY ("liderancaId") REFERENCES "Lideranca"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "AvaliacaoLideranca_liderancaId_dimensao_key" ON "AvaliacaoLideranca"("liderancaId", "dimensao");
CREATE INDEX        IF NOT EXISTS "AvaliacaoLideranca_liderancaId_idx"          ON "AvaliacaoLideranca"("liderancaId");
