-- Migration: NotificationLog (Issue 027 — Sprint 4)
-- Tabela de auditoria de notificações automatizadas (cron de treinamento).
-- Reversível: DROP TABLE "NotificationLog"; DROP TYPE "NotificationType"; DROP TYPE "NotificationSendStatus";

CREATE TYPE "NotificationType" AS ENUM (
  'TRAINING_ATRASADO_COORDENADOR',
  'TURMA_LEMBRETE_AMANHA',
  'PRESENCA_PENDENTE_INSTRUTOR'
);

CREATE TYPE "NotificationSendStatus" AS ENUM ('SENT', 'FAILED');

CREATE TABLE "NotificationLog" (
    "id"        TEXT NOT NULL,
    "tenantId"  TEXT,
    "type"      "NotificationType" NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject"   TEXT NOT NULL,
    "refId"     TEXT,
    "status"    "NotificationSendStatus" NOT NULL DEFAULT 'SENT',
    "error"     TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NotificationLog_type_refId_createdAt_idx" ON "NotificationLog"("type", "refId", "createdAt");
CREATE INDEX "NotificationLog_tenantId_idx" ON "NotificationLog"("tenantId");
CREATE INDEX "NotificationLog_createdAt_idx" ON "NotificationLog"("createdAt");
