# Issue 001 — Setup inicial do repositório Collab Engine

> **Sprint:** 1  
> **Estimativa:** 2-3 horas (sessão única)  
> **Tipo:** Setup / Infraestrutura  
> **Prioridade:** P0 (bloqueante para todas as outras)

## Objetivo

Configurar o ambiente local de desenvolvimento do Collab Engine, garantindo que `pnpm dev` suba sem erros e que todos os comandos de validação (lint, typecheck, test, build) funcionem.

## Contexto

Este é o primeiro trabalho no repo. Os arquivos de configuração e estrutura básica já estão lá (foram gerados no zip inicial). O que precisa acontecer:

1. Inicializar git e primeiro commit
2. Instalar dependências
3. Subir Postgres local via docker-compose
4. Rodar migrations Prisma
5. Validar que tudo funciona (lint, typecheck, test, build)
6. Configurar conexão com GitHub (criar repo remoto + push)

## ADRs e skills relevantes

- ADR-002 (stack unificado) — confirma que estamos no Next 16 + Prisma 7 + jose
- ADR-006 (multi-tenant) — schema já preparado
- Skill `prisma-migrations` — como rodar migrations

## Critérios de aceite

- [ ] Repo inicializado com git, primeiro commit feito ("chore: initial scaffold")
- [ ] `.env.local` criado a partir de `.env.example` com valores adequados pra dev
- [ ] Docker Postgres rodando (`docker-compose ps` mostra db como healthy)
- [ ] `pnpm install` completa sem erros
- [ ] `pnpm prisma generate` gera cliente
- [ ] `pnpm prisma migrate dev --name init` cria migration inicial
- [ ] `pnpm lint` passa sem erros
- [ ] `pnpm typecheck` passa sem erros
- [ ] `pnpm build` completa com sucesso
- [ ] `pnpm dev` sobe servidor em http://localhost:3000 sem erro
- [ ] Repo remoto no GitHub criado e push inicial feito

## Passos sugeridos

### 1. Inicializar git

```bash
cd collab-engine
git init -b main
git add .
git status  # confirmar que arquivos sensíveis não estão sendo adicionados
git commit -m "chore: initial scaffold

- Next.js 16 + React 19 + TypeScript strict
- Prisma 7 + PostgreSQL 16
- jose JWT auth (preparado para SSO compartilhado — ADR-005)
- Multi-tenant schema (ADR-006)
- Docker Compose para dev local
- GitHub Actions CI básico
- Skills, ADRs e issues estruturados para Claude Code"
```

### 2. Setup de variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local` para gerar uma JWT_SECRET de dev:

```bash
# Linux/Mac
openssl rand -base64 32
# Windows (Git Bash)
openssl rand -base64 32
```

Cole o output em `JWT_SECRET=`.

### 3. Subir Postgres

```bash
docker-compose up -d
docker-compose ps   # esperar até "healthy"
```

Se houver problema (porta 5432 ocupada por outro Postgres), edite `docker-compose.yml` e mude pra `5433:5432`, e ajuste DATABASE_URL no `.env.local`.

### 4. Instalar deps e gerar cliente Prisma

```bash
pnpm install
pnpm prisma generate
```

### 5. Rodar primeira migration

```bash
pnpm prisma migrate dev --name init
```

Isso cria a estrutura inicial do banco baseado em `prisma/schema.prisma`.

### 6. Validar

Rode tudo em sequência:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Todos devem passar. Se algum falhar, **pare e corrija antes de continuar**.

### 7. Subir o app

```bash
pnpm dev
```

Abra `http://localhost:3000`. Como ainda não há páginas, vai dar 404 — isso é esperado. O importante é que o servidor sobe sem erro no terminal.

### 8. Criar repo no GitHub

```bash
# Se você usa GitHub CLI
gh repo create collabz/collab-engine --private --source=. --remote=origin
git push -u origin main

# Se não usa CLI, crie manualmente em github.com e:
git remote add origin git@github.com:SUA_ORG/collab-engine.git
git branch -M main
git push -u origin main
```

### 9. Verificar CI

Após o push, abra a aba "Actions" no GitHub e confira que o workflow passa.

## O que NÃO fazer nesta issue

- Implementar qualquer feature (módulo M1-M16, autenticação real, telas)
- Modificar o schema Prisma além do que já está
- Adicionar dependências extras
- Configurar deploy em produção

## Quando concluir

Adicione no topo deste arquivo:

```markdown
> **Status:** Concluída em DD/MM/AAAA. Commit inicial: <hash>
```

E parta para a Issue 002.
