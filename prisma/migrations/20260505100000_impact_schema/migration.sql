-- Issue 010: ChangeImpact domain models (M3 — Gestão de Mudança Organizacional)

-- CreateEnum
CREATE TYPE "ImpactDimension" AS ENUM ('PROCESS', 'PEOPLE', 'TECHNOLOGY', 'STRUCTURE', 'CULTURE', 'POLICY', 'METRICS');

-- CreateEnum
CREATE TYPE "ImpactStatus" AS ENUM ('DRAFT', 'ACTIVE', 'MITIGATING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "ChangeImpact" (
    "id"            TEXT NOT NULL,
    "tenantId"      TEXT NOT NULL,
    "projectId"     TEXT NOT NULL,
    "title"         TEXT NOT NULL,
    "description"   TEXT,
    "dimension"     "ImpactDimension" NOT NULL,
    "status"        "ImpactStatus" NOT NULL DEFAULT 'DRAFT',
    "severityScore" INTEGER NOT NULL,
    "extentScore"   INTEGER NOT NULL,
    "score"         INTEGER NOT NULL,
    "mitigation"    TEXT,
    "createdBy"     TEXT NOT NULL,
    "updatedBy"     TEXT,
    "deletedAt"     TIMESTAMP(3),
    "deletedBy"     TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeImpact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpactActivity" (
    "id"          TEXT NOT NULL,
    "impactId"    TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT,
    "status"      "ActivityStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate"     TIMESTAMP(3),
    "assignedTo"  TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "deletedAt"   TIMESTAMP(3),

    CONSTRAINT "ImpactActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpactArea" (
    "id"        TEXT NOT NULL,
    "impactId"  TEXT NOT NULL,
    "areaId"    TEXT NOT NULL,
    "note"      TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ImpactArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpactAcompanhamento" (
    "id"             TEXT NOT NULL,
    "impactId"       TEXT NOT NULL,
    "previousStatus" "ImpactStatus",
    "newStatus"      "ImpactStatus" NOT NULL,
    "previousScore"  INTEGER,
    "newScore"       INTEGER NOT NULL,
    "note"           TEXT,
    "changedBy"      TEXT NOT NULL,
    "changedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImpactAcompanhamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChangeImpact_tenantId_idx" ON "ChangeImpact"("tenantId");
CREATE INDEX "ChangeImpact_projectId_idx" ON "ChangeImpact"("projectId");
CREATE INDEX "ChangeImpact_dimension_idx" ON "ChangeImpact"("dimension");
CREATE INDEX "ChangeImpact_status_idx" ON "ChangeImpact"("status");
CREATE INDEX "ChangeImpact_deletedAt_idx" ON "ChangeImpact"("deletedAt");

CREATE INDEX "ImpactActivity_impactId_idx" ON "ImpactActivity"("impactId");
CREATE INDEX "ImpactActivity_deletedAt_idx" ON "ImpactActivity"("deletedAt");

CREATE UNIQUE INDEX "ImpactArea_impactId_areaId_key" ON "ImpactArea"("impactId", "areaId");
CREATE INDEX "ImpactArea_deletedAt_idx" ON "ImpactArea"("deletedAt");

CREATE INDEX "ImpactAcompanhamento_impactId_changedAt_idx" ON "ImpactAcompanhamento"("impactId", "changedAt");

-- AddForeignKey
ALTER TABLE "ChangeImpact" ADD CONSTRAINT "ChangeImpact_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ChangeImpact" ADD CONSTRAINT "ChangeImpact_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ImpactActivity" ADD CONSTRAINT "ImpactActivity_impactId_fkey"
    FOREIGN KEY ("impactId") REFERENCES "ChangeImpact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ImpactArea" ADD CONSTRAINT "ImpactArea_impactId_fkey"
    FOREIGN KEY ("impactId") REFERENCES "ChangeImpact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ImpactArea" ADD CONSTRAINT "ImpactArea_areaId_fkey"
    FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ImpactAcompanhamento" ADD CONSTRAINT "ImpactAcompanhamento_impactId_fkey"
    FOREIGN KEY ("impactId") REFERENCES "ChangeImpact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
