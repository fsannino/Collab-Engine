---
name: prisma-migrations
description: "Use this skill whenever creating or modifying Prisma migrations in the Collab Engine. Covers expand/contract pattern for breaking changes, soft delete conventions, multi-tenant isolation via tenantId, indexing rules for governance entities, and reversible migration patterns. Trigger when adding tables, modifying columns, renaming fields, or any task touching prisma/schema.prisma or prisma/migrations/."
---

# Prisma Migrations no Collab Engine

## Quando este skill se aplica

- Adicionar tabelas novas
- Modificar colunas existentes (renomear, mudar tipo, adicionar/remover)
- Adicionar índices ou constraints
- Qualquer mudança em `prisma/schema.prisma`

## Regras inegociáveis

### 1. Multi-tenant em todas as tabelas principais

Toda entidade de domínio carrega `tenantId String` com FK para `Tenant`. Mesmo que MVP rode single-tenant CollabZ, o schema já é multi-tenant.

```prisma
model Stakeholder {
  id        String   @id @default(uuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  // ...
  
  @@index([tenantId])
}
```

Exceções permitidas: tabelas auxiliares de log/audit que sempre carregam `tenantId` mesmo assim, e tabelas de configuração de plataforma (não de tenant).

### 2. Soft delete em entidades de governança

Risco, Problema, Impacto, e qualquer entidade citada no padrão de governança usa **soft delete**:

```prisma
model ChangeImpact {
  // ... outros campos
  deletedAt DateTime? // null = ativo, não-null = deletado
  deletedBy String?   // userId que deletou
  
  @@index([deletedAt])
}
```

Operações padrão:
- `findMany` sempre filtra `deletedAt: null` por default
- Endpoint de "deletar" faz `update` setando `deletedAt: new Date()`, não `delete`
- Endpoint admin de "ver lixeira" filtra `deletedAt: { not: null }`

### 3. Reversibilidade

Toda migration deve ser **reversível** sempre que possível:

- Adicionar coluna nullable: trivialmente reversível
- Adicionar coluna NOT NULL: usar `@default()` ou fazer em duas migrations (add nullable → backfill → set NOT NULL)
- Renomear coluna: usar **expand/contract pattern** (ver abaixo)
- Drop coluna: NUNCA na mesma migration que adiciona substituta. Marcar como deprecated por uma versão.

### 4. Expand/contract pattern para mudanças breaking

Mudança breaking = renomear coluna, mudar tipo, mudar enum. Faz em **duas migrations**:

**Migration 1 (expand):**
- Adiciona coluna nova
- Backfill via SQL: `UPDATE tabela SET coluna_nova = coluna_velha`
- Código passa a escrever em **ambas** as colunas
- Coluna velha continua existindo

**Deploy. Aguardar.**

**Migration 2 (contract):**
- Código para de ler/escrever na coluna velha
- Remove coluna velha
- Renomeia se necessário

### 5. Índices

- Sempre indexar `tenantId`
- Sempre indexar `deletedAt` em entidades soft-delete
- Indexar campos usados em filtros frequentes (`status`, `severity`, `createdAt`)
- Composite indexes para queries comuns: `@@index([tenantId, projectId])`

### 6. Convenções de nomenclatura

- Modelos em **PascalCase singular**: `Stakeholder`, não `Stakeholders`
- Campos em **camelCase**: `createdAt`, `tenantId`, `affectedAreas`
- Enums em **SCREAMING_SNAKE_CASE**: `ImpactStatus`, valores `OPEN`, `IN_PROGRESS`
- IDs sempre `String @id @default(uuid())`, exceto se houver razão forte para outro tipo
- Timestamps obrigatórios em entidades de negócio: `createdAt`, `updatedAt`

### 7. Relations

- Foreign keys explícitas: `userId String` + `user User @relation(...)`, nunca implícitas
- N:M sempre via tabela explícita (não usar implicit M-N do Prisma) — facilita adicionar metadados na relação

```prisma
// Errado (implicit)
model Project {
  stakeholders Stakeholder[]
}

// Certo (explicit)
model ProjectStakeholder {
  id            String      @id @default(uuid())
  projectId     String
  project       Project     @relation(fields: [projectId], references: [id])
  stakeholderId String
  stakeholder   Stakeholder @relation(fields: [stakeholderId], references: [id])
  // metadados da relação aqui
  position      StakeholderPosition
  influence     Int
  createdAt     DateTime @default(now())
  
  @@unique([projectId, stakeholderId])
}
```

## Comandos comuns

```bash
# Criar migration nova baseada em mudança no schema
pnpm prisma migrate dev --name nome_descritivo

# Aplicar migrations em produção
pnpm prisma migrate deploy

# Reverter última migration (apenas dev)
pnpm prisma migrate reset

# Verificar drift entre schema e DB
pnpm prisma migrate status

# Gerar cliente Prisma após mudança
pnpm prisma generate
```

## Antes de criar a migration

1. Verificar se schema compila: `pnpm prisma format && pnpm prisma validate`
2. Ler ADR-003 (soft delete) se a tabela é de governança
3. Ler ADR-006 (multi-tenant) se for entidade de domínio
4. Confirmar que campos de governança seguem padrão (severidade 1-5, etc.)

## Checklist de revisão de migration

- [ ] tenantId presente em entidade de domínio?
- [ ] deletedAt presente em entidade de governança?
- [ ] Índices em campos filtrados frequentemente?
- [ ] Defaults sensatos em campos NOT NULL?
- [ ] Naming consistente com o resto do schema?
- [ ] Migration reversível ou justificada como expand/contract?
- [ ] Cliente Prisma regenerado (`pnpm prisma generate`)?
