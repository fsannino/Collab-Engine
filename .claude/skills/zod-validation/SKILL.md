---
name: zod-validation
description: "Use this skill when implementing input validation in the Collab Engine using Zod. Defines the schema-first pattern, separation between input schemas (forms/API) and domain types (Prisma), error handling conventions, and the integration with React Hook Form. Trigger when creating forms, server actions, API routes, or modifying any input boundary."
---

# Validação com Zod no Collab Engine

## Princípio

**Toda entrada de dado externo é validada com Zod antes de qualquer operação.** Sem exceção.

Entradas externas incluem:
- Form submissions
- Server Actions (dados vindos do cliente)
- API routes (dados vindos de webhooks ou clientes externos)
- Query params
- Variáveis de ambiente

## Estrutura de arquivos

```
src/
├── lib/
│   └── definitions.ts          # schemas globais reutilizáveis (User, Tenant, etc.)
└── modules/
    └── impact/
        └── impact.schema.ts    # schemas específicos do módulo
```

## Padrão de schema

Schemas de **input** são diferentes de tipos do **Prisma**:

```typescript
// impact.schema.ts
import { z } from 'zod';
import { ImpactStatus, ImpactDimension } from '@prisma/client';

// Schema para CRIAR um impacto (form input)
export const createImpactSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  dimension: z.nativeEnum(ImpactDimension),
  severity: z.coerce.number().int().min(1).max(5),
  currentState: z.string().min(1),
  futureState: z.string().min(1),
  affectedActivityIds: z.array(z.string().uuid()).optional().default([]),
  affectedAreaIds: z.array(z.string().uuid()).optional().default([]),
});

export type CreateImpactInput = z.infer<typeof createImpactSchema>;

// Schema para ATUALIZAR (campos opcionais)
export const updateImpactSchema = createImpactSchema.partial().extend({
  id: z.string().uuid(),
});

export type UpdateImpactInput = z.infer<typeof updateImpactSchema>;
```

## Validação em Server Action

```typescript
'use server';

import { createImpactSchema } from './impact.schema';
import { getSession } from '@/core/auth/session';

export async function createImpactAction(formData: FormData) {
  // 1. Sessão primeiro (autenticação)
  const session = await getSession();
  if (!session) {
    return { ok: false, error: 'Não autenticado' };
  }
  
  // 2. Parse + validação
  const raw = Object.fromEntries(formData);
  const parsed = createImpactSchema.safeParse(raw);
  
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Dados inválidos',
      issues: parsed.error.flatten().fieldErrors,
    };
  }
  
  // 3. Lógica de negócio com dado já validado e tipado
  const impact = await prisma.changeImpact.create({
    data: {
      ...parsed.data,
      tenantId: session.tenantId,
      score: parsed.data.severity, // calcular score
      status: 'OPEN',
    },
  });
  
  return { ok: true, data: impact };
}
```

## Padrão de retorno (Result type)

Toda action retorna estrutura uniforme:

```typescript
type ActionResult<T> = 
  | { ok: true; data: T }
  | { ok: false; error: string; issues?: Record<string, string[]> };
```

Em `src/shared/types/action-result.ts`.

## Integração com forms (React Hook Form)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createImpactSchema, type CreateImpactInput } from './impact.schema';

export function CreateImpactForm() {
  const form = useForm<CreateImpactInput>({
    resolver: zodResolver(createImpactSchema),
    defaultValues: { /* ... */ },
  });
  
  // ...
}
```

A mesma `createImpactSchema` valida no cliente (form) **e** no servidor (action). Single source of truth.

## Validação de variáveis de ambiente

`src/core/config/env.ts`:

```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  COOKIE_DOMAIN: z.string(),
  RESEND_API_KEY: z.string().optional(),
  // ...
});

export const env = envSchema.parse(process.env);
```

Se faltar variável crítica, o app **não sobe**. Falha rápida.

## Convenções

- Schemas em arquivos `*.schema.ts`
- Tipos derivados via `z.infer` — nunca declarar tipo paralelo manualmente
- Mensagens de erro em **português** (são exibidas pro usuário)
- `z.coerce.number()` quando vier de FormData (que sempre é string)
- `z.nativeEnum(EnumPrisma)` pra reusar enums do Prisma
- Validação de UUID: `z.string().uuid()`
- Datas: `z.coerce.date()` quando vier de form, `z.string().datetime()` quando JSON

## Checklist ao criar schema

- [ ] Schema separado entre create/update/query
- [ ] Tipos exportados via `z.infer`
- [ ] Mensagens de erro em PT
- [ ] Coerções apropriadas (number, date)
- [ ] Schema testado com casos válidos e inválidos
- [ ] Reuso de enums do Prisma via `z.nativeEnum`
