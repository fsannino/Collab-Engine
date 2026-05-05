# Sprint 3 — Módulos M2 (Stakeholder) e M3 (Impacto) implementados

> **Estimativa:** 3-4 semanas  
> **Foco:** Primeiras features funcionais do Collab Engine: Stakeholder Mapping (M2) e Impact Assessment (M3) com UI completa, integração com SMR via webhook

## Visão geral

Sprint 3 entrega as duas primeiras features de valor do Collab Engine:

- **M2 — Stakeholder Mapping:** identificação, classificação e gestão de stakeholders do projeto de mudança
- **M3 — Impact Assessment:** identificação e gestão de impactos organizacionais

Junto, entra a primeira integração viva entre Collab Engine e SMR Projetos: webhooks que sincronizam estado de Atividades.

## Issues planejadas

### Issue 013 — Schema completo de Stakeholder

**Repositório:** Collab Engine

Expandir `Stakeholder` (que está como esqueleto):

```prisma
model Stakeholder {
  id          String   @id @default(uuid())
  tenantId    String
  
  pessoaId    String?  // Vínculo com Pessoa (opcional, mas recomendado)
  pessoa      Pessoa?  @relation(...)
  
  // Dados próprios (caso não tenha Pessoa associada)
  name        String
  email       String?
  
  position    String?      // cargo no contexto do projeto (texto livre)
  organizationLevel StakeholderLevel
  
  hrisId      String?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
}

enum StakeholderLevel {
  C_LEVEL
  EXECUTIVE
  MIDDLE_MANAGEMENT
  OPERATIONAL
  EXTERNAL
}

model ProjectStakeholder {
  id              String   @id @default(uuid())
  projectId       String
  project         Project  @relation(...)
  stakeholderId   String
  stakeholder     Stakeholder @relation(...)
  
  position        StakeholderPosition  // CHAMPION, SUPPORTER, NEUTRAL, RESISTOR, ANTAGONIST
  influence       Int      @db.SmallInt  // 1-5
  interest        Int      @db.SmallInt  // 1-5
  
  notes           String?
  lastContactDate DateTime?
  
  // ADKAR scores opcional
  adkarA          Int?     @db.SmallInt
  adkarD          Int?     @db.SmallInt
  adkarK          Int?     @db.SmallInt
  adkarAb         Int?     @db.SmallInt
  adkarR          Int?     @db.SmallInt
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?
  
  @@unique([projectId, stakeholderId])
}

enum StakeholderPosition {
  CHAMPION
  SUPPORTER
  NEUTRAL
  RESISTOR
  ANTAGONIST
}
```

Server actions: `createStakeholderAction`, `updateStakeholderPositionAction`, `linkPersonAction`, `recordContactAction`.

### Issue 014 — UI Stakeholder Mapping (M2)

**Repositório:** Collab Engine

Páginas:

- `/projects/[id]/stakeholders` — lista com filtros (posição, influência)
- `/projects/[id]/stakeholders/[sid]` — detalhe + histórico de contato
- `/projects/[id]/stakeholders/new` — cadastro novo
- `/projects/[id]/stakeholders/matrix` — matriz Influence × Interest (5×5)
- `/projects/[id]/stakeholders/import` — bulk import via CSV

Componentes:

- `StakeholderMatrix` (matriz 5×5 reusando HeatmapMatrix com adaptações)
- `StakeholderCard`
- `ADKARGauge`

### Issue 015 — Server actions de ChangeImpact (M3)

**Repositório:** Collab Engine

Implementar:

- `createImpactAction` — cria com vínculos a atividades e áreas
- `updateImpactAction` — atualiza campos
- `linkActivityToImpactAction` — adiciona vinculação
- `updateActivityContextStatusAction` — muda status contextual
- `linkAreaToImpactAction`
- `addAcompanhamentoAction` — adiciona entrada de log temporal
- `closeImpactAction` — fecha com snapshot de auditoria

Schemas Zod completos em `src/modules/impact/impact.schema.ts`. Tests unitários cobrindo casos válidos e inválidos.

### Issue 016 — UI Impact Assessment (M3)

**Repositório:** Collab Engine

Páginas:

- `/projects/[id]/impacts` — lista
- `/projects/[id]/impacts/new` — wizard de cadastro (3 passos: descrição → vínculos → revisão)
- `/projects/[id]/impacts/[iid]` — detalhe com:
  - Heatmap se múltiplos impactos da mesma dimensão
  - Lista de atividades vinculadas com status contextual editável
  - Lista de áreas vinculadas com status contextual editável
  - Timeline de acompanhamentos
  - Botão "Adicionar acompanhamento"
- `/projects/[id]/impacts/heatmap` — visão agregada (Severity × Dimension)
- `/projects/[id]/impacts/report` — relatório PDF/Excel exportável

### Issue 017 — Integração com SMR via webhooks (sync de Atividades)

**Repositório:** Collab Engine + SMR Projetos

Quando o usuário no Collab Engine vincula uma atividade do SMR a um Impacto:

1. Collab Engine consulta SMR via API (`GET /api/v1/projects/{pid}/tarefas/{tid}`) para validar e cachear snapshot
2. Cria `ImpactActivity` com `smrActivityId` e `smrSnapshot` cacheado
3. Cria webhook subscription no SMR para essa atividade

Quando atividade muda no SMR:

4. SMR dispara webhook para `/api/webhooks/smr/activity-changed` no Collab Engine
5. Collab atualiza `smrSnapshot` no `ImpactActivity` correspondente
6. UI do impacto reflete mudança em real-time

Implementação no SMR:

- Endpoint `POST /api/v1/webhooks/subscribe` recebe URL + tipo de evento + secret
- Tabela `WebhookSubscription` armazena subscriptions
- Após cada update de Tarefa, dispara para subscribers ativos
- Retry policy: 3x com backoff exponencial

Implementação no Collab Engine:

- `src/integration/smr/client.ts` — wrapper para chamadas HTTP ao SMR
- `src/integration/smr/webhook-handler.ts` — receiver dos webhooks
- `src/app/api/webhooks/smr/activity-changed/route.ts` — endpoint
- Validação HMAC do payload

### Issue 018 — Importação CSV de stakeholders

**Repositório:** Collab Engine

Wizard:

1. Upload do arquivo CSV
2. Mapeamento de colunas (UI mostra colunas detectadas, usuário escolhe qual é nome, qual é email, etc.)
3. Preview com validação Zod por linha (linhas inválidas destacadas)
4. Confirmação e import
5. Resultado: X criados, Y atualizados, Z falhados

Template CSV disponível para download.

### Issue 019 — Dashboard inicial do projeto

**Repositório:** Collab Engine

`/projects/[id]/dashboard`:

- KPIs: total stakeholders, distribuição por posição, total impactos por status
- Heatmap de impactos (severity × dimension)
- Matriz de stakeholders (influence × interest)
- Lista de últimos acompanhamentos (todos os impactos)
- Quick actions: novo stakeholder, novo impacto

## Critérios de aceite do Sprint

- [ ] Stakeholder Mapping (M2) totalmente funcional em produção
- [ ] Impact Assessment (M3) totalmente funcional em produção
- [ ] Integração SMR↔Collab via webhooks funcional (atividade muda no SMR → reflete no Collab)
- [ ] Importação CSV de stakeholders testada com dataset real
- [ ] Dashboard de projeto operacional
- [ ] Todos os fluxos cobertos por testes E2E (Playwright ou similar)
- [ ] Performance: lista de 100+ stakeholders/impactos carrega em <2s
- [ ] Documentação de uso para usuário final (tutorial em PT)

## Dependências

- Sprint 1 e Sprint 2 totalmente concluídos
- SMR com endpoints `GET /api/v1/projects/{pid}/tarefas/{tid}` e `POST /api/v1/webhooks/subscribe` (issue separada do SMR pode ser pré-requisito)

## Riscos

- Performance do webhook em projetos grandes (>1000 atividades) — paginação e batch necessários
- Conflito de timing: usuário muda no Collab enquanto webhook chega do SMR — usar timestamps + last-write-wins documentado

## Notas

Sprint 3 é o **primeiro sprint que entrega valor real ao usuário final**. Após Sprint 3, é possível usar o Collab Engine em projetos reais da CollabZ, com benefício mensurável vs. trabalhar só com SMR.
