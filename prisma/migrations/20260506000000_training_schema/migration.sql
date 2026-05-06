-- Migration: Training schema (M5 — Sprint 4, Issue 022)
-- Adds: TrainingPlan, TrainingItem, FuncaoTreinamento, PessoaTreinamento, Turma, InscricaoTurma
-- + enums: TrainingPlanStatus, Modality, TrainingStatus, TurmaStatus

CREATE TYPE "TrainingPlanStatus" AS ENUM ('DRAFT', 'APPROVED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "Modality" AS ENUM ('PRESENCIAL', 'ONLINE', 'HIBRIDO', 'AUTOESTUDO');
CREATE TYPE "TrainingStatus" AS ENUM ('PENDENTE', 'INSCRITO', 'EM_ANDAMENTO', 'CONCLUIDO', 'AUSENTE', 'DISPENSADO');
CREATE TYPE "TurmaStatus" AS ENUM ('AGENDADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

CREATE TABLE "TrainingPlan" (
    "id"          TEXT NOT NULL,
    "tenantId"    TEXT NOT NULL,
    "projectId"   TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "status"      "TrainingPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate"   TIMESTAMP(3),
    "endDate"     TIMESTAMP(3),
    "createdBy"   TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "deletedAt"   TIMESTAMP(3),
    "deletedBy"   TEXT,

    CONSTRAINT "TrainingPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrainingItem" (
    "id"          TEXT NOT NULL,
    "planId"      TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT,
    "duration"    INTEGER,
    "modality"    "Modality" NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "deletedAt"   TIMESTAMP(3),

    CONSTRAINT "TrainingItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FuncaoTreinamento" (
    "id"             TEXT NOT NULL,
    "trainingItemId" TEXT NOT NULL,
    "funcaoId"       TEXT NOT NULL,
    "obrigatorio"    BOOLEAN NOT NULL DEFAULT true,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuncaoTreinamento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PessoaTreinamento" (
    "id"              TEXT NOT NULL,
    "trainingItemId"  TEXT NOT NULL,
    "pessoaId"        TEXT NOT NULL,
    "derivedFromFuncao" BOOLEAN NOT NULL DEFAULT true,
    "status"          "TrainingStatus" NOT NULL DEFAULT 'PENDENTE',
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    "deletedAt"       TIMESTAMP(3),

    CONSTRAINT "PessoaTreinamento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Turma" (
    "id"             TEXT NOT NULL,
    "trainingItemId" TEXT NOT NULL,
    "nome"           TEXT NOT NULL,
    "dataInicio"     TIMESTAMP(3) NOT NULL,
    "dataFim"        TIMESTAMP(3) NOT NULL,
    "modality"       "Modality" NOT NULL,
    "local"          TEXT,
    "instrutorId"    TEXT,
    "capacidade"     INTEGER,
    "status"         "TurmaStatus" NOT NULL DEFAULT 'AGENDADA',
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    "deletedAt"      TIMESTAMP(3),

    CONSTRAINT "Turma_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InscricaoTurma" (
    "id"                  TEXT NOT NULL,
    "turmaId"             TEXT NOT NULL,
    "pessoaTreinamentoId" TEXT NOT NULL,
    "presente"            BOOLEAN,
    "notaAvaliacao"       SMALLINT,
    "observacao"          TEXT,
    "conviteEnviadoEm"    TIMESTAMP(3),
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InscricaoTurma_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_tenantId_fkey"  FOREIGN KEY ("tenantId")  REFERENCES "Tenant"("id")  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TrainingItem" ADD CONSTRAINT "TrainingItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TrainingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FuncaoTreinamento" ADD CONSTRAINT "FuncaoTreinamento_trainingItemId_fkey" FOREIGN KEY ("trainingItemId") REFERENCES "TrainingItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FuncaoTreinamento" ADD CONSTRAINT "FuncaoTreinamento_funcaoId_fkey"       FOREIGN KEY ("funcaoId")       REFERENCES "Funcao"("id")       ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PessoaTreinamento" ADD CONSTRAINT "PessoaTreinamento_trainingItemId_fkey" FOREIGN KEY ("trainingItemId") REFERENCES "TrainingItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PessoaTreinamento" ADD CONSTRAINT "PessoaTreinamento_pessoaId_fkey"       FOREIGN KEY ("pessoaId")       REFERENCES "Pessoa"("id")       ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Turma" ADD CONSTRAINT "Turma_trainingItemId_fkey" FOREIGN KEY ("trainingItemId") REFERENCES "TrainingItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InscricaoTurma" ADD CONSTRAINT "InscricaoTurma_turmaId_fkey"             FOREIGN KEY ("turmaId")             REFERENCES "Turma"("id")             ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InscricaoTurma" ADD CONSTRAINT "InscricaoTurma_pessoaTreinamentoId_fkey" FOREIGN KEY ("pessoaTreinamentoId") REFERENCES "PessoaTreinamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Unique constraints
CREATE UNIQUE INDEX "FuncaoTreinamento_trainingItemId_funcaoId_key" ON "FuncaoTreinamento"("trainingItemId", "funcaoId");
CREATE UNIQUE INDEX "PessoaTreinamento_trainingItemId_pessoaId_key" ON "PessoaTreinamento"("trainingItemId", "pessoaId");
CREATE UNIQUE INDEX "InscricaoTurma_turmaId_pessoaTreinamentoId_key" ON "InscricaoTurma"("turmaId", "pessoaTreinamentoId");

-- Indexes
CREATE INDEX "TrainingPlan_tenantId_idx"  ON "TrainingPlan"("tenantId");
CREATE INDEX "TrainingPlan_projectId_idx" ON "TrainingPlan"("projectId");
CREATE INDEX "TrainingPlan_status_idx"    ON "TrainingPlan"("status");
CREATE INDEX "TrainingPlan_deletedAt_idx" ON "TrainingPlan"("deletedAt");

CREATE INDEX "TrainingItem_planId_idx"    ON "TrainingItem"("planId");
CREATE INDEX "TrainingItem_deletedAt_idx" ON "TrainingItem"("deletedAt");

CREATE INDEX "PessoaTreinamento_deletedAt_idx" ON "PessoaTreinamento"("deletedAt");

CREATE INDEX "Turma_trainingItemId_idx" ON "Turma"("trainingItemId");
CREATE INDEX "Turma_status_idx"         ON "Turma"("status");
CREATE INDEX "Turma_dataInicio_idx"     ON "Turma"("dataInicio");
CREATE INDEX "Turma_deletedAt_idx"      ON "Turma"("deletedAt");

CREATE INDEX "InscricaoTurma_turmaId_idx" ON "InscricaoTurma"("turmaId");
