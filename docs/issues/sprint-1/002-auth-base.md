# Issue 002 — Autenticação base (jose JWT + login + logout)

> **Sprint:** 1  
> **Estimativa:** 4-6 horas  
> **Tipo:** Feature / Core  
> **Prioridade:** P0  
> **Depende de:** Issue 001

## Objetivo

Implementar autenticação base do Collab Engine usando `jose` (JWT), **estruturada de forma alinhada com XPROC** para que SSO compartilhado (Issue 007) seja trivial depois.

## Contexto

Collab Engine não usa NextAuth nem Auth0 — usa `jose` direto. A skill `jose-auth` tem o padrão completo. O XPROC já tem implementação similar funcionando, então a estrutura aqui deve **espelhar a do XPROC** para facilitar unificação no Sprint 1, Issue 007.

## ADRs e skills relevantes

- ADR-002 (stack unificado) — sem Auth0, sem NextAuth
- ADR-005 (SSO compartilhado) — destino final
- Skill `jose-auth` — implementação detalhada
- Skill `zod-validation` — validação de inputs do form

## Critérios de aceite

- [ ] Função `createSession(payload)` em `src/core/auth/session.ts`
- [ ] Função `getSession()` retorna SessionPayload | null
- [ ] Função `destroySession()` apaga cookie
- [ ] Cookie configurado conforme skill (httpOnly, secure em prod, domain configurável)
- [ ] Página `/login` em `src/app/login/page.tsx` com form básico (email, senha)
- [ ] Server Action `loginAction` valida credenciais com bcrypt e cria sessão
- [ ] Server Action `logoutAction` destrói sessão
- [ ] Rate limiting via tabela `LoginAttempt` (5 tentativas falhas em 5 min bloqueiam)
- [ ] Middleware em `src/middleware.ts` (nome correto!) protege rotas
- [ ] Página `/dashboard` (placeholder) redireciona pra `/login` se não autenticado
- [ ] Seed cria usuário admin de dev
- [ ] Testes unitários para `createSession`, `getSession`, `destroySession`, `checkRateLimit`

## Estrutura de arquivos a criar

```
src/
├── core/
│   ├── auth/
│   │   ├── session.ts          # createSession, getSession, destroySession
│   │   ├── password.ts         # hashPassword, verifyPassword (bcrypt)
│   │   └── rate-limit.ts       # checkRateLimit baseado em LoginAttempt
│   ├── config/
│   │   └── env.ts              # validação Zod das variáveis de ambiente
│   └── prisma/
│       └── client.ts           # singleton do PrismaClient
├── lib/
│   └── definitions.ts          # schemas Zod globais (LoginSchema, etc.)
├── actions/
│   └── auth.ts                 # loginAction, logoutAction
├── app/
│   ├── (public)/
│   │   └── login/
│   │       ├── page.tsx
│   │       └── login-form.tsx  # client component
│   └── (protected)/
│       └── dashboard/
│           └── page.tsx        # placeholder
├── middleware.ts               # NA RAIZ DE src/, não em outro lugar
└── __tests__/
    └── auth/
        ├── session.test.ts
        └── rate-limit.test.ts
```

## Implementação

### `src/core/config/env.ts`

```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter ao menos 32 caracteres'),
  COOKIE_DOMAIN: z.string().default(''),
  COOKIE_NAME: z.string().default('collab_session'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Collab Engine <noreply@example.com>'),
  ANTHROPIC_API_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export const env = envSchema.parse(process.env);
```

### `src/core/auth/session.ts`

Seguir exatamente o padrão da skill `jose-auth`. SessionPayload:

```typescript
export type SessionPayload = {
  userId: string;
  tenantId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
};
```

### `src/core/auth/password.ts`

```typescript
import bcrypt from 'bcryptjs';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

### `src/core/auth/rate-limit.ts`

Implementação conforme skill `jose-auth`. 5 tentativas falhas em 5 minutos bloqueiam.

### `src/lib/definitions.ts`

```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

### `src/actions/auth.ts`

```typescript
'use server';

import { redirect } from 'next/navigation';
import { loginSchema } from '@/lib/definitions';
import { prisma } from '@/core/prisma/client';
import { verifyPassword } from '@/core/auth/password';
import { createSession, destroySession } from '@/core/auth/session';
import { checkRateLimit, recordLoginAttempt } from '@/core/auth/rate-limit';

export async function loginAction(_prev: unknown, formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', issues: parsed.error.flatten().fieldErrors };
  }
  
  const { email, password } = parsed.data;
  
  // Rate limit
  const allowed = await checkRateLimit(email);
  if (!allowed) {
    return { ok: false, error: 'Muitas tentativas. Tente novamente em 5 minutos.' };
  }
  
  const user = await prisma.user.findFirst({
    where: { email, active: true, deletedAt: null },
  });
  
  if (!user || !user.passwordHash) {
    await recordLoginAttempt(email, false);
    return { ok: false, error: 'Credenciais inválidas' };
  }
  
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await recordLoginAttempt(email, false);
    return { ok: false, error: 'Credenciais inválidas' };
  }
  
  await recordLoginAttempt(email, true, user.id);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  
  await createSession({
    userId: user.id,
    tenantId: user.tenantId,
    email: user.email,
    role: user.role,
  });
  
  redirect('/dashboard');
}

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}
```

### `src/middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = process.env.COOKIE_NAME ?? 'collab_session';

const PUBLIC_PATHS = ['/login', '/api/auth', '/api/health', '/_next', '/favicon.ico'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### `src/app/(public)/login/page.tsx`

Página simples de login. Use shadcn/ui ou componentes próprios — preferência por simples agora.

### `prisma/seed.ts`

Cria usuário admin para desenvolvimento:

```typescript
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/core/auth/password';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'collabz' },
    update: {},
    create: {
      name: 'CollabZ Consultoria',
      slug: 'collabz',
      plan: 'INTERNAL',
    },
  });
  
  const passwordHash = await hashPassword('admin123');
  
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@collabz.com.br' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@collabz.com.br',
      name: 'Admin CollabZ',
      passwordHash,
      role: 'ADMIN',
    },
  });
  
  console.log('Seed concluído: admin@collabz.com.br / admin123');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
```

E em `package.json`:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

### Tests

`src/__tests__/auth/session.test.ts`:

- createSession + getSession round-trip
- token expirado retorna null
- token inválido retorna null
- destroySession remove cookie

`src/__tests__/auth/rate-limit.test.ts`:

- até 4 tentativas falhas: permite
- 5 tentativas falhas em 5 minutos: bloqueia
- após 5 minutos, libera novamente

## O que NÃO fazer nesta issue

- Implementar telas além de `/login` e `/dashboard` placeholder
- Implementar SSO real (isso é a Issue 007)
- Adicionar MFA, recuperação de senha, etc.
- Adicionar OAuth/social login

## Validação

```bash
pnpm prisma migrate dev --name auth_base
pnpm prisma db seed
pnpm dev
```

Acesse `http://localhost:3000/login`. Logue com `admin@collabz.com.br` / `admin123`. Deve redirecionar para `/dashboard`.

Logout via botão na dashboard deve voltar para `/login`.

Tentativa de acessar `/dashboard` sem cookie deve redirecionar para `/login`.

## Quando concluir

Status no topo, PR mergeado, próxima issue.
