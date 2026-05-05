# Issue 004 — Glossário de integração validado

> **Sprint:** 1  
> **Estimativa:** 2-3 horas  
> **Tipo:** Documentação / Discovery  
> **Prioridade:** P1  
> **Repositório alvo:** Collab Engine (este)

## Objetivo

Validar e completar o glossário de integração `docs/INTEGRATION_GLOSSARY.md` consultando os schemas reais do SMR e XPROC. Este é trabalho de discovery: ler os schemas, identificar termos, conferir mapeamento.

## Contexto

O glossário inicial foi escrito a partir das avaliações dos sistemas. Pode ter divergências em relação ao que está realmente em produção. Esta issue é validação direta nos schemas.

## Critérios de aceite

- [ ] Schema do SMR (`prisma/schema.prisma` no repo do SMR) lido e termos extraídos
- [ ] Schema do XPROC (`prisma/schema.prisma` no repo do XPROC) lido e termos extraídos
- [ ] Tabela mestra do glossário atualizada com termos reais
- [ ] Status maps atualizados com valores reais (Risco, Projeto, Processo)
- [ ] Termos órfãos (que estão no glossário mas não nos schemas, ou vice-versa) identificados
- [ ] Apêndice "Termos não-mapeados" listando o que precisa decisão futura
- [ ] Função utility `src/integration/bridge/status-mapper.ts` criada com os maps
- [ ] Função utility `src/integration/bridge/scale-mapper.ts` criada (XPROC A/M/B → 1-5)
- [ ] Tests unitários de cada função
- [ ] PR aberto com mudanças no glossário e funções

## Passos

### 1. Acesso aos schemas

Você (humano) precisa fornecer ao Claude Code acesso aos repos do SMR e XPROC:

**Opção A:** Clonar localmente os dois repos lado a lado:

```
~/work/
├── smr-projetos/
├── xproc/
└── collab-engine/   ← você está aqui
```

E pedir ao Claude Code: "Leia `../smr-projetos/prisma/schema.prisma` e `../xproc/prisma/schema.prisma`".

**Opção B:** Copiar os schemas para `docs/reference/` no Collab Engine temporariamente (depois apagar):

```bash
cp ~/work/smr-projetos/prisma/schema.prisma docs/reference/smr-schema.prisma
cp ~/work/xproc/prisma/schema.prisma docs/reference/xproc-schema.prisma
```

### 2. Extração de termos

Para cada schema, listar:

- Modelos (entidades de domínio)
- Enums e seus valores
- Campos com nomes "interessantes" (que possam confundir)
- Foreign keys que referenciam entidades de outros sistemas (se houver)

### 3. Atualização do glossário

Para cada termo encontrado:

- Verificar se está na tabela mestra
- Atualizar nome real (em vez do nome aproximado que coloquei)
- Marcar quem é dono (sistema)
- Documentar se há tradução necessária

### 4. Status maps

Status reais de Projeto no SMR — ler enum, listar valores. Idem para XPROC.

Atualizar `STATUS_MAP` em `src/integration/bridge/status-mapper.ts`:

```typescript
export const STATUS_MAP = {
  smrToCollab: {
    // VALORES_REAIS_DO_SMR: 'EQUIVALENTE_COLLAB',
  },
  xprocToCollab: {
    // VALORES_REAIS_DO_XPROC: 'EQUIVALENTE_COLLAB',
  },
  collabToSmr: { /* inverso */ },
  collabToXproc: { /* inverso */ },
};

export function translateStatus(
  status: string,
  from: 'smr' | 'xproc' | 'collab',
  to: 'smr' | 'xproc' | 'collab',
): string {
  if (from === to) return status;
  const key = `${from}To${to.charAt(0).toUpperCase()}${to.slice(1)}` as keyof typeof STATUS_MAP;
  const map = STATUS_MAP[key];
  return map?.[status as keyof typeof map] ?? status;
}
```

### 5. Scale mappers

```typescript
// src/integration/bridge/scale-mapper.ts

export type XprocScale = 'A' | 'M' | 'B';
export type CollabScale = 1 | 2 | 3 | 4 | 5;

export function xprocToCollabScale(letter: XprocScale): CollabScale {
  return ({ B: 2, M: 3, A: 4 } as const)[letter];
}

export function collabToXprocScale(n: CollabScale): XprocScale {
  if (n <= 2) return 'B';
  if (n <= 3) return 'M';
  return 'A';
}
```

### 6. Tests

```typescript
// src/__tests__/integration/scale-mapper.test.ts
import { describe, it, expect } from 'vitest';
import { xprocToCollabScale, collabToXprocScale } from '@/integration/bridge/scale-mapper';

describe('scale-mapper', () => {
  describe('xprocToCollabScale', () => {
    it('B mapeia para 2', () => expect(xprocToCollabScale('B')).toBe(2));
    it('M mapeia para 3', () => expect(xprocToCollabScale('M')).toBe(3));
    it('A mapeia para 4', () => expect(xprocToCollabScale('A')).toBe(4));
  });
  
  describe('collabToXprocScale', () => {
    it('1-2 mapeia para B', () => {
      expect(collabToXprocScale(1)).toBe('B');
      expect(collabToXprocScale(2)).toBe('B');
    });
    it('3 mapeia para M', () => expect(collabToXprocScale(3)).toBe('M'));
    it('4-5 mapeia para A', () => {
      expect(collabToXprocScale(4)).toBe('A');
      expect(collabToXprocScale(5)).toBe('A');
    });
  });
});
```

Análogo para `status-mapper.test.ts`.

### 7. Apêndice de termos não-mapeados

Adicionar seção no glossário:

```markdown
## Termos não-mapeados (precisam decisão futura)

| Termo | Onde aparece | Pendência |
|-------|--------------|-----------|
| ... | ... | ... |
```

### 8. PR

Commit:

```
docs: glossário validado contra schemas reais SMR + XPROC

- Termos atualizados com nomes reais dos schemas
- Status maps com valores reais
- Funções utility status-mapper e scale-mapper criadas
- Tests unitários
- Apêndice de termos pendentes
```

## O que NÃO fazer

- Modificar schemas SMR ou XPROC (essas são issues separadas)
- Implementar webhooks de sincronização (sprint posterior)
- Adicionar entidades novas aos sistemas

## Quando concluir

- PR mergeado
- Glossário atualizado
- Status no topo deste arquivo
