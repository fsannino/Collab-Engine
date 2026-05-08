-- OCAI privacy/consent fields (additive — no breaking changes)

-- 1. ConviteStatus enum
DO $$ BEGIN
  CREATE TYPE "ConviteStatus" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO', 'OPTADO_OUT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. AvaliacaoCultura: minimum group size for LGPD suppression
ALTER TABLE "AvaliacaoCultura" ADD COLUMN IF NOT EXISTS "minGroupSize" INTEGER NOT NULL DEFAULT 3;

-- 3. ConviteOcai: lifecycle status + consent timestamp
ALTER TABLE "ConviteOcai" ADD COLUMN IF NOT EXISTS "status" "ConviteStatus" NOT NULL DEFAULT 'PENDENTE';
ALTER TABLE "ConviteOcai" ADD COLUMN IF NOT EXISTS "consentAt" TIMESTAMP(3);

-- Backfill: already-answered invites → CONCLUIDO
UPDATE "ConviteOcai" SET "status" = 'CONCLUIDO' WHERE "respondidoEm" IS NOT NULL AND "status" = 'PENDENTE';

-- 4. RespostaOcai: privacy-safe IP fingerprint + device info
ALTER TABLE "RespostaOcai" ADD COLUMN IF NOT EXISTS "ipHash" TEXT;
ALTER TABLE "RespostaOcai" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
