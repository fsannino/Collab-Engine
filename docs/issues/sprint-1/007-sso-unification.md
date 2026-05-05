# Issue 007 — Unificação SSO entre SMR, XPROC e Collab Engine

> **Sprint:** 1  
> **Estimativa:** 1-2 dias  
> **Tipo:** Feature / Integração  
> **Prioridade:** P0 (final do Sprint 1)  
> **Repositórios alvo:** SMR Projetos + XPROC + Collab Engine  
> **Depende de:** Issues 003, 005, 006

## Objetivo

Unificar autenticação entre os três sistemas, permitindo Single Sign-On: usuário loga em qualquer um, está logado nos três.

## ⚠️ Atenção

Esta é a issue mais delicada do Sprint 1. Ela toca **três repositórios** em coordenação. Faça em janela de manutenção, com plano de rollback testado.

## Contexto

Após as issues anteriores, temos:

- SMR Projetos: Next 16, jose, cookie `smr_session`
- XPROC: Next 16, jose, cookie `xproc_session`
- Collab Engine: Next 16, jose, cookie `collab_session`

Todos com mesma estrutura, mas cada um com cookie próprio em domínio próprio. Esta issue:

1. Renomeia cookie unificado em todos: `collabz_session`
2. Configura domain `.collabz.com.br` em todos
3. Sincroniza `JWT_SECRET` (mesma chave nos três)
4. Implementa webhook de sync de User entre os três
5. Resultado: SSO funcional

## ADRs e skills relevantes

- ADR-005 (SSO compartilhado) — leitura obrigatória
- Skill `jose-auth`

## Critérios de aceite

- [ ] `JWT_SECRET` única gerada e armazenada em vault
- [ ] Vault distribuído nas variáveis de ambiente dos três sistemas
- [ ] Cookie unificado `collabz_session` configurado nos três sistemas
- [ ] Cookie domain `.collabz.com.br` em produção nos três
- [ ] Login no SMR → cookie aparece em `.collabz.com.br`
- [ ] Acesso ao XPROC após login no SMR → não pede login
- [ ] Acesso ao Collab Engine após login no SMR → não pede login
- [ ] Logout em qualquer um destrói cookie nos três
- [ ] Tabela User dos três sistemas sincronizada (mesmo userId, email, role)
- [ ] Webhook de criação/atualização de User funcional
- [ ] Documentação `docs/SSO_OPERATIONS.md` criada
- [ ] Plano de comunicação aos usuários (logout forçado)
- [ ] Deploy coordenado nos três
- [ ] Validação E2E em produção

## Pré-trabalho

### 1. Decidir master de User

Decisão: **qual sistema é fonte de verdade dos User records?**

Recomendação: **SMR Projetos** (sistema mais antigo, com mais usuários).

Implicação:
- User criado no SMR replica para XPROC e Collab Engine
- User editado no SMR replica
- Tentativa de criar User em XPROC ou Collab é proibida — UI direciona para SMR
- Senha alterada no SMR replica para os outros (com hash; nunca em plain)

### 2. Mapear users existentes

```sql
-- No SMR
SELECT id, email FROM "User";

-- No XPROC
SELECT id, email FROM "Usuario";
```

Email é a chave de match. Se houver users no XPROC sem correspondência no SMR (criados localmente), decidir caso a caso (importar para SMR ou desativar).

### 3. Gerar JWT_SECRET

```bash
openssl rand -base64 32 > /tmp/secret.txt
# salvar em vault corporativo
# DELETAR /tmp/secret.txt depois
```

## Passos de implementação

### A. No Collab Engine

1. **Atualizar env de produção:**

```
JWT_SECRET=<vault>
COOKIE_NAME=collabz_session
COOKIE_DOMAIN=.collabz.com.br
```

2. **Implementar webhook receiver** para sync de User:

```typescript
// src/app/api/webhooks/user-sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/core/prisma/client';
import { env } from '@/core/config/env';

const webhookSchema = z.object({
  event: z.enum(['user.created', 'user.updated', 'user.deleted']),
  userId: z.string().uuid(),
  data: z.object({
    email: z.string().email(),
    name: z.string(),
    role: z.string(),
    tenantId: z.string().uuid(),
    passwordHash: z.string().optional(),
    active: z.boolean(),
  }),
});

export async function POST(req: NextRequest) {
  // Validação de assinatura HMAC
  const signature = req.headers.get('x-webhook-signature');
  const body = await req.text();
  const expectedSig = await computeHmac(body, env.WEBHOOK_SECRET);
  
  if (signature !== expectedSig) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  const parsed = webhookSchema.parse(JSON.parse(body));
  
  // Aplicar mudança
  if (parsed.event === 'user.created') {
    await prisma.user.upsert({
      where: { id: parsed.userId },
      create: { id: parsed.userId, ...parsed.data },
      update: parsed.data,
    });
  }
  // ... outros eventos
  
  return NextResponse.json({ ok: true });
}
```

3. **Deploy** do Collab Engine com novas configs.

### B. No XPROC

1. **Atualizar env de produção:** mesma JWT_SECRET, mesmo cookie name, mesmo domain.

2. **Atualizar createSession e middleware** para usar `collabz_session` em vez de `xproc_session`.

3. **Implementar webhook receiver** análogo ao do Collab Engine.

4. **Deploy** do XPROC com novas configs.

### C. No SMR (master)

1. **Atualizar env de produção:** mesma JWT_SECRET, mesmo cookie name, mesmo domain.

2. **Atualizar createSession e middleware** para usar `collabz_session`.

3. **Implementar webhook sender:** sempre que User é criado/atualizado, dispara webhook para XPROC e Collab Engine:

```typescript
// src/lib/user-sync.ts
import crypto from 'crypto';

const TARGETS = [
  { url: process.env.XPROC_WEBHOOK_URL!, secret: process.env.XPROC_WEBHOOK_SECRET! },
  { url: process.env.COLLAB_WEBHOOK_URL!, secret: process.env.COLLAB_WEBHOOK_SECRET! },
];

export async function syncUserChange(event: string, userId: string, data: object) {
  const payload = JSON.stringify({ event, userId, data });
  
  for (const target of TARGETS) {
    const sig = crypto.createHmac('sha256', target.secret).update(payload).digest('hex');
    
    try {
      await fetch(target.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': sig },
        body: payload,
      });
    } catch (err) {
      console.error(`Failed to sync to ${target.url}:`, err);
      // Adicionar à fila de retry (EventoIntegracao)
    }
  }
}
```

4. **Deploy** do SMR com novas configs.

### D. Sincronização inicial de users

Após deploy dos três, rodar script único pra sincronizar users existentes:

```bash
# No repo do SMR
DATABASE_URL=<prod-smr> tsx scripts/initial-user-sync.ts
```

Script lê todos os Users do SMR e dispara webhooks de `user.created` para os outros dois sistemas.

## Plano de deploy

**Janela:** sábado 22h-2h (mais baixa atividade).

**Sequência:**

1. 22h00 — Anúncio de manutenção (já comunicado dias antes)
2. 22h05 — Deploy do Collab Engine com novas configs (já está em prod, só atualizar env)
3. 22h15 — Deploy do XPROC
4. 22h30 — Deploy do SMR (último porque é master)
5. 22h45 — Rodar script de sincronização inicial de users
6. 23h00 — Validação E2E:
   - Login no SMR
   - Verificar cookie `collabz_session` em `.collabz.com.br`
   - Acesso a XPROC sem login
   - Acesso a Collab Engine sem login
   - Logout em XPROC, conferir que SMR também desloga
7. 23h30 — Caso falha crítica, executar rollback (ver abaixo)
8. 00h00 — Sucesso ou rollback completos

## Plano de rollback

Caso falha:

```bash
# Em cada sistema, revert do commit de unificação
git revert <merge-commit>
# redeploy

# Restaurar env vars antigas:
COOKIE_NAME=smr_session  # ou xproc_session, ou collab_session
COOKIE_DOMAIN= (vazio em SMR/XPROC, ou seu domínio próprio anterior)

# Limpar cookies dos usuários (eles vão re-logar):
# Opcional: middleware temporário que apaga cookie collabz_session
```

## Validação E2E

Roteiro de teste, executado por humano após deploy:

1. Limpar TODOS os cookies do navegador
2. Acessar `smr.collabz.com.br`
3. Login com usuário X
4. ✅ Logado no SMR
5. Em nova aba, acessar `xproc.collabz.com.br`
6. ✅ Já logado, sem prompt
7. Em nova aba, acessar `collab.collabz.com.br`
8. ✅ Já logado, sem prompt
9. Em qualquer um, fazer logout
10. ✅ Cookie destruído
11. Acessar outro dos três
12. ✅ Pede login (cookie foi de fato destruído)

## Documentação `docs/SSO_OPERATIONS.md`

Documentar:

- Como rotacionar JWT_SECRET (procedure)
- Como adicionar novo sistema ao SSO no futuro
- Como debugar problemas de cookie
- Como auditar acessos cross-system

## O que NÃO fazer

- Implementar User Service centralizado (é fase posterior)
- Adicionar MFA agora (fase posterior, mas planejado)
- Mudar fluxo de password reset (sprint posterior)

## Quando concluir

- Validação E2E passa em produção
- Status atualizado neste arquivo
- Sprint 1 oficialmente concluído 🎉
- Avisar Fabiano para testar fluxo de SSO em primeira mão
