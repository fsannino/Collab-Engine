# Backlog — Engine CollabZ

> Itens identificados no PRD v3 (2026-05-08) que ficam fora do escopo da sprint atual.
> Revisar a cada ciclo de planejamento.

---

## Arquitetura / Infra

| Item | Motivo do adiamento | Pré-requisito |
|------|---------------------|---------------|
| Turborepo monorepo (apps/ + packages/) | Requer mover 3 repos, setup CI/CD completo, alinhamento com SMR e XPROC | Validação comercial do produto |
| Supabase Auth (substituir jose JWT) | Quebra o SSO compartilhado com XPROC/SMR; risco alto sem benefício imediato | Sprint de migração dedicada + alinhamento XPROC |
| RLS Postgres por tenant (Supabase nativo) | Depende de migrar para Supabase Auth | Supabase Auth pronto |
| Redis / Upstash para cache de KPIs | Necessário quando materialized views não forem suficientes; <20 tenants não precisa | ≥50 tenants ativos |
| Materialized views no Postgres para dashboards | Viável no Supabase; priorizar quando queries de dashboard demorarem >300ms | Profiling de produção |
| Inngest (substituir cron routes) | Fila robusta com retry; atual cron via Vercel é suficiente para MVP | ≥100 jobs/dia |
| OpenTelemetry + Axiom (tracing distribuído) | Observabilidade avançada; Sentry + Vercel logs cobrem MVP | Produto em produção estável |
| PostHog feature flags | Necessário para rollout progressivo com múltiplos tenants | ≥5 tenants ativos |

---

## Billing e Comercialização

| Item | Motivo do adiamento | Pré-requisito |
|------|---------------------|---------------|
| Stripe billing (seats + add-ons) | Comercialização ainda consultoria-led; sem self-service | Decisão de modelo comercial SaaS direto |
| Pagar.me / Mercado Pago (BRL) | Depende de Stripe estar rodando primeiro | Stripe integrado |
| Tiers Free/Starter/Pro/Business/Enterprise | Requer lógica de feature flag por tier em toda UI | Billing integrado |
| Add-on AI Boost (3 níveis de cota) | Depende de billing + `platform.ai_usage_log` com billing | Stripe integrado |
| Engine Admin Console (CollabZ ops) | Painel interno para gerenciar tenants; planilha resolve no MVP | ≥10 tenants |
| Tenant Admin Console completo | Billing, módulos, branding por tenant | Billing integrado |

---

## Auth / Identidade Enterprise

| Item | Motivo do adiamento | Pré-requisito |
|------|---------------------|---------------|
| SAML 2.0 (Okta, Azure AD) | Tier Enterprise; sem cliente Enterprise confirmado | Contrato Enterprise |
| SCIM 2.0 (provisioning automático AD) | Idem SAML | SAML pronto |
| MFA obrigatório por política de tenant | Importante; jose atual suporta via segunda camada; priorizar antes de Enterprise | Auth refatorada |
| Suporte a magic link (sem senha) | Supabase Auth traz isso; pendente de migração | Supabase Auth |
| White-label completo (custom domain + branding) | Futuro; revendedores | Validação de mercado |

---

## Internacionalização

| Item | Motivo do adiamento | Pré-requisito |
|------|---------------------|---------------|
| `next-intl` (infraestrutura i18n) | Esforço de 2-3 semanas + tradução de todo conteúdo | Produto estabilizado |
| ES (Espanhol LATAM) | Depende de next-intl | next-intl |
| EN (Inglês) | Depende de next-intl | next-intl |
| Templates metodológicos em multi-idioma | Depende de i18n completo | next-intl + multi-metodologia |

---

## Multi-metodologia

| Item | Motivo do adiamento | Pré-requisito |
|------|---------------------|---------------|
| Engine de templates metodológicos (platform.methodology) | 6+ semanas; "CollabZ Method" default é suficiente para MVP | Produto estável + cliente pedindo outra metodologia |
| Style A (LaMarsh-like) | Depende de engine de templates | Engine de templates |
| Style B (ADKAR states como metodologia) | Idem | Engine de templates |
| Style C (Kotter 8 passos) | Idem | Engine de templates |
| Custom methodology (tenant define fases) | Idem | Engine de templates |
| Migração entre metodologias | Idem | Engine de templates |

---

## IA avançada

| Item | Motivo do adiamento | Pré-requisito |
|------|---------------------|---------------|
| Embeddings (Voyage AI voyage-3) para deduplicação semântica de riscos | Custo de armazenar vetores; útil com >50 riscos por projeto | pgvector habilitado + volume de dados |
| Detecção automática de duplicatas com merge (risk_source) | Depende de embeddings | Embeddings implementados |
| Q&A RAG cross-projeto ("o que sabemos sobre stakeholder X?") | Infraestrutura RAG completa; chatbot | Embeddings + volume de dados |
| Detecção de tom em respostas qualitativas | Custo de IA para feature secundária | AI Boost billing |
| Knowledge base searchável (After Action Review → vector search) | Depende de volume de AARs e embeddings | ≥20 projetos concluídos |
| Business Case Summary gerado por IA (feature paga) | Depende de billing AI Boost | Billing integrado |
| Endpoint IA dedicado (Anthropic BAA Enterprise) | Tier Enterprise | Contrato Enterprise |

---

## Importação Excel

| Item | Motivo do adiamento | Pré-requisito |
|------|---------------------|---------------|
| Import do MCP_Toolkit.xlsm (exceljs streaming) | Esforço grande; clientes ativos ainda poucos | ≥3 clientes pedindo migração |
| Preview interativo de mapeamento pré-import | Depende do import básico | Import básico |
| Detecção de hierarquias com ciclos no Excel | Parte do import; adiado junto | Import básico |

---

## Módulos GM (fases futuras do PRD)

| Item | Fase PRD | Motivo do adiamento |
|------|----------|---------------------|
| Project Initiation Assessment completo | Fase 2 | Formulário guiado longo; priorizar volume de dados primeiro |
| History Assessment (questionário + riscos automáticos) | Fase 2 | Depende de Risk Log sólido |
| Culture Profile 13 dimensões (diferente de OCAI) | Fase 2 | OCAI atual cobre; 13D é expansão |
| Gap Analysis → auto-flow Change Impact | Fase 2 | Depende de Risk Log |
| Multiple Changes Data + Heatmaps | Fase 5 | Portfólio; prioridade menor que módulos de execução |
| Multiple Change Recommendations workflow | Fase 5 | Idem |
| Transition Dip Monitoring (curva esperada vs real) | Fase 6 | Dados históricos necessários |
| Communications módulo completo (A/B, tracking, multicanal) | Fase 6 | Resend atual cobre MVP; A/B e tracking são nice-to-have |
| Resistance Management por stakeholder individual | Sprint atual — parcial | Ver sprint atual |
| Change Readiness Survey de larga escala (lotes, quotas) | Fase 2 | OCAI survey atual é suficiente; larga escala é expansão |

---

## Integrações (Bridge)

| Item | Motivo do adiamento | Pré-requisito |
|------|---------------------|---------------|
| Jira/Asana/Monday sync (tasks) | Sem cliente pedindo agora | Validação de demanda |
| Google Calendar / Outlook sync (milestones) | Idem | Validação de demanda |
| Power BI / Tableau export | Bridge; baixa prioridade no MVP | Bridge v1 estável |
| SAP/Oracle/TOTVS (custos reais para ROI) | Complexidade de integração ERP alta | Módulo financeiro ROI estável |
| Slack bot / Teams bot (notificações bidirecionais) | Webhook outbound atual é suficiente | ≥5 tenants ativos usando notificações |
| WhatsApp (Twilio/Z-API) | Regulatório + custo; e-mail cobre MVP | Validação de demanda |

---

## Mobile

| Item | Motivo do adiamento | Pré-requisito |
|------|---------------------|---------------|
| React Native + Expo (Sponsor app) | MVP é PWA responsiva | Produto web estável + feedback de sponsors |
| Stakeholder app nativo | Idem | Idem |
| Practitioner app nativo | Idem | Idem |

---

## Compliance / Segurança avançada

| Item | Motivo do adiamento | Pré-requisito |
|------|---------------------|---------------|
| SOC 2 Type II | Meta ano 2 | Auditoria externa + processos internos |
| ISO 27001 | Meta ano 3 | SOC 2 primeiro |
| Bug bounty program | Pós-lançamento público | Produto em produção |
| Pentest formal | Antes de Enterprise | Contrato Enterprise |
| GDPR (clientes europeus) | Sem cliente EU confirmado | Tier Business+ com cliente EU |
| DB dump export (migração para infra do cliente) | Tier Enterprise | Contrato Enterprise |

---

*Última atualização: 2026-05-08*
*Baseado em: PRD Engine CollabZ v3*
