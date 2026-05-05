---
name: governance-pattern
description: "Use this skill when implementing or modifying governance entities in the Collab Engine ecosystem: Risk (in SMR), Problem (in SMR), Impact (in Collab Engine). Defines the shared structural pattern, the 5x5 severity scale, contextual status in M:N relations, soft delete with history, and required heatmap support. Trigger when working on any governance entity, governance reports, heatmaps, or cross-system governance dashboards."
---

# Padrão de Governança Transversal

## O que é

Risco, Problema e Impacto compartilham o **mesmo padrão estrutural** mesmo vivendo em sistemas diferentes:

| Entidade | Sistema | Significa |
|----------|---------|-----------|
| **Risco** | SMR Projetos | O que **pode acontecer** com o projeto |
| **Problema** | SMR Projetos | O que **já aconteceu** e precisa solução |
| **Impacto** | Collab Engine | O que **vai mudar** na organização |

Todas seguem a mesma estrutura. Quando implementar uma, **espelhar** a outra.

## Componentes obrigatórios do padrão

### 1. Identidade da entidade

```prisma
model ChangeImpact {
  id          String   @id @default(uuid())
  tenantId    String
  projectId   String
  
  title       String   // Resumo curto, max 200 chars
  description String   // Descrição completa, texto livre
  
  // ... componentes do padrão abaixo
}
```

### 2. Estado próprio (ciclo de vida)

Cada entidade tem **seu próprio status** independente do projeto:

```prisma
enum ImpactStatus {
  OPEN          // Identificado, ainda não tratado
  IN_PROGRESS   // Mitigação em andamento
  MITIGATED     // Tratado, validado
  CLOSED        // Encerrado
  ACCEPTED      // Aceito sem mitigação (decisão consciente)
}

// Para Risco e Problema, usar o mesmo conjunto de status
enum RiskStatus { OPEN IN_PROGRESS MITIGATED CLOSED ACCEPTED }
enum ProblemStatus { OPEN IN_PROGRESS MITIGATED CLOSED ACCEPTED }
```

### 3. Escala 5×5

Severidade e probabilidade sempre como **Int de 1 a 5**:

```prisma
model ChangeImpact {
  // ...
  severity     Int  @db.SmallInt  // 1-5
  probability  Int? @db.SmallInt  // 1-5, nullable só pra Impacto (que não tem prob)
  score        Int  @db.SmallInt  // calculado: severity * probability (Risk/Problem) ou só severity (Impact)
}
```

Mapeamento das zonas (em utility, não no schema):

| Score | Zona | Cor |
|-------|------|-----|
| 1–4 | Baixa | Verde |
| 5–9 | Moderada | Amarelo |
| 10–15 | Alta | Laranja |
| 16–25 | Crítica | Vermelho |

Função utility em `src/shared/governance/scoring.ts`:

```typescript
export type ScoreZone = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

export function calculateZone(score: number): ScoreZone {
  if (score <= 4) return 'GREEN';
  if (score <= 9) return 'YELLOW';
  if (score <= 15) return 'ORANGE';
  return 'RED';
}

export function calculateScore(severity: number, probability: number | null): number {
  if (probability === null) return severity; // Impact não tem probability
  return severity * probability;
}
```

### 4. Vínculos N:M com atividades e áreas

Entidade de governança se relaciona com **atividades do projeto** e **áreas da empresa**:

```prisma
model ImpactActivity {
  id              String      @id @default(uuid())
  impactId        String
  impact          ChangeImpact @relation(fields: [impactId], references: [id])
  
  // Referência externa: atividade vive no SMR
  smrActivityId   String      // ID no SMR Projetos
  
  // Status contextual: o status da atividade DENTRO do contexto deste impacto
  // (pode ser diferente do status global da atividade no SMR)
  contextStatus   ContextActivityStatus @default(PENDING)
  
  observation     String?     // Por que essa atividade está vinculada
  createdAt       DateTime    @default(now())
  deletedAt       DateTime?   // soft-delete da vinculação
  
  @@unique([impactId, smrActivityId])
}

enum ContextActivityStatus {
  PENDING      // Atividade vinculada mas não iniciada para mitigar este impacto
  IN_PROGRESS  // Mitigando ativamente
  BLOCKING     // Atividade está bloqueando a mitigação
  RESOLVED     // Atividade resolveu este aspecto do impacto
  IRRELEVANT   // Vinculada por engano, marcada como irrelevante
}
```

Análogo para áreas:

```prisma
model ImpactArea {
  id          String   @id @default(uuid())
  impactId    String
  impact      ChangeImpact @relation(fields: [impactId], references: [id])
  
  areaId      String   // FK para Area (vive no Collab Engine)
  
  contextStatus ContextAreaStatus @default(IDENTIFIED)
  observation String?
  createdAt   DateTime @default(now())
  deletedAt   DateTime?
  
  @@unique([impactId, areaId])
}

enum ContextAreaStatus {
  IDENTIFIED      // Área identificada como afetada
  ENGAGED         // Área está engajada na mudança
  RESISTING       // Área apresenta resistência
  ABSORBED        // Área absorveu o impacto, mudança aceita
}
```

**Padrão idêntico para Risk e Problem:** `RiskActivity`, `RiskArea`, `ProblemActivity`, `ProblemArea`.

### 5. Log temporal de acompanhamento

Toda movimentação significativa gera entrada de log:

```prisma
model ImpactAcompanhamento {
  id          String       @id @default(uuid())
  impactId    String
  impact      ChangeImpact @relation(fields: [impactId], references: [id])
  
  authorId    String       // quem registrou
  date        DateTime     @default(now())
  observation String       // texto livre
  
  // Snapshot do estado quando a entrada foi criada (auditoria)
  statusBefore ImpactStatus?
  statusAfter  ImpactStatus?
  scoreBefore  Int?
  scoreAfter   Int?
  
  @@index([impactId, date])
}
```

### 6. Soft delete com histórico

```prisma
model ChangeImpact {
  // ...
  deletedAt DateTime?
  deletedBy String?
  
  @@index([deletedAt])
}
```

Quando uma entidade é "deletada", ela é só ocultada. Toda referência (vinculações N:M, log de acompanhamento) continua existindo. Endpoint admin pode ver itens deletados.

## Reuso entre as três entidades

Crie um **diretório compartilhado** para o padrão:

```
src/modules/governance/
├── shared/
│   ├── scoring.ts           # calculateZone, calculateScore
│   ├── status-machine.ts    # transições válidas de status
│   ├── governance.types.ts  # tipos compartilhados
│   └── HeatmapMatrix.tsx    # componente de heatmap reutilizável
├── impact/                  # Impact-specific (Collab Engine)
│   ├── impact.actions.ts
│   ├── impact.schema.ts
│   └── impact.queries.ts
└── (Risk e Problem ficam no SMR, mas seguem mesmo padrão)
```

## Componente HeatmapMatrix

Recebe parâmetros e renderiza qualquer matriz 5×5:

```typescript
type HeatmapMatrixProps = {
  entityType: 'risk' | 'problem' | 'impact';
  data: Array<{ severity: number; probability: number; count: number }>;
  onClickCell?: (severity: number, probability: number) => void;
};
```

A célula colore conforme `calculateZone(severity * probability)`.

## Antes de implementar

1. Confirmar que a entidade segue **todos** os 6 componentes acima
2. Ler ADR-001 (escala 5×5) se houver dúvida sobre métricas
3. Ler ADR-003 (soft delete) para política de exclusão
4. Verificar se já existe entidade similar implementada — espelhar a estrutura

## Checklist ao implementar entidade nova

- [ ] tenantId, projectId
- [ ] title, description
- [ ] status próprio (enum dedicado)
- [ ] severity Int 1-5
- [ ] probability Int 1-5 (se aplicável)
- [ ] score calculado
- [ ] tabela de vínculos com atividades + status contextual
- [ ] tabela de vínculos com áreas + status contextual
- [ ] tabela de log de acompanhamento
- [ ] soft delete (deletedAt + deletedBy)
- [ ] índices em tenantId, projectId, status, score, deletedAt
- [ ] tests unitários para scoring e status machine
