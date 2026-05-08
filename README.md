# Collab:Evolve (ex-Collab Engine)

**Plataforma de orquestração de mudança organizacional**

Produto **Collab:Evolve** da suite **Collab:Engine** da CollabZ Consultoria. Implementa o framework IPCO (Integrated Portfolio, Change & Operations) — unificando PMO, BPM e Change Management em um único sistema.

> **Nomenclatura**
> - **Collab:Engine** — a suite (umbrella): Collab:Build + Collab:Flow + Collab:Evolve
> - **Collab:Build** (ex-PMO / SMR Projetos) — gestão de projetos
> - **Collab:Flow** (ex-XPROC) — gestão de processos
> - **Collab:Evolve** (este produto, ex-Collab Engine) — gestão de mudança, treinamento, portfólio + integração entre todos

---

## O problema que resolvemos

Em projetos de transformação (implantação de SAP, Fusões e Aquisições, transformação digital), três disciplinas precisam operar simultaneamente:

- **Gestão de Projetos** — quem entrega o quê e quando
- **Gestão de Processos** — o que muda na operação
- **Gestão de Mudança** — quem precisa aprender, treinar, mudar comportamento

A maioria das organizações usa ferramentas separadas para cada disciplina. Resultado: tecnologia entregue sem mudança comportamental, processos digitalizados ruins, treinamentos pós go-live, ROI sumido.

A suite **Collab:Engine** integra os três num único motor, com dados compartilhados, fluxo orientado a eventos e governança transversal.

## Como o Collab:Evolve se posiciona

A ferramenta orquestra três sistemas dentro da suite Collab:Engine:

- **Collab:Build** (ex-SMR Projetos) — gestão de projetos
- **Collab:Flow** (ex-XPROC) — gestão de processos
- **Collab:Evolve** (este produto) — gestão de mudança, treinamento, portfólio + integração entre todos

Os módulos do Collab:Evolve seguem numeração M1–M16:

| # | Módulo | Função |
|---|--------|--------|
| M1 | Change Strategy Planner | Estratégia da mudança |
| M2 | Stakeholder Intelligence Hub | Mapeamento e gestão de partes interessadas |
| M3 | Change Impact Assessor | Mapeamento de impacto organizacional |
| M4 | Readiness Intelligence | Avaliação de prontidão |
| M5 | Learning & Capability Engine | Orquestração de treinamento |
| M6 | Communication Orchestrator | Plano e distribuição de comunicações |
| M7 | Leadership & Sponsorship Console | Patrocínio executivo + cultura organizacional |
| M8 | Resistance Navigator | Gestão de resistência |
| M9 | Change Analytics & ROI | Dashboards e métricas |
| M10 | Agile OCM Engine | OCM para ambientes ágeis |
| M11 | Change Management Office (CMO) | Portfólio organizacional |
| M12 | Reinforcement & Sustaining | Pós go-live |
| M13–M16 | Módulos avançados | Simulação, biblioteca de práticas, ROI financeiro |

## Stack

- Next.js 16 + React 19 + TypeScript
- Prisma 7 + PostgreSQL 16
- jose (JWT) + Zod 4
- Tailwind 4
- Docker para desenvolvimento local
- Pronto para deploy em qualquer cloud (Vercel, AWS, GCP)

## Como contribuir

Este projeto é desenvolvido em colaboração com **Claude Code**. O fluxo de trabalho está em `docs/HOW_TO_USE_WITH_CLAUDE_CODE.md`.

Decisões arquiteturais estão em `docs/adr/`. Issues atômicas (sessões de 30min a 2h) estão em `docs/issues/sprint-N/`.

## Setup local

Pré-requisitos: Docker, Node.js 20+, pnpm.

```bash
# Clone o repositório
git clone <url> collab-engine
cd collab-engine

# Suba o banco
docker-compose up -d

# Instale dependências
pnpm install

# Configure variáveis
cp .env.example .env.local
# Edite .env.local com as variáveis necessárias

# Rode migrations
pnpm prisma migrate dev

# Inicie o app
pnpm dev
```

Acesse `http://localhost:3000`.

## Status

Em construção. Sprint 1 ativo (glossário de integração, upgrade SMR, SSO compartilhado).

## Licença

Proprietária — CollabZ Consultoria. Não distribuir sem autorização.
