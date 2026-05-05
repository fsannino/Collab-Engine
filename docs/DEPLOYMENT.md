# Deploy — Collab Engine

> Provedor: **Vercel** (mesmo provedor do XPROC — consistência de domínio e cookie SSO).

## Pré-requisitos

- Conta Vercel com acesso à org CollabZ
- Banco PostgreSQL 16 de produção (Supabase, Neon, Railway, ou self-hosted)
- Domínio `collabz.com.br` com acesso ao painel DNS
- Resend com domínio verificado `collabz.com.br`

---

## 1. Criar projeto no Vercel

1. Acesse [vercel.com](https://vercel.com) → **Add New Project**
2. Importe o repositório `fsannino/Collab-Engine`
3. Framework: **Next.js** (autodetectado)
4. Build command: `pnpm build` (padrão)
5. Install command: `pnpm install` (padrão)
6. Root directory: `/` (raiz do repo)

---

## 2. Variáveis de ambiente (Vercel → Settings → Environment Variables)

| Variável | Valor | Ambientes |
|----------|-------|-----------|
| `DATABASE_URL` | URL do Postgres com pooler (ex: PgBouncer do Supabase) | Production, Preview |
| `DIRECT_URL` | URL direta do Postgres (sem pooler — usada pelo Prisma Migrate) | Production, Preview |
| `JWT_SECRET` | `openssl rand -base64 32` — **mesma do XPROC quando SSO ativar** | All |
| `COOKIE_DOMAIN` | `.collabz.com.br` | Production |
| `COOKIE_DOMAIN` | *(vazio)* | Preview, Development |
| `COOKIE_NAME` | `collab_session` | All |
| `RESEND_API_KEY` | Chave do Resend | Production |
| `EMAIL_FROM` | `Collab Engine <noreply@collabz.com.br>` | Production |
| `NEXT_PUBLIC_APP_URL` | `https://collab.collabz.com.br` | Production |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Development |
| `NODE_ENV` | `production` | Production (automático no Vercel) |
| `LOG_LEVEL` | `info` | Production |

> **Segurança:** `JWT_SECRET` nunca deve ser commitada. Use o painel Vercel ou vault corporativo (1Password, Bitwarden).

---

## 3. Domínio

No painel Vercel → **Project → Settings → Domains**:

1. Adicionar domínio: `collab.collabz.com.br`
2. Vercel exibirá o registro DNS necessário (CNAME ou A)

No painel DNS do `collabz.com.br`:

```
CNAME  collab  cname.vercel-dns.com.
```

> Aguardar propagação (geralmente < 10 min). SSL é emitido automaticamente pelo Vercel via Let's Encrypt.

Verificar:

```bash
curl -I https://collab.collabz.com.br/api/health
# Esperado: HTTP/2 200
```

---

## 4. Migrations em produção

Primeira vez (ou ao subir nova migration):

```bash
# Rodar a partir da máquina local com DIRECT_URL apontando para produção
DIRECT_URL=<prod-direct-url> pnpm prisma migrate deploy
```

> `migrate deploy` aplica apenas migrations pendentes — não cria shadow database, seguro em produção.

Para automatizar via CI, adicione ao GitHub Actions (ver `.github/workflows/`).

---

## 5. Criar admin inicial em produção

```bash
DATABASE_URL=<prod-url> tsx scripts/create-admin.ts
```

O script pede email, nome e senha via prompt. Cria o tenant `collabz` se não existir.

> **Não use `pnpm prisma db seed`** em produção — o seed usa dados de dev.

---

## 6. Verificar cookie SSO

Após login em `https://collab.collabz.com.br/login`:

1. DevTools → **Application → Cookies → `https://collab.collabz.com.br`**
2. Localizar `collab_session`
3. Confirmar atributos:

| Atributo | Valor esperado |
|----------|----------------|
| `Domain` | `.collabz.com.br` (com ponto) |
| `HttpOnly` | ✓ |
| `Secure` | ✓ |
| `SameSite` | `Lax` |

Se `Domain` não tiver o ponto ou estiver ausente, verificar `COOKIE_DOMAIN` nas variáveis de ambiente do Vercel.

---

## 7. Health check

```bash
curl https://collab.collabz.com.br/api/health
```

Resposta esperada:

```json
{ "status": "ok", "version": "0.1.0", "db": "connected" }
```

Se `db` retornar `"error"`, verificar `DATABASE_URL` e conectividade do banco.

---

## 8. Deploy subsequentes

Push para `main` aciona deploy automático no Vercel. Não há ação manual necessária para código.

Para migrations novas:

```bash
# Antes do merge do PR que adiciona a migration:
DIRECT_URL=<prod-direct-url> pnpm prisma migrate deploy
```

---

## Troubleshooting

| Sintoma | Causa provável | Solução |
|---------|---------------|---------|
| `/api/health` retorna `db: "error"` | `DATABASE_URL` errada ou banco inacessível | Verificar variável no Vercel e whitelist de IP |
| Cookie sem `Domain=.collabz.com.br` | `COOKIE_DOMAIN` vazia ou errada em produção | Setar `COOKIE_DOMAIN=.collabz.com.br` no Vercel |
| Build falha com erro Prisma | `prisma generate` não rodou | Vercel roda `pnpm install` que aciona `postinstall` — verificar script `prepare` |
| Redirect loop em `/login` | `JWT_SECRET` diferente entre deploys | Verificar que a variável não mudou |
| `prisma migrate deploy` falha em prod | `DIRECT_URL` apontando para URL com pooler | Usar URL direta (sem PgBouncer) em `DIRECT_URL` |
