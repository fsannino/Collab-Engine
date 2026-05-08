-- Migration: gm_integrity_triggers
-- Adiciona:
--   1. Função utilitária would_create_cycle (hierarquia genérica)
--   2. Trigger anti-ciclo em Stakeholder.reportsToId
--   3. Função find_orphan_plan_items (ações vinculadas a risco)
--   4. Trigger orphan-check ao fechar/excluir Risk

-- ── 1. Função utilitária: detecção de ciclo em hierarquia ─────────────────────
-- Funciona com qualquer tabela que tenha (id text, <parent_field> text).
-- Parâmetros:
--   p_table_name    : nome qualificado da tabela, ex: '"Stakeholder"'
--   p_parent_field  : nome da coluna de FK pai, ex: 'reportsToId'
--   p_child_id      : id do nó filho
--   p_proposed_parent_id : id do pai proposto

CREATE OR REPLACE FUNCTION would_create_cycle(
  p_table_name     text,
  p_parent_field   text,
  p_child_id       text,
  p_proposed_parent_id text
) RETURNS boolean
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_query  text;
  v_result boolean := false;
BEGIN
  -- Caso trivial: nó sendo seu próprio pai
  IF p_child_id = p_proposed_parent_id THEN
    RETURN true;
  END IF;

  -- Walk ascendente a partir do pai proposto; se encontrar child_id → há ciclo
  v_query := format(
    $q$
      WITH RECURSIVE ancestors AS (
        SELECT id, %I AS parent_id
        FROM %s
        WHERE id = %L

        UNION ALL

        SELECT t.id, t.%I
        FROM %s t
        JOIN ancestors a ON a.parent_id = t.id
        WHERE a.parent_id IS NOT NULL
      )
      SELECT EXISTS (SELECT 1 FROM ancestors WHERE id = %L)
    $q$,
    p_parent_field, p_table_name, p_proposed_parent_id,
    p_parent_field, p_table_name,
    p_child_id
  );

  EXECUTE v_query INTO v_result;
  RETURN COALESCE(v_result, false);
END;
$$;

-- ── 2. Trigger anti-ciclo em "Stakeholder"."reportsToId" ─────────────────────

CREATE OR REPLACE FUNCTION check_stakeholder_hierarchy_cycle()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."reportsToId" IS NOT NULL THEN
    IF would_create_cycle('"Stakeholder"', 'reportsToId', NEW.id, NEW."reportsToId") THEN
      RAISE EXCEPTION
        'Atribuição cria ciclo na hierarquia de stakeholders. '
        'Stakeholder % não pode reportar a % — cadeia ascendente já contém %.',
        NEW.id, NEW."reportsToId", NEW.id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Stakeholder ainda não tem reportsToId — o trigger fica pronto para quando
-- a coluna for adicionada. Se já existir, o CREATE OR REPLACE acima já a atualiza.

-- Adiciona a coluna reportsToId em Stakeholder (auto-referência, nullable)
ALTER TABLE "Stakeholder"
  ADD COLUMN IF NOT EXISTS "reportsToId" TEXT
  REFERENCES "Stakeholder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Stakeholder_reportsToId_idx" ON "Stakeholder"("reportsToId");

DROP TRIGGER IF EXISTS stakeholder_anti_cycle ON "Stakeholder";
CREATE TRIGGER stakeholder_anti_cycle
  BEFORE INSERT OR UPDATE OF "reportsToId" ON "Stakeholder"
  FOR EACH ROW
  EXECUTE FUNCTION check_stakeholder_hierarchy_cycle();

-- ── 3. Função: encontra ChangePlanItems abertos vinculados a um risco ─────────

CREATE OR REPLACE FUNCTION find_orphan_plan_items(p_risk_id text)
RETURNS TABLE(
  item_id     text,
  description text,
  status      text,
  pct_complete smallint
)
LANGUAGE sql STABLE AS $$
  SELECT
    id,
    description,
    status::text,
    "pctComplete"
  FROM "ChangePlanItem"
  WHERE "sourceRiskId" = p_risk_id
    AND status IN ('OPEN', 'IN_PROGRESS')
    AND "deletedAt" IS NULL;
$$;

-- ── 4. Trigger orphan-check ao fechar / excluir Risk ─────────────────────────

CREATE OR REPLACE FUNCTION check_orphan_actions_on_risk_close()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_count      int;
  v_skip       boolean;
BEGIN
  -- A API pode sinalizar que o usuário já confirmou a resolução
  v_skip := COALESCE(
    NULLIF(current_setting('gm.skip_orphan_check', true), '')::boolean,
    false
  );
  IF v_skip THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM find_orphan_plan_items(NEW.id);

  IF v_count > 0 THEN
    RAISE EXCEPTION
      'Risco tem % ação(ões) vinculada(s) ainda em aberto. '
      'Confirme uma das opções: (a) cancelar todas, (b) reatribuir, (c) manter standalone.',
      v_count
      USING ERRCODE = 'P0001', HINT = 'orphan_actions_pending';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS risk_close_orphan_check ON "Risk";
CREATE TRIGGER risk_close_orphan_check
  BEFORE UPDATE OF status, "deletedAt" ON "Risk"
  FOR EACH ROW
  WHEN (
    (OLD.status <> 'CLOSED' AND NEW.status = 'CLOSED')
    OR (OLD."deletedAt" IS NULL AND NEW."deletedAt" IS NOT NULL)
  )
  EXECUTE FUNCTION check_orphan_actions_on_risk_close();
