-- Issue 013: Stakeholder schema completo (M2 — Sprint 3)

-- CreateEnum
CREATE TYPE "StakeholderLevel" AS ENUM ('C_LEVEL', 'EXECUTIVE', 'MIDDLE_MANAGEMENT', 'OPERATIONAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "StakeholderPosition" AS ENUM ('CHAMPION', 'SUPPORTER', 'NEUTRAL', 'RESISTOR', 'ANTAGONIST');

-- AlterTable: expand Stakeholder with position and organizationLevel
ALTER TABLE "Stakeholder"
    ADD COLUMN "position"          TEXT,
    ADD COLUMN "organizationLevel" "StakeholderLevel";

-- CreateTable
CREATE TABLE "ProjectStakeholder" (
    "id"              TEXT NOT NULL,
    "projectId"       TEXT NOT NULL,
    "stakeholderId"   TEXT NOT NULL,
    "position"        "StakeholderPosition" NOT NULL,
    "influence"       SMALLINT NOT NULL,
    "interest"        SMALLINT NOT NULL,
    "notes"           TEXT,
    "lastContactDate" TIMESTAMP(3),
    "adkarA"          SMALLINT,
    "adkarD"          SMALLINT,
    "adkarK"          SMALLINT,
    "adkarAb"         SMALLINT,
    "adkarR"          SMALLINT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    "deletedAt"       TIMESTAMP(3),

    CONSTRAINT "ProjectStakeholder_pkey" PRIMARY KEY ("id")
);

-- Unique: one row per stakeholder per project
CREATE UNIQUE INDEX "ProjectStakeholder_projectId_stakeholderId_key"
    ON "ProjectStakeholder"("projectId", "stakeholderId");

-- Indexes
CREATE INDEX "ProjectStakeholder_projectId_idx"     ON "ProjectStakeholder"("projectId");
CREATE INDEX "ProjectStakeholder_stakeholderId_idx" ON "ProjectStakeholder"("stakeholderId");
CREATE INDEX "ProjectStakeholder_position_idx"      ON "ProjectStakeholder"("position");
CREATE INDEX "ProjectStakeholder_deletedAt_idx"     ON "ProjectStakeholder"("deletedAt");

-- AddForeignKey
ALTER TABLE "ProjectStakeholder"
    ADD CONSTRAINT "ProjectStakeholder_projectId_fkey"
        FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProjectStakeholder"
    ADD CONSTRAINT "ProjectStakeholder_stakeholderId_fkey"
        FOREIGN KEY ("stakeholderId") REFERENCES "Stakeholder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
