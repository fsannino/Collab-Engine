# ADR-004 — Cargo Separado de Função

**Status:** Aceito  
**Data:** 2026-05-04  
**Decisão por:** Fabiano Sannino (CollabZ)

## Contexto

Pessoas em uma organização têm dois conceitos relacionados mas diferentes:

- **Cargo** — posição contratual formal ("Analista Sênior de Compras")
- **Função** — o que a pessoa de fato executa ("aprovador de pedidos acima de R$ 50k", "comprador de matéria-prima")

Pessoas com mesmo cargo podem executar funções diferentes. Pessoas com cargos diferentes podem compartilhar uma mesma função. Em sistemas de RH (HRIS) corporativos, a distinção é padrão.

Para o módulo M5 (Treinamento), a distinção é crítica:

- Treinamento deveria ser derivado da **função** (o que executa) — pois é a função que se relaciona com processos do XPROC
- Cargo é informação contratual usada para hierarquia, salário, contratação — não para definir necessidade de treinamento

## Alternativas consideradas

### Alternativa A: Tudo em uma entidade "Papel"

Criar entidade única `Papel` que mistura cargo e função. Mais simples no schema.

**Problema:** quando RH pergunta "quem é Analista Sênior?", a resposta exige filtrar papéis por algum atributo. Quando treinamento pergunta "quem aprova pedidos?", também filtra. As duas perguntas diferentes geram complexidade no mesmo modelo.

### Alternativa B: Entidades separadas

Cargo e Função como entidades distintas. Pessoa tem 1+ cargos (com história) e 1+ funções (atuais).

**Trade-off:** mais tabelas, mais junções. Em compensação, queries de RH e queries de treinamento ficam claras.

## Decisão

**Alternativa B: entidades separadas.**

### Schema resumido

```prisma
model Pessoa {
  id        String   @id @default(uuid())
  tenantId  String
  nome      String
  email     String?  @unique
  cpf       String?
  hrisId    String?  // ID externo do HRIS
  
  cargosHistorico  PessoaCargo[]
  funcoesAtuais    PessoaFuncao[]
  // ... outros relacionamentos
}

model Cargo {
  id          String   @id @default(uuid())
  tenantId    String
  nome        String   // "Analista Sênior de Compras"
  nivel       String?  // "Sênior", "Pleno", "Júnior" (opcional)
  
  pessoas     PessoaCargo[]
}

model PessoaCargo {
  id          String    @id @default(uuid())
  pessoaId    String
  pessoa      Pessoa    @relation(fields: [pessoaId], references: [id])
  cargoId     String
  cargo       Cargo     @relation(fields: [cargoId], references: [id])
  
  dataInicio  DateTime
  dataFim     DateTime?  // null = vigente
  
  @@index([pessoaId, dataFim])
}

model Funcao {
  id          String   @id @default(uuid())
  tenantId    String
  nome        String   // "Aprovador de pedidos > R$ 50k"
  descricao   String?
  
  processos   FuncaoProcesso[]   // Funcao executa N processos do XPROC
  pessoas     PessoaFuncao[]
  treinamentos FuncaoTreinamento[]
}

model PessoaFuncao {
  id          String    @id @default(uuid())
  pessoaId    String
  pessoa      Pessoa    @relation(fields: [pessoaId], references: [id])
  funcaoId    String
  funcao      Funcao    @relation(fields: [funcaoId], references: [id])
  
  dataInicio  DateTime  @default(now())
  dataFim     DateTime?  // null = vigente
  
  @@unique([pessoaId, funcaoId, dataInicio])
}

model FuncaoProcesso {
  id          String   @id @default(uuid())
  funcaoId    String
  funcao      Funcao   @relation(fields: [funcaoId], references: [id])
  
  // Referência externa: processo vive no XPROC
  xprocProcessoId String
  
  papel       PapelNoProcesso  // RACI: RESPONSIBLE, ACCOUNTABLE, CONSULTED, INFORMED
  
  @@unique([funcaoId, xprocProcessoId])
}

enum PapelNoProcesso {
  RESPONSIBLE
  ACCOUNTABLE
  CONSULTED
  INFORMED
}
```

### Por que histórico em PessoaCargo

Pessoas mudam de cargo (promoções, transferências). O sistema precisa saber:
- Qual cargo atual (`dataFim IS NULL`)
- Qual cargo em uma data específica (relatório retroativo)

Função também tem início/fim (mudança de atribuição), mas costuma ter menos histórico que cargo.

## Consequências

### Positivas
- Modelo claro: queries de RH usam Cargo, queries de treinamento usam Função
- Histórico de cargo permite relatórios retroativos
- Função se relaciona naturalmente com processos do XPROC (RACI)
- Treinamento deriva diretamente de Função (M5 fica simples)
- Compatível com HRIS comuns (que separam position vs role)

### Negativas
- Mais tabelas para entender e manter
- Cadastro inicial mais trabalhoso (precisa cadastrar pessoa, cargo, função, e ligar)
- Importação de dados HRIS exige mapping entre sistemas

### Mitigação
- Importadores CSV específicos para cada entidade
- Wizard de onboarding que guia o usuário pelos cadastros em ordem
- Templates de Cargo e Função pré-populados por tipo de empresa

## Referências

- ADR-002 — stack unificado (este modelo vive no Collab Engine)
- Skill `prisma-migrations` — convenções de schema
- Issue de Sprint 4 — implementação do módulo M5 usa este modelo
