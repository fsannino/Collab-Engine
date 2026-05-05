-- Issue 017: SMR webhook integration
-- Adds smrActivityId to ImpactActivity and creates SmrWebhookLog table

-- Add smrActivityId to ImpactActivity (nullable, unique when set)
ALTER TABLE "ImpactActivity" ADD COLUMN "smrActivityId" TEXT;
CREATE UNIQUE INDEX "ImpactActivity_smrActivityId_key"
  ON "ImpactActivity"("smrActivityId")
  WHERE "smrActivityId" IS NOT NULL;

-- SMR webhook idempotency log
CREATE TABLE "SmrWebhookLog" (
  "id"          TEXT        NOT NULL,
  "eventId"     TEXT        NOT NULL,
  "activityId"  TEXT,
  "payload"     JSONB       NOT NULL,
  "status"      TEXT        NOT NULL DEFAULT 'RECEIVED',
  "error"       TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SmrWebhookLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SmrWebhookLog_eventId_key" ON "SmrWebhookLog"("eventId");
CREATE INDEX "SmrWebhookLog_status_idx"    ON "SmrWebhookLog"("status");
CREATE INDEX "SmrWebhookLog_createdAt_idx" ON "SmrWebhookLog"("createdAt");
