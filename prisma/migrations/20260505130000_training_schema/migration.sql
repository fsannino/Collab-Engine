-- EPIC 5: Training Orchestration (M5)
-- Adds TrainingStatus enum, TrainingMatrix and TrainingPlan tables

CREATE TYPE "TrainingStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE "TrainingMatrix" (
  "id"          TEXT          NOT NULL,
  "tenantId"    TEXT          NOT NULL,
  "projectId"   TEXT          NOT NULL,
  "impactId"    TEXT,
  "title"       TEXT          NOT NULL,
  "description" TEXT,
  "dimension"   "ImpactDimension",
  "targetRole"  TEXT,
  "durationH"   INTEGER,
  "mandatory"   BOOLEAN       NOT NULL DEFAULT true,
  "lmsModuleId" TEXT,
  "createdBy"   TEXT          NOT NULL,
  "createdAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt"   TIMESTAMP(3),
  CONSTRAINT "TrainingMatrix_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrainingPlan" (
  "id"              TEXT             NOT NULL,
  "matrixId"        TEXT             NOT NULL,
  "projectId"       TEXT             NOT NULL,
  "userId"          TEXT,
  "stakeholderId"   TEXT,
  "status"          "TrainingStatus" NOT NULL DEFAULT 'PENDING',
  "dueDate"         TIMESTAMP(3),
  "startedAt"       TIMESTAMP(3),
  "completedAt"     TIMESTAMP(3),
  "lmsEnrollmentId" TEXT,
  "lmsScore"        SMALLINT,
  "notes"           TEXT,
  "createdAt"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt"       TIMESTAMP(3),
  CONSTRAINT "TrainingPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrainingPlan_lmsEnrollmentId_key"
  ON "TrainingPlan"("lmsEnrollmentId") WHERE "lmsEnrollmentId" IS NOT NULL;

CREATE INDEX "TrainingMatrix_tenantId_idx"  ON "TrainingMatrix"("tenantId");
CREATE INDEX "TrainingMatrix_projectId_idx" ON "TrainingMatrix"("projectId");
CREATE INDEX "TrainingMatrix_impactId_idx"  ON "TrainingMatrix"("impactId");
CREATE INDEX "TrainingMatrix_deletedAt_idx" ON "TrainingMatrix"("deletedAt");

CREATE INDEX "TrainingPlan_matrixId_idx"      ON "TrainingPlan"("matrixId");
CREATE INDEX "TrainingPlan_projectId_idx"     ON "TrainingPlan"("projectId");
CREATE INDEX "TrainingPlan_userId_idx"        ON "TrainingPlan"("userId");
CREATE INDEX "TrainingPlan_stakeholderId_idx" ON "TrainingPlan"("stakeholderId");
CREATE INDEX "TrainingPlan_status_idx"        ON "TrainingPlan"("status");
CREATE INDEX "TrainingPlan_deletedAt_idx"     ON "TrainingPlan"("deletedAt");

ALTER TABLE "TrainingMatrix"
  ADD CONSTRAINT "TrainingMatrix_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "TrainingMatrix_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "TrainingMatrix_impactId_fkey"
    FOREIGN KEY ("impactId") REFERENCES "ChangeImpact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TrainingPlan"
  ADD CONSTRAINT "TrainingPlan_matrixId_fkey"
    FOREIGN KEY ("matrixId") REFERENCES "TrainingMatrix"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "TrainingPlan_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
