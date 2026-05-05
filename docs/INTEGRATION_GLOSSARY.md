# Glossário de Integração — SMR ↔ XPROC ↔ Collab Engine

> **Por que este documento existe:** os três sistemas usam termos diferentes para conceitos que são (ou parecem ser) o mesmo. Sem mapeamento explícito, a integração vira festival de bugs e mal-entendidos.
>
> **Quem deve ler:** qualquer pessoa (humano ou Claude Code) tocando no sub-domínio `bridge`, ou em qualquer integração entre os três sistemas.

## Princípio

Cada termo tem **dono em UM sistema**. Os outros dois espelham via referência (não duplicam dados).

## Tabela mestra de termos

| Conceito (em PT) | SMR Projetos | XPROC | Collab Engine | Dono |
|------------------|--------------|-------|---------------|------|
| Pessoa/Usuário do sistema | `User` | `Usuario` | `User` | Cada sistema tem o seu, sincronizado por webhook (ADR-005) |
| Tenant/Cliente | (não tem MVP) | (não tem MVP) | `Tenant` | Collab Engine |
| Projeto | `Projeto` | (não aplicável) | `Project` | SMR Projetos |
| Tarefa do projeto | `Tarefa` | — | — | SMR Projetos |
| Atividade no contexto OCM | `Tarefa` (referenciada) | — | (refs como `smrActivityId`) | SMR Projetos |
| Processo de negócio | (não aplicável) | `Processo` | (refs como `xprocProcessoId`) | XPROC |
| MegaProcesso/SubProcesso | — | `MegaProcesso`, `SubProcesso` | (refs) | XPROC |
| Atividade do processo | — | `Atividade` (do processo) | — | XPROC |
| Risco do projeto | (a criar) `Risk` | `Risco` | (refs) | SMR (após implementação no Sprint 2-3) |
| Problema do projeto | (a criar) `Problem` | — | (refs) | SMR |
| Impacto organizacional | — | — | `ChangeImpact` | Collab Engine |
| Stakeholder | — | — | `Stakeholder` | Collab Engine |
| Treinamento | — | — | `Training`, `TrainingPlan`, `TrainingItem` | Collab Engine |
| Função (papel executado) | — | (parcial via `Responsavel`) | `Funcao` | Collab Engine |
| Cargo (posição contratual) | — | — | `Cargo` | Collab Engine |
| Área da empresa | (parcial via `Departamento`) | — | `Area` | Collab Engine |
| Cultura organizacional | — | — | `DiagnosticoCultural` (OCAI) | Collab Engine |

## Convenções de referência cruzada

### Quando o Collab Engine referencia entidade do SMR

```typescript
model ImpactActivity {
  // ...
  smrActivityId String  // ID da Tarefa no SMR
  
  // Snapshot opcional para offline (denormalização)
  smrActivitySnapshot Json?  // { titulo, projeto, status, ... }
}
```

- ID nu como `smrActivityId` ou `smrTarefaId` (use o termo do dono)
- Snapshot opcional via JSON quando offline ou cache faz sentido
- Webhook do SMR atualiza o snapshot quando entidade-fonte muda

### Quando o Collab Engine referencia entidade do XPROC

```typescript
model FuncaoProcesso {
  // ...
  xprocProcessoId String  // ID do Processo no XPROC
}
```

Mesma regra: prefixo `xproc` deixa explícito que é referência externa.

### Quando o SMR referencia entidade do Collab Engine

(Caso futuro, ex: SMR mostra "este projeto tem 12 impactos no Collab")

```typescript
// No SMR
model ProjectMetadata {
  projectId          String
  collabImpactCount  Int    // cache, atualizado via webhook
  collabImpactsUrl   String // link para ver no Collab
}
```

## Tradução de status entre sistemas

Status às vezes são **compatíveis mas com nomes diferentes**:

### Status de projeto

| Status (PT) | SMR | XPROC | Collab |
|-------------|-----|-------|--------|
| Rascunho | — | `Rascunho` | `DRAFT` |
| Planejamento | `Em Planejamento` | — | `PLANNING` |
| Em revisão | — | `EmRevisao` | `IN_REVIEW` |
| Aprovado | — | `Aprovado` | `APPROVED` |
| Ativo/Publicado | `Em Andamento` | `Publicado` | `ACTIVE` |
| Encerrado | `Concluído` | — | `COMPLETED` |
| Arquivado | — | `Arquivado` | `ARCHIVED` |

Função utility para tradução:

```typescript
// src/integration/bridge/status-mapper.ts
export const STATUS_MAP = {
  smrToCollab: { 'Em Planejamento': 'PLANNING', 'Em Andamento': 'ACTIVE', /* ... */ },
  xprocToCollab: { 'Rascunho': 'DRAFT', 'Publicado': 'ACTIVE', /* ... */ },
  collabToSmr: { /* inverso */ },
  collabToXproc: { /* inverso */ },
};
```

### Status de risco

| Status (PT) | SMR | XPROC | Collab (não aplica diretamente, mas espelha) |
|-------------|-----|-------|----------------------------------------------|
| Aberto | (a criar) `OPEN` | `Aberto` | — |
| Em andamento | `IN_PROGRESS` | `EmAndamento` | — |
| Mitigado | `MITIGATED` | `Mitigado` | — |
| Fechado | `CLOSED` | `Fechado` | — |
| Aceito | `ACCEPTED` | `Aceito` | — |

**Nota crítica:** SMR vai ter Risco implementado de novo (entidade nova). Use os mesmos nomes de status do XPROC para reduzir tradução.

## Tradução de escala (severidade/probabilidade)

XPROC usa A/M/B atualmente. SMR e Collab Engine vão usar 1-5. ADR-001 trata da migração.

Função utility:

```typescript
// src/integration/bridge/scale-mapper.ts
export function xprocLetterToNumber(letter: 'A' | 'M' | 'B'): 2 | 3 | 4 {
  return { B: 2, M: 3, A: 4 }[letter];
}

export function numberToXprocLetter(n: 1 | 2 | 3 | 4 | 5): 'A' | 'M' | 'B' {
  if (n <= 2) return 'B';
  if (n <= 3) return 'M';
  return 'A';
}
```

Após Sprint 2 (migração XPROC), essas funções viram desnecessárias e podem ser removidas.

## Termos a NÃO usar

Para evitar confusão, alguns termos foram banidos:

- ❌ "Processo de projeto" — ambíguo. Use "Processo de negócio" (XPROC) ou "Tarefa do projeto" (SMR).
- ❌ "Tarefa de processo" — ambíguo. Use "Atividade do Processo" (XPROC) ou crie termo específico.
- ❌ "Papel" sozinho — ambíguo. Use "Função" (executa processo) ou "Cargo" (contratual).
- ❌ "Bridge" como conceito de produto — é só sub-domínio técnico interno.

## Glossário de domínio (OCM)

Termos específicos de Change Management que aparecem no Collab Engine:

- **OCM** — Organizational Change Management (Gestão de Mudança Organizacional)
- **Stakeholder** — pessoa ou grupo afetado pela mudança ou que afeta a mudança
- **Champion / Antagonist** — apoiador entusiasta / opositor ativo da mudança
- **Readiness** — prontidão para a mudança (psicológica + estrutural)
- **Resistance** — resistência à mudança
- **Adoption** — uso real e sustentado pós-implementação
- **ADKAR** — Awareness, Desire, Knowledge, Ability, Reinforcement (modelo Prosci)
- **OCAI** — Organizational Culture Assessment Instrument (Cameron & Quinn)
- **Wave** — onda de implantação (ex: Wave 1: matriz; Wave 2: filiais)
- **Go-live** — momento de virada de chave para o novo sistema/processo
- **BAU** — Business as Usual (estado pós-go-live, operação normal)
- **CMO** — Change Management Office (escritório de gestão de mudança)
- **PMO** — Project Management Office
- **BPM** — Business Process Management
- **IPCO** — Integrated Portfolio, Change & Operations (framework conceitual da CollabZ)

## Termos não-mapeados (precisam decisão futura)

> Os itens abaixo estão parcialmente definidos no glossário mas carecem de validação contra
> os schemas reais do SMR e XPROC. Para concluir a Issue 004, forneça acesso aos schemas
> (`prisma/schema.prisma` do SMR Projetos e do XPROC) e rode a validação.

| Termo | Onde aparece | Pendência |
|-------|--------------|-----------|
| Status `ON_HOLD`, `CLOSING` | `ProjectStatus` (Collab) | Sem equivalente mapeado no SMR ou XPROC — decidir se SMR vai ter ou se fica sem tradução |
| `Em Revisão` / `EmRevisao` | XPROC (glossário) | Confirmar grafia exata no schema real do XPROC |
| `Aprovado` | XPROC (glossário) | Confirmar se existe no schema real ou é apenas conceitual |
| `Concluído` | SMR (glossário) | Confirmar grafia exata no schema real do SMR (com ou sem acento) |
| `Risco` | SMR (a criar) | Entidade nova a ser implementada no SMR (Sprint 2-3) — status ainda não existem |
| `Departamento` | SMR (parcial) | Verificar se é enum ou campo livre no schema do SMR; mapear para `Area` do Collab |
| `Responsavel` | XPROC (parcial) | Verificar estrutura real — é FK para `Usuario` ou campo textual? |
| `Usuario` vs `User` | XPROC × Collab | Confirmar campos comuns para sincronização via webhook (ADR-005) |
| Escala A/M/B | XPROC | Confirmar se a migração para 1-5 (Sprint 2) já está planejada no schema do XPROC ou é só no Collab |

## Manutenção deste documento

Quando você (humano ou Claude Code) descobrir um termo confuso:

1. Verifica se já está aqui
2. Se não, adiciona no formato da tabela mestra
3. Se há ambiguidade real entre sistemas, decide quem é dono e atualiza
4. Commit com mensagem clara: `docs: glossário — adiciona [termo]`
