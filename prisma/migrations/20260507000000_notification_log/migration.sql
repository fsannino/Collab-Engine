-- Migration: NotificationLog para auditoria de notificações cron (Issue 027)

CREATE TYPE "NotificationLogType" AS ENUM (
  'OVERDUE_TRAINING',
  'TURMA_REMINDER',
  'ATTENDANCE_REMINDER'
);

CREATE TABLE "NotificationLog" (
  "id"             TEXT NOT NULL,
  "tenantId"       TEXT NOT NULL,
  "type"           "NotificationLogType" NOT NULL,
  "recipientEmail" TEXT NOT NULL,
  "subject"        TEXT NOT NULL,
  "refId"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NotificationLog_tenantId_idx" ON "NotificationLog"("tenantId");
CREATE INDEX "NotificationLog_type_refId_idx" ON "NotificationLog"("type", "refId");
CREATE INDEX "NotificationLog_createdAt_idx" ON "NotificationLog"("createdAt");
