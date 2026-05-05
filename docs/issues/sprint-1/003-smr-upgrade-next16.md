# Issue 003 — Upgrade do SMR Projetos para Next.js 16

> **Sprint:** 1  
> **Estimativa:** 1-2 dias  
> **Tipo:** Migração / Infraestrutura  
> **Prioridade:** P1  
> **Repositório alvo:** SMR Projetos (não este!)

## ⚠️ Atenção

Esta issue **NÃO é executada no repositório do Collab Engine**. Ela é executada no **repositório do SMR Projetos** (que existe separadamente).

Esta issue está documentada aqui porque o Collab Engine **depende** do SMR estar em Next 16 para que SSO compartilhado e integrações funcionem corretamente.

Quando for trabalhar nesta issue, abra o Claude Code **dentro do repositório do SMR**, não do Collab Engine.

## Objetivo

Migrar o SMR Projetos de Next.js 14.2.18 para Next.js 16.x, alinhando com XPROC e Collab Engine.

## Contexto

O SMR Projetos atualmente usa:

- Next.js 14.2.18 (com CVE conhecido)
- React 18
- Prisma 5
- NextAuth com Credentials + JWT

Após esta migração:

- Next.js 16.x
- React 19
- Prisma 7 + adapter-pg
- NextAuth substituído por `jose` (Issue 005 trata disso)

## Pré-requisitos

- Backup completo do banco de produção SMR
- Branch separada (`feature/upgrade-next-16`)
- Ambiente de homologação para validar

## Critérios de aceite

- [ ] Branch `feature/upgrade-next-16` criada
- [ ] `package.json` atualizado: Next 16, React 19, Prisma 7, demais peers
- [ ] `pnpm install` sem erros após upgrade
- [ ] Migrações Prisma rodam sem erro
- [ ] Build local passa: `pnpm build`
- [ ] Todas as páginas testadas manualmente:
  - [ ] Login
  - [ ] Dashboard
  - [ ] Lista de projetos
  - [ ] Detalhes de projeto
  - [ ] Gantt SVG
  - [ ] Importação Excel/MS Project
  - [ ] Matriz RBAC
  - [ ] Cada um dos 6 módulos legados (CUT, GVI, GRF, TCP, TIN, PMO)
- [ ] Testes existentes passam (se houver suite)
- [ ] Deploy em homologação funcional
- [ ] Validação por usuário-chave (Fabiano ou consultor designado)
- [ ] Deploy em produção

## Passos

### 1. Backup

```bash
# Backup do banco
pg_dump -h <prod-host> -U <user> smr_projetos > backup_pre_upgrade_$(date +%Y%m%d).sql

# Tag do estado atual no Git
git tag pre-next-16-upgrade
git push origin pre-next-16-upgrade
```

### 2. Branch nova

```bash
git checkout -b feature/upgrade-next-16
```

### 3. Atualizar dependências

```json
{
  "dependencies": {
    "next": "^16.2.4",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "@prisma/client": "^7.8.0",
    "@prisma/adapter-pg": "^7.8.0"
  },
  "devDependencies": {
    "prisma": "^7.8.0",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2"
  }
}
```

```bash
pnpm install
```

### 4. Resolver breaking changes

#### Next 14 → 16

Pontos de atenção:

- **`useSearchParams` em Server Components** mudou comportamento — checar páginas que usam
- **Async cookies** — `cookies()` agora retorna Promise. Adicionar `await` em todos os usos
- **`next/headers`** — `headers()` também é Promise agora
- **Image component** — alguns props deprecated
- **Middleware** — `NextRequest`/`NextResponse` API estável, mas confirmar
- **App Router vs Pages Router** — se SMR ainda usa Pages, considerar migrar (não obrigatório nesta issue)

Rodar build em loop até resolver tudo:

```bash
pnpm build
# corrigir erros
pnpm build
# até passar
```

#### React 18 → 19

- **`useFormState`** virou `useActionState`
- **Hooks de transições** mudaram assinatura
- **Refs como prop** funcionam sem `forwardRef`
- **Server Components** mais estáveis (menos polyfills)

#### Prisma 5 → 7

- **`@prisma/adapter-pg`** agora obrigatório (já no package.json acima)
- **`prisma generate`** precisa rodar pra atualizar tipos
- **Algumas APIs** deprecated removidas

```bash
pnpm prisma generate
pnpm prisma migrate status   # confirmar que migrations estão consistentes
```

### 5. Testar localmente

Subir banco local (cópia do prod sem dados sensíveis), rodar `pnpm dev`, testar todas as páginas listadas em "Critérios de aceite".

### 6. Deploy em homologação

Push da branch, deploy em ambiente de homologação. Validar com usuário-chave.

### 7. Plano de rollback

Caso problema crítico em homologação:

```bash
git checkout main
# redeploy do main
```

Em produção, caso problema após deploy:

```bash
git revert <commit-hash-do-merge>
# ou rollback de container para imagem anterior
psql -h <prod-host> -U <user> smr_projetos < backup_pre_upgrade_YYYYMMDD.sql
```

### 8. Deploy em produção

Após validação em homologação por pelo menos 48h sem incidentes, deploy em prod **em janela de manutenção** (idealmente fim de semana ou madrugada).

## Riscos e mitigação

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Breaking change não detectado | Médio | Alto | Testes manuais extensivos em homolog |
| Performance degradada | Baixo | Médio | Monitoring + comparar antes/depois |
| Dependência de terceiro incompatível | Médio | Alto | Verificar peers no `pnpm install`, atualizar caso necessário |
| Bug em produção pós-deploy | Médio | Alto | Plano de rollback testado |

## O que NÃO fazer nesta issue

- Refatorar código além do necessário pro upgrade
- Implementar features novas
- Migrar de NextAuth para jose (isso é Issue 005)
- Mudar schema do banco (isso é outra issue)

## Quando concluir

- PR mergeado em main do SMR
- Tag `v2.0.0-next16-upgrade` no SMR
- Status atualizado neste arquivo
- Avisar Fabiano/equipe que SMR está em Next 16 (próximas issues dependem)
