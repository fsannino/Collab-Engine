# Sprint 2 — Migração de escalas e schema de governança

> **Estimativa:** 2-3 semanas  
> **Foco:** XPROC migra escala A/M/B → 1-5; Collab Engine ganha schema completo de governança (Impacto)

## Visão geral

Sprint 1 deixou os três sistemas alinhados em stack e SSO. Sprint 2 prepara o terreno para implementação de funcionalidades de governança nos três:

- **XPROC:** migrar escala de risco de A/M/B (3 níveis) para 1-5 (5 níveis), conforme ADR-001
- **SMR:** adicionar entidades Risk e Problem (ainda não existiam) seguindo padrão de governança
- **Collab Engine:** adicionar schema completo de ChangeImpact, ImpactActivity, ImpactArea, ImpactAcompanhamento

## Issues planejadas

### Issue 008 — XPROC migração escala 5×5

**Repositório:** XPROC

Migrar campos `severidade` e `probabilidade` de String enum (A/M/B) para Int (1-5), com:

- Schema atualizado no Prisma
- Migration expand/contract:
  - **Migration 1:** adicionar colunas `severidade_num`, `probabilidade_num` Int. Backfill: `B→2, M→3, A→4`. Código passa a escrever em ambos.
  - **Migration 2 (após 2 semanas):** remover colunas antigas, renomear novas
- UI atualizada para mostrar/editar escala 1-5
- Heatmap atualizado para grid 5×5
- Relatórios existentes adaptados
- Validação Zod ajustada
- Tests atualizados

**Tamanho:** Issue grande, pode dividir em sub-issues (8.1 schema/migration, 8.2 UI, 8.3 relatórios)

### Issue 009 — SMR ganha entidades Risk e Problem

**Repositório:** SMR Projetos

Adicionar ao schema do SMR:

```prisma
model Risk {
  id           String   @id @default(uuid())
  tenantId     String
  projectId    String
  project      Project  @relation(...)
  
  title        String
  description  String
  
  status       RiskStatus     @default(OPEN)
  severity     Int            @db.SmallInt  // 1-5
  probability  Int            @db.SmallInt  // 1-5
  score        Int            @db.SmallInt  // calculated
  
  // ... seguindo padrão de governança (skill governance-pattern)
  
  deletedAt    DateTime?
  deletedBy    String?
}

model Problem {
  // estrutura idêntica a Risk
}

model RiskActivity {
  // vínculo N:M com Tarefa
  contextStatus ContextActivityStatus
  // ...
}

model ProblemActivity { /* idem */ }
model RiskAcompanhamento { /* log temporal */ }
model ProblemAcompanhamento { /* idem */ }
```

UI:
- Nova aba "Riscos" em projeto
- Nova aba "Problemas" em projeto
- Heatmap 5×5 (componente reusado do Collab Engine ou replicado)
- Lista filtrada por status, severidade

Pega skill `governance-pattern` do Collab Engine como referência.

### Issue 010 — Collab Engine schema completo de Impacto

**Repositório:** Collab Engine

Adicionar ao `prisma/schema.prisma`:

```prisma
model ChangeImpact {
  id              String   @id @default(uuid())
  tenantId        String
  tenant          Tenant   @relation(...)
  projectId       String
  project         Project  @relation(...)
  
  title           String
  description     String
  
  dimension       ImpactDimension  // PROCESS, PEOPLE, TECHNOLOGY, STRUCTURE, CULTURE
  
  status          ImpactStatus     @default(OPEN)
  severity        Int              @db.SmallInt
  // Note: Impact não tem probability (já aconteceu)
  score           Int              @db.SmallInt
  
  currentState    String
  futureState     String
  gapAnalysis     String?
  
  identifiedAt    DateTime         @default(now())
  identifiedBy    String           // userId
  ownerId         String?          // responsável pela mitigação
  
  activities      ImpactActivity[]
  areas           ImpactArea[]
  acompanhamentos ImpactAcompanhamento[]
  
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  deletedAt       DateTime?
  deletedBy       String?
  
  @@index([tenantId, projectId])
  @@index([status])
  @@index([deletedAt])
}

enum ImpactDimension {
  PROCESS
  PEOPLE
  TECHNOLOGY
  STRUCTURE
  CULTURE
  POLICY
  METRICS
}

enum ImpactStatus {
  OPEN
  IN_PROGRESS
  MITIGATED
  CLOSED
  ACCEPTED
}

model ImpactActivity {
  id            String                @id @default(uuid())
  impactId      String
  impact        ChangeImpact          @relation(fields: [impactId], references: [id])
  
  smrActivityId String                // FK externa: Tarefa no SMR
  smrSnapshot   Json?                 // cache do estado da atividade no SMR
  
  contextStatus ContextActivityStatus @default(PENDING)
  observation   String?
  
  createdAt     DateTime              @default(now())
  deletedAt     DateTime?
  
  @@unique([impactId, smrActivityId])
  @@index([deletedAt])
}

enum ContextActivityStatus {
  PENDING
  IN_PROGRESS
  BLOCKING
  RESOLVED
  IRRELEVANT
}

model ImpactArea {
  id            String           @id @default(uuid())
  impactId      String
  impact        ChangeImpact     @relation(fields: [impactId], references: [id])
  
  areaId        String
  area          Area             @relation(fields: [areaId], references: [id])
  
  contextStatus ContextAreaStatus @default(IDENTIFIED)
  observation   String?
  
  createdAt     DateTime         @default(now())
  deletedAt    DateTime?
  
  @@unique([impactId, areaId])
  @@index([deletedAt])
}

enum ContextAreaStatus {
  IDENTIFIED
  ENGAGED
  RESISTING
  ABSORBED
}

model ImpactAcompanhamento {
  id           String       @id @default(uuid())
  impactId     String
  impact       ChangeImpact @relation(fields: [impactId], references: [id])
  
  authorId     String       // userId
  date         DateTime     @default(now())
  observation  String
  
  // Snapshot de auditoria
  statusBefore ImpactStatus?
  statusAfter  ImpactStatus?
  scoreBefore  Int?
  scoreAfter   Int?
  
  @@index([impactId, date])
}
```

Migration aplicada, Prisma client gerado, sem UI ainda (UI vem em Sprint 3).

### Issue 011 — Componente HeatmapMatrix compartilhado

**Repositório:** Collab Engine (e replicar/extrair para package compartilhado)

Implementar `src/shared/components/HeatmapMatrix.tsx` conforme skill `heatmap-component`:

- Grid 5×5 com cores
- Click handler
- Aria-labels
- Responsivo (vira lista em mobile)
- Variant para Impact (sem probability — eixo Y customizado, ex: dimension)

Tests com Vitest + Testing Library.

### Issue 012 — Utility de scoring centralizada

**Repositório:** Collab Engine

Criar `src/shared/governance/scoring.ts`:

```typescript
export type ScoreZone = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

export function calculateZone(score: number): ScoreZone { /* ... */ }
export function calculateScore(severity: number, probability: number | null): number { /* ... */ }
export function zoneColor(zone: ScoreZone): string { /* ... */ }
export function zoneLabel(zone: ScoreZone): string { /* ... */ }
```

Tests cobrindo casos limite (1, 4, 5, 9, 10, 15, 16, 25).

Replicar a mesma utility em SMR e XPROC, ou idealmente extrair para package compartilhado em monorepo (a discutir antes de fazer; pode ficar como duplicação consciente no MVP).

## Critérios de aceite do Sprint

- [ ] Issue 008 mergeada e em produção (XPROC com escala 1-5)
- [ ] Issue 009 mergeada e em produção (SMR com Risk e Problem)
- [ ] Issue 010 mergeada (schema completo Impact no Collab Engine)
- [ ] Issue 011 mergeada (HeatmapMatrix funcional, com tests)
- [ ] Issue 012 mergeada (scoring utility, com tests)
- [ ] Glossário atualizado com nomes finais das entidades
- [ ] Documentação técnica de cada migração

## Dependências externas

- Sprint 1 totalmente concluído (SSO ativo)

## Riscos

- Migração XPROC pode encontrar dados inconsistentes (riscos sem severidade definida) — script de saneamento pré-migração
- Backfill de dados em produção exige cuidado (rodar fora de horário comercial)

## Notas

Após Sprint 2, os três sistemas têm o **mesmo padrão de governança implementado**, com escalas comparáveis. Heatmaps cross-sistema (no Bridge) ficam viáveis a partir do Sprint 3.
