# Issue 005 — Migração SMR de NextAuth para `jose`

> **Sprint:** 1  
> **Estimativa:** 1-2 dias  
> **Tipo:** Migração / Auth  
> **Prioridade:** P1  
> **Repositório alvo:** SMR Projetos  
> **Depende de:** Issue 003 (SMR já em Next 16)

## ⚠️ Atenção

Esta issue é executada **no repositório do SMR Projetos**, não no Collab Engine. Documentada aqui pelo papel no SSO compartilhado.

## Objetivo

Substituir NextAuth por `jose` no SMR Projetos, alinhando estrutura de cookie e payload JWT com o XPROC e Collab Engine, **preparando para SSO compartilhado** (Issue 007).

## Contexto

NextAuth funciona, mas:

- Adiciona dependências e abstrações que não usamos
- Cookie name é `next-auth.session-token` — diferente do XPROC e Collab
- Payload JWT tem estrutura própria do NextAuth, incompatível com SSO direto
- Eventualmente queremos cookie único `collabz_session` no domínio `.collabz.com.br`

Migrar agora antes de SSO ativar.

## Critérios de aceite

- [ ] Branch `feature/auth-jose` criada no repo SMR
- [ ] Dependência `next-auth` removida de package.json
- [ ] Dependência `jose` adicionada
- [ ] Estrutura de auth do SMR espelha a do XPROC e Collab Engine:
  - Cookie name: `smr_session` (será unificado em `collabz_session` na Issue 007)
  - Payload JWT: `{ userId, tenantId, email, role, iat, exp }`
  - HS256 com mesma JWT_SECRET (configurada via env)
- [ ] Funções `createSession`, `getSession`, `destroySession` em `src/core/auth/session.ts` com mesma assinatura do Collab Engine
- [ ] Middleware em `src/middleware.ts` (renomear se estava em outro lugar)
- [ ] Login form e action atualizados para usar `jose`
- [ ] Logout funcional
- [ ] Todos os usuários existentes precisam fazer login novamente após deploy (cookies antigos não valem mais)
- [ ] Plano de comunicação com usuários: aviso prévio do logout forçado
- [ ] Tests passando
- [ ] Deploy em homologação validado
- [ ] Deploy em produção em janela de manutenção

## Passos

### 1. Pré-trabalho

- Confirmar que SMR está em Next 16 (Issue 003 concluída)
- Acessar `.env` de produção e adicionar `JWT_SECRET` (gerar nova ou reusar de plano vault corporativo)
- Comunicar usuários sobre logout forçado pós-deploy

### 2. Implementação

Espelhar exatamente a estrutura do Collab Engine (que está em `src/core/auth/` neste repo).

Ler skill `jose-auth` no Collab Engine:

```bash
cat ../collab-engine/.claude/skills/jose-auth/SKILL.md
```

Replicar:

- `src/core/auth/session.ts` — createSession, getSession, destroySession
- `src/core/auth/password.ts` — hashPassword, verifyPassword (manter bcrypt; NextAuth também usava)
- `src/core/auth/rate-limit.ts` — checkRateLimit baseado em LoginAttempt
- `src/core/config/env.ts` — Zod schema das vars

Adaptar nomes ao SMR (`smr_session` em vez de `collab_session`).

### 3. Migração de password hashes

Se NextAuth usava bcrypt, hashes existentes continuam válidos (bcrypt é universal). Confirmar.

Se NextAuth usava outro algoritmo (Argon2, etc.), precisa flow de "rehash on login":

```typescript
// Login action
const userValidByOld = await oldHashVerify(password, user.passwordHash);
if (userValidByOld) {
  const newHash = await hashPassword(password);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
  // ... continuar login
}
```

### 4. Remover NextAuth

```bash
pnpm remove next-auth
# remover NEXTAUTH_URL, NEXTAUTH_SECRET de .env
# remover [...nextauth].ts ou route handler
# atualizar todos os imports `useSession`, `signIn`, `signOut` para usar nossa session
```

### 5. Atualizar UI

Substituir hooks do NextAuth por session reading custom:

```typescript
// antes
const { data: session } = useSession();

// depois (Server Component)
import { getSession } from '@/core/auth/session';
const session = await getSession();
```

### 6. Tests

Espelhar testes do Collab Engine: createSession, getSession, destroySession, rate limiting.

### 7. Deploy

Janela de manutenção. Comunicar usuários antes. Após deploy, testar login imediatamente.

### 8. Plano de rollback

Branch `pre-jose-migration` taggeada. Se problema crítico:

```bash
git revert <merge-commit>
# usuários precisam logar de novo (porque cookies mudaram), mas voltam ao NextAuth funcional
```

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Cookie de NextAuth não invalidado, usuários ficam em estado inconsistente | Limpar cookies de NextAuth no middleware nas primeiras X horas pós-deploy |
| Senhas com hash incompatível | Flow de rehash on login (ver passo 3) |
| Dependência interna usando NextAuth | Grep antes de remover: `grep -r "next-auth" src/` |

## O que NÃO fazer

- Implementar SSO ainda (Issue 007)
- Mudar domain do cookie ainda (Issue 007)
- Adicionar features além da migração

## Quando concluir

- Deploy em produção bem-sucedido
- Validação de login/logout em prod
- Todos os usuários migrados (logaram pelo menos uma vez)
- Status atualizado neste arquivo
