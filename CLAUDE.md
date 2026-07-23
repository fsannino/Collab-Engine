# Collab Engine — Contexto para Claude Code

> Este arquivo é lido automaticamente pelo Claude Code no início de cada sessão.
> Mantenha-o atualizado quando decisões arquiteturais mudarem.

## O que é o Collab Engine

Plataforma de orquestração de mudança organizacional da **CollabZ Consultoria**. Implementa o framework **IPCO** (Integrated Portfolio, Change & Operations), unificando cinco camadas em um único sistema:

1. **Portfólio Estratégico** (decidir o que mudar)
2. **Gestão de Projetos** (executar a mudança) — integra com SMR Projetos
3. **Gestão de Processos** (definir o que muda) — integra com XPROC
4. **Mapeamento e Governança** (estruturar a mudança)
5. **Mudança e Treinamento** (garantir adoção)

O Collab Engine entrega 16 módulos numerados (M1–M16). O MVP atual cobre M2 (Stakeholder), M3 (Impacto), M5 (Treinamento) e M11 (CMO básico).

## Ecossistema (estratégia atualizada em 2026-07)

> **Decisão estratégica:** a visão original de "3 sistemas + bridge" foi substituída pela
> **collab-platform** (repo `fsannino/collab-platform`) — plataforma unificada de
> Projetos + Processos + Mudança + Treinamento em Next 16 + Prisma 7 (Clean Architecture).
> As integrações REST com SMR/XPROC estão **obsoletas** — não implementar endpoints nos legados.

Estado real dos sistemas:

| Sistema | Papel no IPCO | Stack real | Status |
|---------|---------------|------------|--------|
| **SMR Projetos** (repo PMO) | Gestão de Projetos | Next.js 14, Prisma, NextAuth — sem API v1/x-api-key | Em produção (legado) |
| **XPROC** | Gestão de Processos | ASP clássico + SQL Server — sem API REST | Em produção (legado) |
| **Collab Engine** | Mudança + Treinamento + Portfólio | Next 16, React 19, Prisma 7, jose | MVP entregue (Sprints 1–5) |
| **collab-platform** | Plataforma unificada (futuro) | Next 16, Prisma 7, Clean Architecture | Construindo |

O código de integração (`src/integration/bridge`, `smr`, `xproc`) é **best-effort/dormante**:
funciona sem as APIs externas (mostra `null`/vazio) e o catálogo local de Processos
(`Processo`/`Macroprocesso` com `xprocProcessoId` opcional) é a fonte de verdade.

## Stack tecnológico (decisões fechadas)

- **Next.js 16** + React 19 + TypeScript strict
- **Prisma 7** com `@prisma/adapter-pg` (sem query engine binary)
- **PostgreSQL 16** (via Supabase ou self-hosted)
- **jose** para JWT (não NextAuth — alinhado com XPROC)
- **Zod 4** para validação end-to-end
- **Tailwind 4** para estilo
- **Resend** para e-mail
- **Vitest** para testes
- **Docker** para desenvolvimento local + deploy

Razão de cada decisão está em `docs/adr/`. Antes de propor mudança no stack, leia os ADRs.

## Arquitetura

```
collab-engine/
├── CLAUDE.md                       # Este arquivo
├── README.md                       # Overview do produto
├── docker-compose.yml              # Postgres + app local
├── Dockerfile                      # Imagem do app
├── .claude/
│   └── skills/                     # Convenções persistentes
├── docs/
│   ├── adr/                        # Decisões arquiteturais
│   ├── issues/                     # Issues atômicas por sprint
│   ├── HOW_TO_USE_WITH_CLAUDE_CODE.md
│   ├── INTEGRATION_GLOSSARY.md     # Tradução SMR ↔ XPROC ↔ Collab
│   └── INSTALL_CLAUDE_CODE.md
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/                        # Next.js App Router
│   ├── modules/                    # M1–M16 do Collab Engine
│   │   ├── stakeholder/            # M2
│   │   ├── impact/                 # M3
│   │   ├── training/               # M5
│   │   ├── leadership/             # M7
│   │   └── governance/             # padrão Risco/Problema/Impacto
│   ├── integration/
│   │   ├── bridge/                 # eventos cross-sistema
│   │   ├── smr/                    # cliente API SMR
│   │   └── xproc/                  # cliente API XPROC
│   ├── shared/                     # tipos, utils, componentes UI
│   └── core/                       # auth (jose), prisma, eventos
└── package.json
```

## Convenções de código

- **Server Actions** para mutações (não API routes Next.js, exceto integrações externas que precisem de REST público)
- **Zod schemas** em `src/lib/definitions.ts` — validação no servidor antes de qualquer mutação
- **Prisma** com `$transaction` quando há mudança coordenada de múltiplas tabelas
- **Soft delete** em todas as entidades de governança (Risco, Problema, Impacto, etc.) — usar campo `deletedAt`
- **Audit log** em entidades de governança — campo `historico` JSON ou tabela `Acompanhamento*`
- **Idiomas:** schema em inglês (Prisma), UI em português, comentários em português

## Padrão de governança transversal (importante)

Risco, Problema e Impacto seguem o **mesmo padrão estrutural**:

- Estado próprio (aberto, em andamento, mitigado, fechado, aceito)
- Vínculos N:M com atividades do projeto e áreas da empresa
- Status contextual nas vinculações (não só status global)
- Log temporal de acompanhamento (`Acompanhamento*`)
- Escala de severidade/probabilidade **5×5** (1 a 5)
- Score = probabilidade × severidade (1–25)
- Zonas: verde (1–4), amarelo (5–9), laranja (10–15), vermelho (16–25)

**Risco** vive no SMR. **Problema** vive no SMR (entidade nova). **Impacto** vive no Collab Engine. O Bridge agrega para visões cruzadas.

Leia `.claude/skills/governance-pattern/SKILL.md` antes de implementar qualquer entidade desse padrão.

## Integração com SMR e XPROC (obsoleta — ver Ecossistema)

Os clientes REST (`src/integration/smr`, `src/integration/xproc`) e o bridge dashboard
esperavam APIs v1 com `x-api-key` que **nunca existiram nos legados**. Com a decisão
pela collab-platform, esses endpoints não serão construídos. O código permanece
best-effort (degrada para `null`/vazio sem env vars `SMR_API_URL`/`XPROC_API_URL`) —
não remover, não expandir.

Leia `docs/INTEGRATION_GLOSSARY.md` se precisar traduzir termos históricos — "Tarefa" (SMR) vs "Atividade" (XPROC) vs "Action" (Collab).

## Roadmap em sprints

- **Sprint 1** — Glossário, upgrade SMR para Next 16, SSO compartilhado
- **Sprint 2** — Migração escala 5×5 no XPROC, schema base do Collab Engine
- **Sprint 3** — M2 (Stakeholder) + M3 (Impact) + padrão de governança
- **Sprint 4** — M5 (Treinamento) + integração com SMR
- **Sprint 5** — Cultura (OCAI) + Leadership Console + dashboards cruzados

Cada issue do sprint atual está em `docs/issues/sprint-N/`. Pegue uma issue, resolva, abra PR, próxima.

## Como começar uma sessão de trabalho

1. Leia este CLAUDE.md (você já está fazendo)
2. Veja qual sprint está ativo (em `docs/issues/`)
3. Pegue a primeira issue não-fechada do sprint
4. Leia a issue completa antes de tocar em código
5. Confira ADRs citados pela issue
6. Confira skills citadas pela issue
7. Execute em pequenos commits, valide com testes, abra PR
8. Atualize a issue como concluída

## Princípios não-negociáveis

- **IA é copiloto, não piloto automático.** Decisões finais são humanas. Sugira, alerte, mas não execute mudanças críticas sem confirmação explícita.
- **Não criar stack paralelo.** Reusar Next.js 16 + Prisma 7 + jose + Postgres do XPROC. Se sentir vontade de propor NestJS, FastAPI, Auth0, Redis/Bull — pare e leia ADR-002.
- **Não construir LMS próprio.** O M5 (Treinamento) é orquestração: cria trilhas, controla matriz função × treinamento, aciona LMS externo via webhook. Não armazena conteúdo.
- **Soft delete sempre.** Auditoria e LGPD exigem preservar histórico.
- **Multi-tenant desde o início.** Todo modelo principal tem `tenantId`. Mesmo que MVP rode single-tenant CollabZ, schema já está pronto pra SaaS.

## Glossário rápido

- **OCM** — Organizational Change Management (Gestão de Mudança Organizacional)
- **PMO** — Project Management Office
- **BPM** — Business Process Management
- **IPCO** — Integrated Portfolio, Change & Operations (framework conceitual da CollabZ)
- **ADKAR** — metodologia OCM (Awareness, Desire, Knowledge, Ability, Reinforcement)
- **OCAI** — Organizational Culture Assessment Instrument (Cameron & Quinn)
- **CMO** — Change Management Office (M11)
- **Bridge** — sub-domínio de integração SMR↔XPROC↔Collab dentro do Collab Engine

## Status atual do repo (2026-07)

Sprints 1–5 com **código 100% entregue** (produto rebatizado **Collab:Evolve**):
Stakeholder (M2), Impacto (M3), Treinamento (M5), Cultura OCAI, Leadership Console (M7),
bridge dashboard, relatório PDF, LMS integration, Readiness Dashboard, Context Engine.

Pendências (não-código):
- Env vars de produção: `ANTHROPIC_API_KEY` (análise IA), `RESEND_API_KEY` (convites)
- Tutorial de uso em PT (Sprint 4) e guia do sponsor (Sprint 5)
- Piloto CollabZ com fluxo completo (treinamento + OCAI) → declarar MVP pronto
