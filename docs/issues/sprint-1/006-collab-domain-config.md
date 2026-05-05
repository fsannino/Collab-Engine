# Issue 006 — Configuração de domínio e cookie do Collab Engine para SSO

> **Sprint:** 1  
> **Estimativa:** 3-4 horas  
> **Tipo:** Configuração / Infra  
> **Prioridade:** P1  
> **Repositório alvo:** Collab Engine  
> **Depende de:** Issues 001 e 002

## Objetivo

Configurar o Collab Engine para operar sob `collab.collabz.com.br` em produção e preparar variáveis e estrutura de cookie para SSO compartilhado (Issue 007).

## Contexto

O Collab Engine começou com cookie `collab_session` em domínio próprio (sem prefixo `.collabz.com.br`). Para SSO funcionar, todos os três sistemas precisam do cookie no domínio raiz.

Esta issue **não ativa SSO** — só prepara o terreno. SSO real é Issue 007.

## ADRs e skills relevantes

- ADR-005 (SSO compartilhado)
- Skill `jose-auth`

## Critérios de aceite

- [ ] `.env.production` (ou equivalente do provedor) tem:
  - `COOKIE_DOMAIN=.collabz.com.br`
  - `NEXT_PUBLIC_APP_URL=https://collab.collabz.com.br`
- [ ] DNS do subdomínio `collab.collabz.com.br` configurado (CNAME ou A record para o provedor)
- [ ] HTTPS funcionando (certificado válido, redirect HTTP→HTTPS)
- [ ] Cookie configuração suporta domain via env (já está, validar que está usando corretamente)
- [ ] Página de login acessível em `https://collab.collabz.com.br/login`
- [ ] Login + logout funcionam em produção
- [ ] Cookie aparece no browser com `Domain=.collabz.com.br` (verificar DevTools → Application → Cookies)
- [ ] Documentação de setup de produção em `docs/DEPLOYMENT.md`

## Passos

### 1. Provedor de hospedagem

Decisão: **onde o Collab Engine vai rodar em produção?**

Opções discutidas:
- **Vercel** (mais simples para Next.js, deploy via git)
- **VPS próprio** (Hetzner, DigitalOcean, AWS Lightsail) com Docker
- **Hospedagem CollabZ existente** (se XPROC e SMR já estão hospedados em algum lugar específico)

Recomendação MVP: **Vercel** ou **mesmo provedor do XPROC** (consistência).

Esta issue assume Vercel. Adaptar passos se for outro provedor.

### 2. Criar projeto no Vercel

```bash
# A partir do repo já com push no GitHub
# No painel Vercel:
# 1. Import Project → escolher repo collab-engine
# 2. Framework: Next.js (autodetectado)
# 3. Build settings: pnpm padrão
# 4. Configurar variáveis de ambiente (ver passo 3)
```

### 3. Variáveis de ambiente em produção

Configurar no painel Vercel (ou equivalente):

```
DATABASE_URL=postgresql://... (Postgres de produção, ex: Neon, Supabase, Railway)
DIRECT_URL=postgresql://... (mesma URL ou direta sem pooler)
JWT_SECRET=<gerada via openssl rand -base64 32, mesma do XPROC quando Issue 007 ativar>
COOKIE_DOMAIN=.collabz.com.br
COOKIE_NAME=collab_session
EMAIL_FROM=Collab Engine <noreply@collabz.com.br>
RESEND_API_KEY=<chave Resend>
NEXT_PUBLIC_APP_URL=https://collab.collabz.com.br
NODE_ENV=production
```

**Importante:** `JWT_SECRET` em produção **NUNCA** deve ser commitada. Use vault corporativo (1Password, Bitwarden, AWS Secrets Manager).

### 4. DNS

No painel de DNS do `collabz.com.br`:

```
CNAME  collab  cname.vercel-dns.com.   (ou IP/equivalente)
```

Aguardar propagação (até 1h, geralmente <10min).

### 5. SSL

Vercel emite cert automaticamente após DNS estar OK. Confirmar:

```bash
curl -I https://collab.collabz.com.br
# deve retornar 200 ou 307 redirect, com SSL válido
```

### 6. Validar cookie

Após login em produção:

1. DevTools → Application → Cookies → `https://collab.collabz.com.br`
2. Procurar cookie `collab_session`
3. Confirmar:
   - `Domain` = `.collabz.com.br` (com ponto)
   - `HttpOnly` = ✓
   - `Secure` = ✓
   - `SameSite` = `Lax`

Se `Domain` não aparecer com ponto, há bug na configuração — corrigir.

### 7. Migrações de banco de produção

Primeira vez subindo o app em prod:

```bash
# A partir do build local com DATABASE_URL apontando pra prod
DATABASE_URL=<prod-url> DIRECT_URL=<prod-url> pnpm prisma migrate deploy
```

Em deploys subsequentes, Vercel pode rodar via build hook ou GitHub Action — configurar separadamente.

### 8. Seed de admin em produção

Criar usuário admin inicial:

```bash
# Não rodar prisma seed em prod (pode ter dados de dev)
# Em vez disso, usar script dedicado ou inserir manualmente:
DATABASE_URL=<prod-url> tsx scripts/create-admin.ts
```

Script `scripts/create-admin.ts` pede email/senha via prompt, cria com hash bcrypt, sai.

### 9. Documentação

Criar `docs/DEPLOYMENT.md` com:

- Provedor escolhido e por quê
- Lista de variáveis de ambiente necessárias
- Como configurar DNS
- Como rodar migrations em prod
- Como criar admin inicial
- Troubleshooting comum

### 10. Health check

Endpoint público `/api/health` que retorna:

```json
{ "status": "ok", "version": "0.1.0", "db": "connected" }
```

Útil para monitoring e debugging.

## O que NÃO fazer

- Ativar SSO ainda (Issue 007)
- Mudar nome do cookie pra `collabz_session` ainda (Issue 007)
- Compartilhar JWT_SECRET com XPROC ainda (Issue 007)
- Configurar SMR/XPROC para apontar pra Collab Engine

## Validação

```bash
# Em produção
curl https://collab.collabz.com.br/api/health
# deve retornar 200 com status ok

# Login na UI
# Cookie deve aparecer com Domain=.collabz.com.br
```

## Quando concluir

- App rodando em produção com domínio `collab.collabz.com.br`
- HTTPS válido
- Cookie com domain `.collabz.com.br`
- Doc de deployment escrito
- Status atualizado neste arquivo
