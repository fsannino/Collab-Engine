---
name: jose-auth
description: "Use this skill when implementing authentication or session management in the Collab Engine. Defines the jose-based JWT pattern, cookie configuration aligned with XPROC for future SSO, session structure, rate limiting via audit table, and the getSession contract. Trigger when working on login, logout, protected routes, middleware, or any auth-related code."
---

# Autenticação com `jose` no Collab Engine

## Princípio

Collab Engine usa **`jose`** para JWT (não NextAuth, não Auth0). Estrutura **alinhada com XPROC** para que, no Sprint 1, possamos unificar via SSO de domínio raiz.

## Estrutura da sessão

JWT payload mínimo:

```typescript
type SessionPayload = {
  userId: string;
  tenantId: string;
  email: string;
  role: UserRole;
  iat: number;       // issued at (auto pela jose)
  exp: number;       // expiration (auto pela jose)
};
```

`UserRole` enum:

```typescript
enum UserRole {
  ADMIN
  CHANGE_MANAGER
  PROJECT_MANAGER
  SPONSOR
  TEAM_LEAD
  EMPLOYEE
  READ_ONLY
}
```

## Implementação base

`src/core/auth/session.ts`:

```typescript
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { env } from '@/core/config/env';

const SECRET = new TextEncoder().encode(env.JWT_SECRET);
const COOKIE_NAME = 'collab_session';
const SESSION_DURATION_HOURS = 8;

export async function createSession(payload: Omit<SessionPayload, 'iat' | 'exp'>) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_HOURS}h`)
    .sign(SECRET);
  
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    domain: env.COOKIE_DOMAIN, // .collabz.com.br em produção
    maxAge: SESSION_DURATION_HOURS * 60 * 60,
    path: '/',
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
```

## Convenções importantes

### Cookie domain

- **Desenvolvimento local:** sem domain (cookie só vale pra `localhost`)
- **Produção:** `.collabz.com.br` (com ponto na frente — vale pra todos os subdomínios: `smr.collabz.com.br`, `xproc.collabz.com.br`, `collab.collabz.com.br`)

Configurado em `env.COOKIE_DOMAIN`.

### Algoritmo: HS256

Mesma escolha do XPROC. Symmetric, simples. Para SSO entre os três sistemas, **a mesma JWT_SECRET** deve estar nos três `.env` em produção.

### Duração: 8 horas

Cobre um dia de trabalho. Refresh token vem em fase posterior (não MVP).

### Nome do cookie

Cada sistema tem seu cookie inicialmente:
- SMR: `smr_session`
- XPROC: `xproc_session`
- Collab Engine: `collab_session`

Sprint 1 unifica para `collabz_session` quando SSO entrar em produção.

## Rate limiting via audit table

Não usamos Redis. Padrão herdado do XPROC: tabela de tentativas de login.

```prisma
model LoginAttempt {
  id        String   @id @default(uuid())
  email     String
  ipAddress String?
  success   Boolean
  createdAt DateTime @default(now())
  
  @@index([email, createdAt])
  @@index([ipAddress, createdAt])
}
```

Função de check:

```typescript
async function checkRateLimit(email: string): Promise<boolean> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recentFailed = await prisma.loginAttempt.count({
    where: {
      email,
      success: false,
      createdAt: { gte: fiveMinutesAgo },
    },
  });
  return recentFailed < 5;
}
```

5 tentativas falhas em 5 minutos → bloqueia. Sem Redis necessário.

## Proteção de rotas

**Server Components / Pages:**

```typescript
// src/app/(protected)/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  
  // ... resto da página
}
```

**Middleware** (para rotas que precisam de check antes de qualquer coisa):

`src/middleware.ts` (na raiz de src/):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

const PUBLIC_PATHS = ['/login', '/api/auth', '/api/health'];

export async function middleware(req: NextRequest) {
  if (PUBLIC_PATHS.some(p => req.nextUrl.pathname.startsWith(p))) {
    return NextResponse.next();
  }
  
  const token = req.cookies.get('collab_session')?.value;
  if (!token) return NextResponse.redirect(new URL('/login', req.url));
  
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

**Atenção:** o arquivo precisa se chamar `middleware.ts` (não `proxy.ts` como ficou no XPROC inicialmente, que causou problemas de carregamento).

## Antes de implementar

1. Confirmar que `JWT_SECRET` está em `.env` com 32+ caracteres aleatórios
2. Confirmar que `COOKIE_DOMAIN` está em `.env` (vazio em local, `.collabz.com.br` em prod)
3. Ver se XPROC já tem implementação similar — espelhar nomenclatura (campos do JWT, nome de funções)
4. Ler ADR-005 sobre SSO se for tocar em compartilhamento de sessão

## Checklist ao implementar auth

- [ ] HS256 + jose (não outras libs)
- [ ] Cookie httpOnly + secure em prod
- [ ] Domain configurável via env
- [ ] getSession retorna null sem throw
- [ ] Middleware em `middleware.ts` (nome correto!)
- [ ] Rate limit via tabela LoginAttempt
- [ ] Logout destroi cookie
- [ ] Tests unitários para createSession, getSession, destroySession
