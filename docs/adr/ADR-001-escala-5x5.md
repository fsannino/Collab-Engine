# ADR-001 — Escala 5×5 para Severidade e Probabilidade

**Status:** Aceito  
**Data:** 2026-05-04  
**Decisão por:** Fabiano Sannino (CollabZ)

## Contexto

O ecossistema CollabZ tem três entidades de governança que precisam métricas comparáveis:

- **Risco** (SMR Projetos) — atualmente sem implementação no SMR; XPROC usa A/M/B
- **Problema** (SMR Projetos) — entidade nova, sem precedente
- **Impacto** (Collab Engine) — documento original do MERIDIAN propõe 4 níveis CRITICAL/HIGH/MEDIUM/LOW

Para que heatmaps sejam comparáveis entre sistemas e que o usuário não precise traduzir mentalmente entre escalas, precisamos padronizar.

## Alternativas consideradas

### Escala 3×3
Simples, fácil de preencher. Problema documentado por Tony Cox (2008, Risk Analysis): matrizes pequenas sofrem de "compressão de risco" — itens muito diferentes caem na mesma célula. Pode inverter ranking real em ~40% dos casos.

### Escala 4×4
Sem ponto médio neutro. Força respondente a escolher um lado, aumentando variância. Não recomendado em literatura psicométrica (Likert canônico é 5 ou 7).

### Escala 5×5
Padrão PMBOK 6/7, ISO 31010 (em ambientes regulados), NASA NPR 8000.4, ICH Q9 (farmacêutica/ANVISA). Aproveita Lei de Miller (7±2). Permite distinção semântica clara: Muito Baixo, Baixo, Médio, Alto, Muito Alto. Reversível matematicamente para 3×3 quando necessário (junta extremos).

### Escala 7×7+
Excesso cognitivo. Viés de evitar extremos. Baixa confiabilidade entre avaliadores. Apenas casos especialíssimos.

## Decisão

**Escala 5×5 padronizada para todas as três entidades de governança.**

### Detalhes

- Severidade: Int 1-5 (1=Muito Baixo, 5=Muito Alto)
- Probabilidade: Int 1-5 (idem)
- Score = severidade × probabilidade (1 a 25)
- Score para Impacto = só severidade (Impacto não tem probabilidade — já aconteceu na visão da empresa)

### Zonas de criticidade

| Score | Zona | Cor |
|-------|------|-----|
| 1–4 | Baixa | Verde |
| 5–9 | Moderada | Amarelo |
| 10–15 | Alta | Laranja |
| 16–25 | Crítica | Vermelho |

## Consequências

### Positivas
- Heatmaps comparáveis entre os três sistemas
- Conformidade com PMBOK e ISO 31010 (audit-friendly)
- Compatível com ANVISA (ICH Q9) — relevante se tivermos clientes regulados
- Resolução semântica adequada (5 níveis claros)

### Negativas
- **XPROC precisa migrar** de escala A/M/B (3 níveis) para 1-5. Custo de migração (planejado em Sprint 2).
- **Documento original do MERIDIAN tem que ser ajustado** (4 níveis → 5). Sem código em produção, custo zero.

### Migração no XPROC

Mapeamento mecânico:
- B (Baixo) → 2
- M (Médio) → 3
- A (Alto) → 4
- Valores 1 (Muito Baixo) e 5 (Muito Alto) ficam disponíveis para reclassificação manual posterior

Detalhes em issue do Sprint 2.

## Referências

- Cox, L. A. T. (2008). What's Wrong with Risk Matrices? *Risk Analysis*, 28(2), 497–512.
- PMBOK 7th Edition (PMI, 2021)
- ISO 31010:2019 — Risk assessment techniques
- ICH Q9(R1) — Quality Risk Management
