---
name: heatmap-component
description: "Use this skill when implementing or using the HeatmapMatrix shared component for governance entities (Risk, Problem, Impact). Defines the visual standard, the 5x5 grid layout, the color zones, click-through behavior, and aggregation queries needed to populate it. Trigger when working on dashboards, governance reports, executive summaries, or any visualization showing severity vs probability matrices."
---

# Componente HeatmapMatrix

## O que é

Componente React compartilhado que renderiza matriz 5×5 de severidade × probabilidade para qualquer entidade de governança (Risco, Problema, Impacto).

Lugar: `src/shared/components/HeatmapMatrix.tsx`.

Usado por SMR, XPROC e Collab Engine — todos importam o mesmo componente do package `@collab/shared` (futuramente; por enquanto vive no Collab Engine e é replicado quando necessário).

## Como funciona

```typescript
type HeatmapMatrixProps = {
  /** Tipo da entidade exibida */
  entityType: 'risk' | 'problem' | 'impact';
  /** Dados agregados por célula */
  data: Array<{
    severity: number;       // 1-5
    probability: number;    // 1-5
    count: number;          // quantos itens caem nessa célula
    items?: Array<{ id: string; title: string }>; // opcional, para tooltip
  }>;
  /** Callback ao clicar numa célula */
  onClickCell?: (severity: number, probability: number) => void;
  /** Mostrar números dentro das células */
  showNumbers?: boolean;
  /** Tamanho do grid */
  size?: 'sm' | 'md' | 'lg';
};
```

## Layout visual

```
Probabilidade ↑
  5 [ 5 ][10 ][15 ][20 ][25 ]
  4 [ 4 ][ 8 ][12 ][16 ][20 ]
  3 [ 3 ][ 6 ][ 9 ][12 ][15 ]
  2 [ 2 ][ 4 ][ 6 ][ 8 ][10 ]
  1 [ 1 ][ 2 ][ 3 ][ 4 ][ 5 ]
     1    2    3    4    5
              Severidade →
```

Cores:
- Verde claro (1-4): #EAF3DE / #C0DD97
- Amarelo (5-9): #FAC775
- Laranja (10-15): #EF9F27
- Vermelho (16-25): #A32D2D

(Usar tokens do design system Tailwind quando possível)

## Caso especial: Impacto sem probabilidade

Impacto no Collab Engine não tem `probability` — só `severity`. Pra esses casos:

```typescript
<HeatmapMatrix
  entityType="impact"
  data={impactsByDimension} // exemplo: severity x dimension (process, people, tech, etc.)
  // o eixo Y vira "dimensão" em vez de "probabilidade"
/>
```

A versão pra Impact pode ser uma variante que aceita o eixo Y customizado.

## Aggregation queries

Para popular o heatmap, queries do tipo:

```sql
-- Heatmap de Riscos do projeto X
SELECT
  severity,
  probability,
  COUNT(*) as count
FROM "Risk"
WHERE
  "projectId" = $1
  AND "deletedAt" IS NULL
  AND status NOT IN ('CLOSED', 'ACCEPTED')
GROUP BY severity, probability
ORDER BY severity, probability;
```

Em Prisma:

```typescript
const heatmapData = await prisma.risk.groupBy({
  by: ['severity', 'probability'],
  where: {
    projectId,
    deletedAt: null,
    status: { notIn: ['CLOSED', 'ACCEPTED'] },
  },
  _count: { id: true },
});
```

## Comportamento de click

`onClickCell(severity, probability)` deve abrir uma lista filtrada dos itens daquela célula:

```typescript
<HeatmapMatrix
  entityType="risk"
  data={data}
  onClickCell={(s, p) => {
    router.push(`/projects/${projectId}/risks?severity=${s}&probability=${p}`);
  }}
/>
```

## Antes de usar/modificar

1. O componente é **read-only** — não modifica dados, só visualiza
2. Toda lógica de cor/zona vem de `src/shared/governance/scoring.ts` (centralizado)
3. Acessibilidade: cada célula tem `aria-label` descrevendo "X riscos com severidade Y e probabilidade Z"
4. Responsivo: em mobile, vira lista vertical em vez de grid
5. Dark mode: usar tokens CSS variables, nunca hardcode de cores

## Checklist ao usar

- [ ] Dados vêm de aggregation query (não de fetch de itens individuais)
- [ ] Soft-deleted filtrado (`deletedAt: null`)
- [ ] Status closed/accepted filtrados (a menos que admin queira ver tudo)
- [ ] onClickCell leva pra lista filtrada
- [ ] Loading state enquanto query roda
- [ ] Empty state quando não há dados
