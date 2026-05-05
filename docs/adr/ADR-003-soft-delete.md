# ADR-003 — Soft Delete com Preservação de Histórico

**Status:** Aceito  
**Data:** 2026-05-04  
**Decisão por:** Fabiano Sannino (CollabZ)

## Contexto

Entidades de governança (Risco, Problema, Impacto) e suas vinculações com atividades/áreas precisam ser preservadas mesmo após "exclusão" pelos usuários. Razões:

1. **Auditoria** — projetos regulados (ANVISA, ISO, etc.) exigem histórico completo de decisões
2. **LGPD** — direito ao esquecimento exige soft delete reversível para dados pessoais (apagamento físico só após período legal)
3. **Análise retrospectiva** — entender por que um risco foi excluído pode ser tão importante quanto entender por que foi criado
4. **Acidentes** — usuários ocasionalmente deletam por engano; soft delete permite recuperação

## Decisão

**Toda entidade de governança e suas vinculações usam soft delete via campo `deletedAt`, com preservação total do histórico.**

## Detalhes técnicos

### Schema

```prisma
model ChangeImpact {
  id          String   @id @default(uuid())
  // ... campos de domínio
  
  deletedAt   DateTime?    // null = ativo, não-null = excluído
  deletedBy   String?      // userId que excluiu
  
  @@index([deletedAt])    // performance em queries que filtram
}
```

### Convenções

- **Campo `deletedAt`** sempre nullable, default null
- **Campo `deletedBy`** sempre nullable, FK opcional para User
- **Default em queries:** sempre filtrar `deletedAt: null` salvo se admin pediu explicitamente
- **Endpoint admin** `/admin/trash` mostra itens deletados, permite restaurar
- **Restauração** seta `deletedAt: null, deletedBy: null` e cria entrada de log
- **Vinculações N:M** (ImpactActivity, ImpactArea, etc.) também têm `deletedAt` próprio

### O que NÃO é soft delete

- Logs imutáveis (`Acompanhamento*`, `LoginAttempt`) — nunca deletar
- Tabelas de configuração de plataforma (Tenant, User) — política de exclusão diferente, ver ADR específico
- Refs externas inválidas (ex: `smrActivityId` aponta para atividade que não existe mais no SMR) — soft delete da vinculação, não da atividade externa

### Apagamento físico definitivo

Apagamento físico só ocorre via:

1. **Job mensal** que limpa registros com `deletedAt < now() - 7 anos` (período de retenção legal padrão)
2. **Solicitação LGPD** explícita do usuário, executada por admin com log de auditoria

Antes desses dois cenários, **nada some do banco**.

## Consequências

### Positivas
- Recuperação fácil de exclusões acidentais
- Histórico completo para auditoria
- Conformidade LGPD/ISO sem retrabalho
- Análise retrospectiva possível

### Negativas
- Tabelas crescem mais (compensado por índices em deletedAt)
- Queries precisam sempre incluir filtro `deletedAt: null` — Prisma middleware pode automatizar
- Constraints de unicidade ficam complicadas (precisam de unique parcial: `WHERE deletedAt IS NULL`)
- UNIQUE em vinculações N:M precisa ser `@@unique([impactId, activityId])` mas só vale para registros ativos — alternativa: include deletedAt no unique constraint

### Mitigação dos negativos

Prisma middleware para filtragem automática:

```typescript
// src/core/prisma/soft-delete-middleware.ts
prisma.$use(async (params, next) => {
  const softDeleteModels = ['ChangeImpact', 'ImpactActivity', 'ImpactArea', /* ... */];
  
  if (softDeleteModels.includes(params.model ?? '')) {
    if (params.action === 'findMany' || params.action === 'findFirst') {
      params.args.where = {
        ...params.args.where,
        deletedAt: params.args.where?.deletedAt ?? null,
      };
    }
    if (params.action === 'delete') {
      params.action = 'update';
      params.args.data = { deletedAt: new Date() };
    }
  }
  
  return next(params);
});
```

## Referências

- LGPD Art. 16 — eliminação de dados pessoais
- ADR-001 — escala 5×5 (entidades que usam este padrão)
- Skill `governance-pattern` — implementação detalhada
