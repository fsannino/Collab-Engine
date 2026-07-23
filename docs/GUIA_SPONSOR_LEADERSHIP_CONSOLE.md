# Guia do Sponsor — Leadership Console

> Para sponsors e líderes de projeto. Leitura de 5 minutos.
> O Leadership Console resume a saúde da mudança em **uma tela, otimizada para
> celular** — pensada para ser aberta minutos antes de uma reunião.

**Acesso:** `/projects/[projeto]/leadership-console` (requer login).

---

## 1. O status geral (o selo no topo)

A primeira coisa da tela é um selo com uma de três leituras:

| Selo | Significado | Quando aparece |
|------|-------------|----------------|
| 🟢 **No Caminho** | Projeto dentro do esperado | Nenhum gatilho de risco ativo |
| 🟡 **Em Risco** | Atenção necessária | Ao menos 1 impacto crítico, **ou** saldo de stakeholders negativo, **ou** cobertura de treinamento abaixo de 50% |
| 🔴 **Crítico** | Ação imediata | 3+ impactos críticos **ou** saldo de stakeholders ≤ −3 |

O status não é opinião de ninguém — é calculado a partir dos dados abaixo.

## 2. Os 4 indicadores (KPIs)

Cada cartão é clicável e leva ao detalhe.

### Stakeholders (saldo)
`aliados − resistentes`. **+4** significa 4 aliados a mais que resistentes.
- Verde: saldo positivo · Vermelho: saldo negativo
- **Se está negativo:** o projeto tem mais opositores ativos que apoiadores.
  Pergunte ao time de mudança qual é o plano de engajamento para os resistentes.

### Impactos abertos
Quantos impactos organizacionais da mudança ainda não foram resolvidos.
O subtexto mostra quantos são **críticos** — score na zona vermelha
(probabilidade × severidade ≥ 16, escala 1–25).
- **Se há críticos:** eles aparecem também em "Decisões pendentes" (abaixo).

### Cobertura de treinamento
% de treinamentos concluídos sobre o total planejado.
- Verde ≥ 80% · Amarelo 50–79% · Vermelho < 50%
- **Regra prática:** não faça go-live com cobertura vermelha nas funções críticas.

### ADKAR médio
Média (0–10) da prontidão dos líderes avaliados na metodologia ADKAR
(Awareness, Desire, Knowledge, Ability, Reinforcement).
- Verde ≥ 7 · Amarelo 4–6 · Vermelho < 4 · "—" = ninguém avaliado ainda
- **Se está baixo:** a liderança intermediária não está pronta para sustentar a
  mudança — priorize alinhamento antes de cobrar adesão das equipes.

## 3. Próximas ações

Os **3 impactos de maior score** ainda ativos (score ≥ 10). É a resposta à
pergunta "onde minha atenção rende mais esta semana?". Toque em um item para ver
o detalhe e o plano de mitigação.

## 4. Decisões pendentes

Impactos em **zona vermelha** que continuam ativos. Estes não se resolvem no
nível operacional — tipicamente exigem uma decisão sua: verba, prioridade,
mensagem pública de patrocínio ou arbitragem entre áreas.

**Se esta seção tem itens, ela é sua pauta com o gerente do projeto.**

## 5. Líderes do projeto

Lista dos líderes avaliados, cada um com sua média ADKAR individual. Use para
identificar **quem precisa de apoio** — um líder vermelho em uma área muito
impactada é o principal preditor de resistência à mudança.

## 6. Leitura rápida — o que fazer em cada cenário

| O que você vê | O que fazer |
|---------------|-------------|
| 🟢 No Caminho, tudo verde | Reforce publicamente o patrocínio; nada a decidir |
| Cobertura de treinamento baixa | Cobrar cronograma de turmas antes do go-live |
| Saldo de stakeholders negativo | Pedir o mapa de stakeholders e o plano de engajamento |
| Decisões pendentes com itens | Agendar 30 min com o GP — cada item precisa de uma decisão sua |
| ADKAR baixo ou "—" | Solicitar rodada de avaliação/alinhamento com os líderes |
| 🔴 Crítico | Reunião de crise: revisar os 3 itens de "Próximas ações" e destravar as decisões pendentes |

## 7. Onde ver mais

- **Dashboard completo** do projeto: link no rodapé do console
- **Portfolio** (`/portfolio`): visão de todos os projetos do tenant
- **Relatório executivo PDF**: gerável na página do projeto, para distribuição
  ao comitê

> Os números do console são recalculados a cada acesso — o carimbo de data/hora
> no rodapé indica o momento da leitura.
