-- Migration: cultura_ocai
-- Adds AvaliacaoCultura, ConviteOcai, RespostaOcai for OCAI culture assessment

DO $$ BEGIN
  CREATE TYPE "AvaliacaoTipo" AS ENUM ('PROJETO', 'AREA', 'LIVRE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AvaliacaoStatus" AS ENUM ('RASCUNHO', 'ATIVA', 'ENCERRADA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "AvaliacaoCultura" (
  "id"          TEXT NOT NULL,
  "tenantId"    TEXT NOT NULL,
  "nome"        TEXT NOT NULL,
  "descricao"   TEXT,
  "tipo"        "AvaliacaoTipo"   NOT NULL DEFAULT 'LIVRE',
  "projectId"   TEXT,
  "areaId"      TEXT,
  "status"      "AvaliacaoStatus" NOT NULL DEFAULT 'RASCUNHO',
  "dataInicio"  TIMESTAMP(3),
  "dataFim"     TIMESTAMP(3),
  "createdBy"   TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt"   TIMESTAMP(3),
  CONSTRAINT "AvaliacaoCultura_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN ALTER TABLE "AvaliacaoCultura" ADD CONSTRAINT "AvaliacaoCultura_tenantId_fkey"  FOREIGN KEY ("tenantId")  REFERENCES "Tenant"("id")  ON DELETE RESTRICT  ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AvaliacaoCultura" ADD CONSTRAINT "AvaliacaoCultura_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AvaliacaoCultura" ADD CONSTRAINT "AvaliacaoCultura_areaId_fkey"    FOREIGN KEY ("areaId")    REFERENCES "Area"("id")    ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "AvaliacaoCultura_tenantId_idx"  ON "AvaliacaoCultura"("tenantId");
CREATE INDEX IF NOT EXISTS "AvaliacaoCultura_projectId_idx" ON "AvaliacaoCultura"("projectId");
CREATE INDEX IF NOT EXISTS "AvaliacaoCultura_areaId_idx"    ON "AvaliacaoCultura"("areaId");
CREATE INDEX IF NOT EXISTS "AvaliacaoCultura_status_idx"    ON "AvaliacaoCultura"("status");
CREATE INDEX IF NOT EXISTS "AvaliacaoCultura_deletedAt_idx" ON "AvaliacaoCultura"("deletedAt");

CREATE TABLE IF NOT EXISTS "ConviteOcai" (
  "id"           TEXT NOT NULL,
  "avaliacaoId"  TEXT NOT NULL,
  "pessoaId"     TEXT,
  "email"        TEXT NOT NULL,
  "nome"         TEXT NOT NULL,
  "token"        TEXT NOT NULL,
  "respondidoEm" TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConviteOcai_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN ALTER TABLE "ConviteOcai" ADD CONSTRAINT "ConviteOcai_avaliacaoId_fkey" FOREIGN KEY ("avaliacaoId") REFERENCES "AvaliacaoCultura"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ConviteOcai" ADD CONSTRAINT "ConviteOcai_pessoaId_fkey"   FOREIGN KEY ("pessoaId")   REFERENCES "Pessoa"("id")           ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "ConviteOcai_token_key"      ON "ConviteOcai"("token");
CREATE INDEX        IF NOT EXISTS "ConviteOcai_avaliacaoId_idx" ON "ConviteOcai"("avaliacaoId");

CREATE TABLE IF NOT EXISTS "RespostaOcai" (
  "id"          TEXT NOT NULL,
  "avaliacaoId" TEXT NOT NULL,
  "conviteId"   TEXT,
  "respostas"   JSONB NOT NULL,
  "manual"      BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RespostaOcai_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN ALTER TABLE "RespostaOcai" ADD CONSTRAINT "RespostaOcai_avaliacaoId_fkey" FOREIGN KEY ("avaliacaoId") REFERENCES "AvaliacaoCultura"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "RespostaOcai" ADD CONSTRAINT "RespostaOcai_conviteId_fkey"   FOREIGN KEY ("conviteId")   REFERENCES "ConviteOcai"("id")     ON DELETE SET NULL ON UPDATE CASCADE;  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "RespostaOcai_conviteId_key"   ON "RespostaOcai"("conviteId");
CREATE INDEX        IF NOT EXISTS "RespostaOcai_avaliacaoId_idx"  ON "RespostaOcai"("avaliacaoId");
