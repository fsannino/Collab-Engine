# SSO Operations — Collab Engine

> Runbook para operação do SSO compartilhado entre SMR Projetos, XPROC e Collab Engine.
> Leia ADR-005 para o racional arquitetural.

## Como funciona

Os três sistemas compartilham:

| Variável | Valor em produção | Efeito |
|----------|-------------------|--------|
| `JWT_SECRET` | Mesma chave nos três | Token assinado em qualquer sistema é válido nos outros |
| `COOKIE_NAME` | `collabz_session` | Cookie idêntico nos três |
| `COOKIE_DOMAIN` | `.collabz.com.br` | Cookie visível em todos os subdomínios |

Fluxo de SSO:
1. Usuário loga em `smr.collabz.com.br`
2. SMR cria JWT e seta cookie `collabz_session` em `.collabz.com.br`
3. Usuário acessa `engine.collabz.com.br` — browser envia o mesmo cookie
4. Collab Engine verifica JWT com sua cópia da `JWT_SECRET` — válido, sem novo login

---

## Rotacionar JWT_SECRET

> Fazer em janela de manutenção — todos os usuários serão deslogados.

1. Gerar nova chave:
   ```bash
   openssl rand -base64 32
   # salvar no vault corporativo (1Password / Bitwarden)
   ```

2. Atualizar `JWT_SECRET` nas variáveis de ambiente de **todos os três sistemas** no Vercel:
   - `smr.collabz.com.br` (SMR Projetos)
   - `xproc.collabz.com.br` (XPROC)
   - `engine.collabz.com.br` (Collab Engine)

3. Forçar redeploy dos três (Vercel → Deployments → Redeploy).

4. Todos os JWTs antigos tornam-se inválidos — usuários são redirecionados para login.

5. Comunicar equipe: "Sessões encerradas, por favor refaça login."

---

## Adicionar novo sistema ao SSO

Para integrar um quarto sistema ao SSO:

1. O sistema deve usar `jose` com HS256 (não RSA, não Auth.js).
2. Configurar as mesmas três variáveis: `JWT_SECRET`, `COOKIE_NAME=collabz_session`, `COOKIE_DOMAIN=.collabz.com.br`.
3. O sistema deve ler o cookie `collabz_session` e verificar o JWT com `jwtVerify` da jose.
4. Registrar o sistema no SMR como destino de webhook de sincronização de usuários.
5. Adicionar entrada na tabela `SistemaOrigem` do `EventoIntegracao` no Collab Engine (enum no schema Prisma).

---

## Sincronização de usuários (SMR como master)

O SMR Projetos é a fonte de verdade de `User`. Sempre que um usuário é criado ou atualizado no SMR, um webhook é disparado para os outros sistemas.

### Endpoint receptor (Collab Engine)

```
POST /api/webhooks/user-sync
Header: x-webhook-signature: <hmac-sha256>
```

Payload:
```json
{
  "event": "user.created" | "user.updated" | "user.deleted",
  "userId": "<uuid — mesmo ID usado no SMR>",
  "data": {
    "email": "usuario@empresa.com",
    "name": "Nome Completo",
    "role": "ADMIN" | "CHANGE_MANAGER" | ...,
    "tenantId": "<uuid>",
    "passwordHash": "<bcrypt hash>",
    "active": true
  }
}
```

### Variáveis de ambiente necessárias

No Collab Engine:
```
WEBHOOK_SECRET=<segredo HMAC — gerado com openssl rand -base64 32>
```

No SMR (sender):
```
COLLAB_WEBHOOK_URL=https://engine.collabz.com.br/api/webhooks/user-sync
COLLAB_WEBHOOK_SECRET=<mesmo valor do WEBHOOK_SECRET acima>
```

### Verificar sync

```bash
# Ver últimos usuários sincronizados
DATABASE_URL=<prod-url> psql -c "SELECT id, email, active, \"createdAt\" FROM \"User\" ORDER BY \"createdAt\" DESC LIMIT 10;"
```

---

## Debugar problemas de cookie

### Cookie não aparece em outro sistema

1. Verificar `COOKIE_DOMAIN=.collabz.com.br` (com ponto) nas variáveis do Vercel de **todos** os sistemas.
2. Verificar que o sistema destino está em subdomínio de `.collabz.com.br` (não em domínio diferente).
3. DevTools → Application → Cookies → conferir `Domain` do cookie `collabz_session`.

### Sistema rejeita token válido

1. Verificar que `JWT_SECRET` é **idêntica** nos três sistemas (sem espaço extra, sem quebra de linha).
2. No Vercel, copiar o valor exato do vault — não redigitar.
3. Testar decodificando o token:
   ```bash
   # Pegar cookie do browser e decodificar payload (sem verificar assinatura)
   echo "<token>" | cut -d. -f2 | base64 -d 2>/dev/null | jq .
   ```

### Logout não funciona nos três

O logout destrói o cookie `collabz_session`. Como o cookie tem `Domain=.collabz.com.br`, a destruição vale para todos os subdomínios automaticamente — não é necessário chamar logout nos outros sistemas.

Se o cookie persistir após logout, verificar se o sistema de logout está setando `Domain` corretamente na chamada de deleção do cookie.

---

## Auditar acessos cross-system

Cada sistema registra tentativas de login na tabela `LoginAttempt`. Para visão consolidada, consultar cada banco individualmente ou usar a tabela `EventoIntegracao` do Collab Engine (eventos de `user.*`).

```bash
# No Collab Engine — ver eventos de sync recentes
DATABASE_URL=<prod-url> psql -c \
  "SELECT tipo, status, \"createdAt\" FROM \"EventoIntegracao\" WHERE tipo LIKE 'user.%' ORDER BY \"createdAt\" DESC LIMIT 20;"
```

---

## Checklist de ativação do SSO (Issue 007)

Execute na ordem, em janela de manutenção:

- [ ] `JWT_SECRET` gerada e armazenada no vault
- [ ] `JWT_SECRET` atualizada no Vercel dos três sistemas
- [ ] `COOKIE_NAME=collabz_session` nos três
- [ ] `COOKIE_DOMAIN=.collabz.com.br` nos três
- [ ] `WEBHOOK_SECRET` gerado e configurado (Collab Engine + SMR)
- [ ] `COLLAB_WEBHOOK_URL` configurado no SMR
- [ ] Redeploy dos três sistemas
- [ ] Script de sincronização inicial de users rodado (`tsx scripts/initial-user-sync.ts` no SMR)
- [ ] Teste E2E: login SMR → acesso XPROC sem login → acesso Collab sem login
- [ ] Teste de logout: logout em qualquer sistema → os três pedem login
