# ADR-006 — Multi-tenant desde o Dia 1

**Status:** Aceito  
**Data:** 2026-05-04  
**Decisão por:** Fabiano Sannino (CollabZ)

## Contexto

O Collab Engine começa servindo apenas a CollabZ Consultoria internamente. Mas o roadmap inclui:

1. CollabZ usa internamente (single tenant)
2. CollabZ oferece para clientes da consultoria como "ferramenta companion" do serviço
3. Eventual venda como SaaS B2B independente

Cenários 2 e 3 exigem isolamento total entre clientes. Cenário 1 não exige, mas se o schema não estiver preparado, migrar depois é caro.

## Decisão

**Toda entidade de domínio carrega `tenantId` desde o primeiro commit. Isolamento via filtro Prisma + middleware. Eventualmente reforçado por Row-Level Security do PostgreSQL.**

## Detalhes

### Schema

Toda tabela de domínio:

```prisma
model NomeEntidade {
  id        String  @id @default(uuid())
  tenantId  String
  tenant    Tenant  @relation(fields: [tenantId], references: [id])
  // ... resto
  
  @@index([tenantId])
}
```

### Tabela Tenant

```prisma
model Tenant {
  id        String   @id @default(uuid())
  name      String   // "CollabZ Consultoria"
  slug      String   @unique  // "collabz"
  domain    String?  // "collabz.com.br" (opcional, custom domain)
  plan      PlanType @default(STARTER)
  active    Boolean  @default(true)
  settings  Json     @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  users     User[]
  // ... relacionamentos com outras entidades
}

enum PlanType {
  INTERNAL    // CollabZ uso interno
  STARTER
  PROFESSIONAL
  ENTERPRISE
}
```

### Isolamento em queries

**Estratégia: filtro explícito sempre, validado por middleware.**

Em código, queries sempre incluem `tenantId`:

```typescript
const impacts = await prisma.changeImpact.findMany({
  where: {
    tenantId: session.tenantId,  // sempre presente
    projectId,
    deletedAt: null,
  },
});
```

Middleware Prisma valida que toda query a entidade de domínio tem `tenantId`:

```typescript
prisma.$use(async (params, next) => {
  const tenantedModels = ['ChangeImpact', 'Stakeholder', 'Project', /* ... */];
  
  if (tenantedModels.includes(params.model ?? '')) {
    if (['findMany', 'findFirst', 'findUnique', 'count', 'aggregate'].includes(params.action)) {
      if (!params.args.where?.tenantId) {
        throw new Error(`Query em ${params.model} sem tenantId é proibida`);
      }
    }
    if (['create'].includes(params.action)) {
      if (!params.args.data?.tenantId) {
        throw new Error(`Create em ${params.model} sem tenantId é proibido`);
      }
    }
  }
  
  return next(params);
});
```

Erro em desenvolvimento, log + alerta em produção. **Nunca silencioso.**

### Row-Level Security (futuro)

Quando o produto crescer, ativaremos RLS no Postgres como segunda camada de defesa:

```sql
ALTER TABLE "ChangeImpact" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "ChangeImpact"
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

Cada conexão Prisma recebe `SET app.current_tenant = '<uuid>'` no início, baseado no JWT da sessão.

**Não implementado no MVP** porque adiciona complexidade. Filtro explícito + middleware é suficiente para isolamento lógico.

## Validação

### Testes obrigatórios

Cada PR que toca em entidade de domínio deve ter teste de isolamento:

```typescript
describe('Tenant isolation', () => {
  it('não permite usuário de tenant A ver dados de tenant B', async () => {
    const userA = await createUserInTenant('tenant-a');
    const impactB = await createImpactInTenant('tenant-b');
    
    const result = await getImpacts(userA.session);
    expect(result).not.toContainEqual(expect.objectContaining({ id: impactB.id }));
  });
});
```

### Pen-test anual

Quando o Collab Engine for vendido externamente, contratar pen-test focado em escape de tenant.

## Consequências

### Positivas
- Pronto para SaaS sem refator
- Schema correto desde início (custo zero adicional no MVP)
- Cliente CollabZ no MVP é apenas um tenant a mais
- Compliance LGPD: dados de cliente A nunca tocam cliente B

### Negativas
- Toda query precisa pensar em tenantId (mas middleware ajuda)
- Ligeiramente mais código nas actions/queries
- Cuidado com agregações cross-tenant (admin-only)

### Reversibilidade

Sair do multi-tenant para single-tenant seria trivial (remover filtros). O caminho contrário, do single-tenant para multi-tenant, **é caríssimo** (refatorar todo o schema, migrar dados, testes de isolamento). Por isso começamos multi-tenant.

## Referências

- ADR-002 — stack unificado
- ADR-003 — soft delete (também aplica em entidades multi-tenant)
- Skill `prisma-migrations` — convenções de schema
- PostgreSQL Docs — Row-Level Security
