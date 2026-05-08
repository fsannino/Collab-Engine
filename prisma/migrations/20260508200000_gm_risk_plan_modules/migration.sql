-- Migration: gm_risk_plan_modules
-- Adds: Risk, RiskSource, ChangePlanItem, ResistanceItem, QuickWin,
--        AfterActionReview, ExitChecklistItem, ControlPlanItem, FinancialAction

-- ── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE "RiskStatus" AS ENUM ('OPEN', 'MITIGATING', 'CLOSED', 'ACCEPTED');
CREATE TYPE "RiskSourceModule" AS ENUM ('GM', 'XPROC', 'PMO', 'EXTERNAL');
CREATE TYPE "RiskSourceEntityType" AS ENUM (
  'HISTORY_ASSESSMENT', 'CULTURE_DIMENSION', 'GAP_ANALYSIS',
  'CHANGE_IMPACT', 'MULTIPLE_CHANGE', 'PROJECT_INITIATION', 'MANUAL'
);

CREATE TYPE "ChangePlanLever" AS ENUM (
  'COMMUNICATION', 'SPONSORSHIP', 'TRAINING', 'COACHING',
  'RESISTANCE_MANAGEMENT', 'PROCESS_REDESIGN', 'TECHNOLOGY',
  'ORGANIZATION_DESIGN', 'OTHER'
);
CREATE TYPE "ChangePlanStatus" AS ENUM ('DRAFT', 'OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');

CREATE TYPE "ResistanceIntensity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "ResistanceStatus"    AS ENUM ('IDENTIFIED', 'BEING_ADDRESSED', 'RESOLVED', 'ACCEPTED');

CREATE TYPE "QuickWinStatus"      AS ENUM ('BACKLOG', 'IN_PROGRESS', 'DONE', 'DROPPED');

CREATE TYPE "ChecklistItemStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'WAIVED');

CREATE TYPE "ControlFrequency"    AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY');
CREATE TYPE "ControlDataSource"   AS ENUM ('MANUAL', 'INTEGRATION');
CREATE TYPE "RagStatus"           AS ENUM ('GREEN', 'AMBER', 'RED');

CREATE TYPE "FinancialActionType" AS ENUM ('COST', 'BENEFIT');
CREATE TYPE "FinancialCategory"   AS ENUM (
  'CONSULTING', 'LICENSE', 'INTERNAL_HOURS', 'COMMUNICATION',
  'INFRASTRUCTURE', 'OPPORTUNITY_COST', 'PRODUCTIVITY_GAIN',
  'TURNOVER_REDUCTION', 'REVENUE_INCREASE', 'REWORK_REDUCTION', 'OTHER'
);

-- ── Risk ─────────────────────────────────────────────────────────────────────

CREATE TABLE "Risk" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "tenantId"    TEXT NOT NULL,
  "projectId"   TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "impact"      SMALLINT NOT NULL,
  "probability" SMALLINT NOT NULL,
  "mitigation"  TEXT,
  "status"      "RiskStatus" NOT NULL DEFAULT 'OPEN',
  "ownerId"     TEXT,
  "dueAt"       TIMESTAMP(3),
  "closedAt"    TIMESTAMP(3),
  "createdBy"   TEXT NOT NULL,
  "updatedBy"   TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  "deletedAt"   TIMESTAMP(3),
  CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Risk" ADD CONSTRAINT "Risk_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Risk_tenantId_idx"   ON "Risk"("tenantId");
CREATE INDEX "Risk_projectId_idx"  ON "Risk"("projectId");
CREATE INDEX "Risk_status_idx"     ON "Risk"("status");
CREATE INDEX "Risk_deletedAt_idx"  ON "Risk"("deletedAt");

-- ── RiskSource ───────────────────────────────────────────────────────────────

CREATE TABLE "RiskSource" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "riskId"           TEXT NOT NULL,
  "sourceModule"     "RiskSourceModule" NOT NULL,
  "sourceEntityType" "RiskSourceEntityType" NOT NULL,
  "sourceEntityId"   TEXT,
  "notes"            TEXT,
  "identifiedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "identifiedBy"     TEXT NOT NULL,
  CONSTRAINT "RiskSource_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RiskSource_unique" UNIQUE ("riskId", "sourceModule", "sourceEntityType", "sourceEntityId")
);

ALTER TABLE "RiskSource" ADD CONSTRAINT "RiskSource_riskId_fkey"
  FOREIGN KEY ("riskId") REFERENCES "Risk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "RiskSource_riskId_idx" ON "RiskSource"("riskId");

-- ── ChangePlanItem ────────────────────────────────────────────────────────────

CREATE TABLE "ChangePlanItem" (
  "id"                 TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "tenantId"           TEXT NOT NULL,
  "projectId"          TEXT NOT NULL,
  "sourceRiskId"       TEXT,
  "lever"              "ChangePlanLever" NOT NULL,
  "description"        TEXT NOT NULL,
  "ownerId"            TEXT,
  "startDate"          TIMESTAMP(3),
  "endDate"            TIMESTAMP(3),
  "status"             "ChangePlanStatus" NOT NULL DEFAULT 'DRAFT',
  "pctComplete"        SMALLINT NOT NULL DEFAULT 0,
  "estimatedCost"      DOUBLE PRECISION,
  "actualCost"         DOUBLE PRECISION,
  "cancellationReason" TEXT,
  "createdBy"          TEXT NOT NULL,
  "updatedBy"          TEXT,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL,
  "deletedAt"          TIMESTAMP(3),
  CONSTRAINT "ChangePlanItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ChangePlanItem" ADD CONSTRAINT "ChangePlanItem_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChangePlanItem" ADD CONSTRAINT "ChangePlanItem_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChangePlanItem" ADD CONSTRAINT "ChangePlanItem_sourceRiskId_fkey"
  FOREIGN KEY ("sourceRiskId") REFERENCES "Risk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ChangePlanItem_tenantId_idx"     ON "ChangePlanItem"("tenantId");
CREATE INDEX "ChangePlanItem_projectId_idx"    ON "ChangePlanItem"("projectId");
CREATE INDEX "ChangePlanItem_sourceRiskId_idx" ON "ChangePlanItem"("sourceRiskId");
CREATE INDEX "ChangePlanItem_status_idx"       ON "ChangePlanItem"("status");
CREATE INDEX "ChangePlanItem_deletedAt_idx"    ON "ChangePlanItem"("deletedAt");

-- ── ResistanceItem ────────────────────────────────────────────────────────────

CREATE TABLE "ResistanceItem" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "tenantId"       TEXT NOT NULL,
  "projectId"      TEXT NOT NULL,
  "stakeholderId"  TEXT,
  "description"    TEXT NOT NULL,
  "rootCause"      TEXT,
  "intensity"      "ResistanceIntensity" NOT NULL DEFAULT 'MEDIUM',
  "status"         "ResistanceStatus" NOT NULL DEFAULT 'IDENTIFIED',
  "mitigationPlan" TEXT,
  "resolvedAt"     TIMESTAMP(3),
  "createdBy"      TEXT NOT NULL,
  "updatedBy"      TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  "deletedAt"      TIMESTAMP(3),
  CONSTRAINT "ResistanceItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ResistanceItem" ADD CONSTRAINT "ResistanceItem_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResistanceItem" ADD CONSTRAINT "ResistanceItem_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResistanceItem" ADD CONSTRAINT "ResistanceItem_stakeholderId_fkey"
  FOREIGN KEY ("stakeholderId") REFERENCES "Stakeholder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ResistanceItem_tenantId_idx"     ON "ResistanceItem"("tenantId");
CREATE INDEX "ResistanceItem_projectId_idx"    ON "ResistanceItem"("projectId");
CREATE INDEX "ResistanceItem_stakeholderId_idx" ON "ResistanceItem"("stakeholderId");
CREATE INDEX "ResistanceItem_status_idx"       ON "ResistanceItem"("status");
CREATE INDEX "ResistanceItem_deletedAt_idx"    ON "ResistanceItem"("deletedAt");

-- ── QuickWin ──────────────────────────────────────────────────────────────────

CREATE TABLE "QuickWin" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "tenantId"    TEXT NOT NULL,
  "projectId"   TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "ownerId"     TEXT,
  "targetDate"  TIMESTAMP(3),
  "status"      "QuickWinStatus" NOT NULL DEFAULT 'BACKLOG',
  "impact"      SMALLINT NOT NULL DEFAULT 3,
  "effort"      SMALLINT NOT NULL DEFAULT 3,
  "completedAt" TIMESTAMP(3),
  "createdBy"   TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  "deletedAt"   TIMESTAMP(3),
  CONSTRAINT "QuickWin_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "QuickWin" ADD CONSTRAINT "QuickWin_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuickWin" ADD CONSTRAINT "QuickWin_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "QuickWin_tenantId_idx"  ON "QuickWin"("tenantId");
CREATE INDEX "QuickWin_projectId_idx" ON "QuickWin"("projectId");
CREATE INDEX "QuickWin_status_idx"    ON "QuickWin"("status");
CREATE INDEX "QuickWin_deletedAt_idx" ON "QuickWin"("deletedAt");

-- ── AfterActionReview ─────────────────────────────────────────────────────────

CREATE TABLE "AfterActionReview" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "tenantId"        TEXT NOT NULL,
  "projectId"       TEXT NOT NULL,
  "whatWorked"      TEXT,
  "whatDidntWork"   TEXT,
  "lessons"         TEXT,
  "recommendations" TEXT,
  "participants"    TEXT[] NOT NULL DEFAULT '{}',
  "conductedAt"     TIMESTAMP(3),
  "conductedBy"     TEXT,
  "createdBy"       TEXT NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AfterActionReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AfterActionReview_projectId_key" UNIQUE ("projectId")
);

ALTER TABLE "AfterActionReview" ADD CONSTRAINT "AfterActionReview_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "AfterActionReview_tenantId_idx" ON "AfterActionReview"("tenantId");

-- ── ExitChecklistItem ─────────────────────────────────────────────────────────

CREATE TABLE "ExitChecklistItem" (
  "id"                  TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "tenantId"            TEXT NOT NULL,
  "projectId"           TEXT NOT NULL,
  "criterion"           TEXT NOT NULL,
  "evidenceRequired"    TEXT,
  "evidenceDescription" TEXT,
  "status"              "ChecklistItemStatus" NOT NULL DEFAULT 'PENDING',
  "approvedBy"          TEXT,
  "approvedAt"          TIMESTAMP(3),
  "order"               INTEGER NOT NULL DEFAULT 0,
  "createdBy"           TEXT NOT NULL,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL,
  "deletedAt"           TIMESTAMP(3),
  CONSTRAINT "ExitChecklistItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ExitChecklistItem" ADD CONSTRAINT "ExitChecklistItem_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExitChecklistItem" ADD CONSTRAINT "ExitChecklistItem_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "ExitChecklistItem_tenantId_idx"  ON "ExitChecklistItem"("tenantId");
CREATE INDEX "ExitChecklistItem_projectId_idx" ON "ExitChecklistItem"("projectId");
CREATE INDEX "ExitChecklistItem_deletedAt_idx" ON "ExitChecklistItem"("deletedAt");

-- ── ControlPlanItem ───────────────────────────────────────────────────────────

CREATE TABLE "ControlPlanItem" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "tenantId"        TEXT NOT NULL,
  "projectId"       TEXT NOT NULL,
  "controlName"     TEXT NOT NULL,
  "metricMonitored" TEXT NOT NULL,
  "frequency"       "ControlFrequency" NOT NULL DEFAULT 'MONTHLY',
  "thresholdLow"    DOUBLE PRECISION,
  "thresholdHigh"   DOUBLE PRECISION,
  "ownerId"         TEXT,
  "dataSource"      "ControlDataSource" NOT NULL DEFAULT 'MANUAL',
  "lastMeasurement" DOUBLE PRECISION,
  "lastMeasuredAt"  TIMESTAMP(3),
  "statusRag"       "RagStatus",
  "createdBy"       TEXT NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  "deletedAt"       TIMESTAMP(3),
  CONSTRAINT "ControlPlanItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ControlPlanItem" ADD CONSTRAINT "ControlPlanItem_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ControlPlanItem" ADD CONSTRAINT "ControlPlanItem_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "ControlPlanItem_tenantId_idx"  ON "ControlPlanItem"("tenantId");
CREATE INDEX "ControlPlanItem_projectId_idx" ON "ControlPlanItem"("projectId");
CREATE INDEX "ControlPlanItem_deletedAt_idx" ON "ControlPlanItem"("deletedAt");

-- ── FinancialAction ───────────────────────────────────────────────────────────

CREATE TABLE "FinancialAction" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "tenantId"         TEXT NOT NULL,
  "projectId"        TEXT NOT NULL,
  "changePlanItemId" TEXT,
  "type"             "FinancialActionType" NOT NULL,
  "category"         "FinancialCategory" NOT NULL,
  "amount"           DOUBLE PRECISION NOT NULL,
  "currency"         TEXT NOT NULL DEFAULT 'BRL',
  "occurredAt"       TIMESTAMP(3) NOT NULL,
  "description"      TEXT,
  "isBudgeted"       BOOLEAN NOT NULL DEFAULT true,
  "probabilityPct"   SMALLINT,
  "createdBy"        TEXT NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  "deletedAt"        TIMESTAMP(3),
  CONSTRAINT "FinancialAction_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FinancialAction" ADD CONSTRAINT "FinancialAction_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialAction" ADD CONSTRAINT "FinancialAction_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialAction" ADD CONSTRAINT "FinancialAction_changePlanItemId_fkey"
  FOREIGN KEY ("changePlanItemId") REFERENCES "ChangePlanItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "FinancialAction_tenantId_idx"         ON "FinancialAction"("tenantId");
CREATE INDEX "FinancialAction_projectId_idx"        ON "FinancialAction"("projectId");
CREATE INDEX "FinancialAction_changePlanItemId_idx" ON "FinancialAction"("changePlanItemId");
CREATE INDEX "FinancialAction_type_idx"             ON "FinancialAction"("type");
CREATE INDEX "FinancialAction_deletedAt_idx"        ON "FinancialAction"("deletedAt");
