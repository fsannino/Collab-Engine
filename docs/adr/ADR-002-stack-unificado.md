# ADR-002 — Reusar Stack do XPROC (Não Construir Stack Paralelo)

**Status:** Aceito  
**Data:** 2026-05-04  
**Decisão por:** Fabiano Sannino (CollabZ)

## Contexto

O documento original `MERIDIAN_Technical_Spec_Claude_Code.md` propõe stack ambiciosa:

- Frontend: Next.js 14 + React 18 + TypeScript
- Backend: **NestJS** (Node.js 20 LTS) — separado do frontend
- IA: **Python + FastAPI** como microserviço
- DB: PostgreSQL com Prisma + pgvector
- Cache/Queue: **Redis 7 + Bull**
- Auth: **Auth0** Enterprise plan
- Cloud: AWS ECS Fargate, CloudFront, S3, SES
- IaC: Terraform
- 36 meses, 8-40 pessoas, R$ 11.6M-17.7M

Esse stack faz sentido para um SaaS B2B vendido para o mercado externo, com escala global e equipe dedicada. **Não faz sentido para o estágio atual da CollabZ**, onde:

- Equipe é pequena (você + Claude Code)
- Cliente inicial é interno (CollabZ Consultoria + clientes da consultoria)
- XPROC já está em produção com stack moderno (Next.js 16, Prisma 7, jose, Postgres)
- SMR está sendo migrado para o mesmo stack
- Construir stack paralelo significaria rodar dois backends, dois sistemas de auth, dois deploys, etc.

## Alternativas consideradas

### Alternativa A: Seguir o spec original (NestJS + FastAPI + Auth0 + Redis Bull)

**Prós:** Pronto pra escala global. Documentado.

**Contras:**
- Custo Auth0 Enterprise: USD 240+/mês desde tier inicial
- Necessita 2 backends rodando (Next.js para frontend + NestJS para API)
- Microserviço Python adiciona complexidade de deploy e auth cross-service
- Redis + Bull adicionam infraestrutura
- Tempo até MVP: estimado 6 meses com 8 pessoas
- XPROC já tem auth funcionando com `jose` — desperdício migrar

### Alternativa B: Reusar stack do XPROC (decisão escolhida)

**Prós:**
- Zero ramp-up: stack já dominado
- Auth: `jose` já funciona no XPROC, copia padrão
- Eventos: tabela Postgres + cron (XPROC já tem `vercel.json` com cron weekly)
- Tempo até MVP: estimado 2-3 meses com 1-2 devs
- Custo de infra: Postgres + Vercel/similar = baixo
- Quando crescer, refatora — não inventar problema futuro agora

**Contras:**
- IA inline (em vez de microserviço Python) — limita uso de bibliotecas Python específicas (mas Anthropic SDK em TypeScript cobre 95% dos casos)
- Sem queue dedicada (Bull) — limita throughput de jobs paralelos
- Não pronto para escala global (mas não é necessidade no MVP)

## Decisão

**Alternativa B: Reusar stack do XPROC para o Collab Engine.**

### Stack confirmado

- **Next.js 16** + React 19 + TypeScript strict (mesmo do XPROC)
- **Prisma 7** + `@prisma/adapter-pg` (mesmo do XPROC)
- **PostgreSQL 16** (mesmo do XPROC)
- **jose** para JWT, alinhado com XPROC para SSO futuro
- **Zod 4** end-to-end
- **Tailwind 4** (mesmo do XPROC)
- **Resend** para e-mail (mesmo do XPROC)
- **Vitest** para testes (mesmo do XPROC)
- **Eventos cross-sistema:** tabela `EventoIntegracao` + cron despacho (não Redis/Bull)
- **IA:** Anthropic SDK em TypeScript, dentro do mesmo backend (não FastAPI separado)

### Conceitos do MERIDIAN que mantemos

- Os 16 módulos M1-M16 (numeração e escopo conceitual)
- O "Human Change Engine™" (motor de IA com 6 capacidades) — implementado em TS, não Python
- O modelo de dados (entidades Stakeholder, ChangeImpact, TrainingPlan, etc.)
- Os 8 tipos de projeto e Project Context Engine
- Suporte a metodologias múltiplas (ADKAR, LaMarsh, HCMBOK, etc.)
- Multi-tenant via tenantId (preparado pra SaaS futuro)

### O que NÃO fazemos

- ❌ NestJS (usamos server actions + API routes do Next.js)
- ❌ Auth0 (usamos jose)
- ❌ Redis Bull (usamos cron + tabela)
- ❌ FastAPI Python (IA via Anthropic SDK em TS)
- ❌ Terraform (Vercel/Docker resolve no MVP)
- ❌ ECS Fargate, CloudFront, S3 (não necessário no MVP)

## Consequências

### Aceitas

- Quando precisarmos escalar, vamos refatorar. Aceito.
- Algumas features avançadas do MERIDIAN (M13 Dynamic Systems Simulator com Runge-Kutta) podem precisar de Python — adiamos pra Fase 3.
- Multi-region deployment não é trivial sem AWS — adiamos pra quando tivermos clientes que exijam.

### Reversibilidade

Caso a CollabZ venda o Collab Engine como SaaS para fora e a escala justifique a stack original, é possível migrar:

- NestJS pode coexistir com Next.js (mesmo código TypeScript)
- jose → Auth0: configuração de identidade externa
- Cron → Redis/Bull: refator do `EventoIntegracao` para eventos de fila
- Adicionar microserviço Python para IA pesada

A migração é incremental, não big-bang.

## Referências

- ADR-005 — SSO compartilhado entre os três sistemas
- `MERIDIAN_Technical_Spec_Claude_Code.md` (documento original, mantido como referência conceitual)
