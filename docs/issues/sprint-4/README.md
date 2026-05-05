# Sprint 4 — Módulo M5: Orquestração de Treinamentos

> **Estimativa:** 3-4 semanas  
> **Foco:** Cadastro de Pessoa/Cargo/Função, plano de treinamento derivado de Função, turmas, convites por e-mail, marcação de presença

## Visão geral

M5 é a **orquestração de treinamento**, não LMS nativo. O Collab Engine:

- Identifica quem precisa ser treinado (pelas Funções da pessoa, ligadas a Processos do XPROC)
- Define o plano (matriz Treinamento × Função × Pessoa)
- Cria turmas com data, instrutor, local
- Envia convites por e-mail (Resend)
- Marca presença (instrutor, no dia)
- Registra avaliações e notas pós-treinamento

LMS, gravação de aulas, conteúdo programático: ficam externos (integração futura com plataformas LMS comerciais).

## Issues planejadas

### Issue 020 — Cadastro completo Pessoa/Cargo/Função

**Repositório:** Collab Engine

Telas + actions para CRUD de:

- `/people` — lista de Pessoas
- `/people/[id]` — detalhe (cargos atuais e histórico, funções atuais e histórico)
- `/cargos` — lista de Cargos da empresa
- `/funcoes` — lista de Funções
- `/funcoes/[id]` — detalhe + processos vinculados (do XPROC) com papel RACI

Importadores CSV pra cada um.

ADR-004 é a referência.

### Issue 021 — Vinculação Função ↔ Processo (XPROC)

**Repositório:** Collab Engine + XPROC

UI para o usuário, dada uma Função, escolher quais Processos do XPROC ela executa, e com qual papel RACI.

API no XPROC:

- `GET /api/v1/processos?search=...` — listar processos
- `GET /api/v1/processos/{id}` — detalhe

Collab Engine consome via `src/integration/xproc/client.ts`.

Tabela `FuncaoProcesso` (já no schema base).

### Issue 022 — Schema completo de Treinamento

**Repositório:** Collab Engine

```prisma
model TrainingPlan {
  id          String   @id @default(uuid())
  tenantId    String
  projectId   String
  project     Project  @relation(...)
  
  name        String
  description String?
  status      TrainingPlanStatus  @default(DRAFT)
  
  startDate   DateTime?
  endDate     DateTime?
  
  items       TrainingItem[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
}

enum TrainingPlanStatus {
  DRAFT
  APPROVED
  ACTIVE
  COMPLETED
  CANCELLED
}

model TrainingItem {
  id              String       @id @default(uuid())
  planId          String
  plan            TrainingPlan @relation(fields: [planId], references: [id])
  
  title           String
  description     String?
  
  // Para qual função(ões) este treinamento é destinado
  funcoesTarget   FuncaoTreinamento[]
  
  // Pessoas designadas (derivadas das funções, mas com possibilidade de override manual)
  pessoas         PessoaTreinamento[]
  
  // Turmas
  turmas          Turma[]
  
  duration        Int?         // minutos
  modality        Modality     // PRESENCIAL, ONLINE, HIBRIDO, AUTOESTUDO
  
  createdAt       DateTime     @default(now())
  deletedAt       DateTime?
}

enum Modality {
  PRESENCIAL
  ONLINE
  HIBRIDO
  AUTOESTUDO
}

model FuncaoTreinamento {
  id            String       @id @default(uuid())
  trainingItemId String
  trainingItem  TrainingItem @relation(...)
  funcaoId      String
  funcao        Funcao       @relation(...)
  
  obrigatorio   Boolean      @default(true)
  
  @@unique([trainingItemId, funcaoId])
}

model PessoaTreinamento {
  id            String       @id @default(uuid())
  trainingItemId String
  trainingItem  TrainingItem @relation(...)
  pessoaId      String
  pessoa        Pessoa       @relation(...)
  
  derivedFromFuncao Boolean  @default(true)  // false = adicionado manualmente
  status        TrainingStatus @default(PENDENTE)
  
  inscricoes    InscricaoTurma[]  // pode estar inscrita em uma ou mais turmas
  
  @@unique([trainingItemId, pessoaId])
}

enum TrainingStatus {
  PENDENTE      // ainda não inscrito em turma
  INSCRITO      // inscrito em turma futura
  EM_ANDAMENTO  // turma rolando
  CONCLUIDO     // marcado presente, treinamento OK
  AUSENTE       // turma rolou, pessoa faltou
  DISPENSADO    // já tinha o treinamento, dispensado
}

model Turma {
  id              String       @id @default(uuid())
  trainingItemId  String
  trainingItem    TrainingItem @relation(...)
  
  nome            String       // "Turma 1 - 15/Jul"
  
  dataInicio      DateTime
  dataFim         DateTime
  
  modality        Modality
  local           String?      // Sala, link, etc
  
  instrutorId     String?      // userId do instrutor
  
  capacidade      Int?
  
  status          TurmaStatus  @default(AGENDADA)
  
  inscricoes      InscricaoTurma[]
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  deletedAt       DateTime?
}

enum TurmaStatus {
  AGENDADA
  EM_ANDAMENTO
  CONCLUIDA
  CANCELADA
}

model InscricaoTurma {
  id                  String          @id @default(uuid())
  turmaId             String
  turma               Turma           @relation(fields: [turmaId], references: [id])
  pessoaTreinamentoId String
  pessoaTreinamento   PessoaTreinamento @relation(fields: [pessoaTreinamentoId], references: [id])
  
  // Modo 2: instrutor marca presença, sem RSVP
  presente            Boolean?        // null = não marcado ainda
  notaAvaliacao       Int?            // 1-5, opcional
  observacao          String?         // texto livre do instrutor
  
  // Convite
  conviteEnviadoEm    DateTime?
  
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt
  
  @@unique([turmaId, pessoaTreinamentoId])
}
```

### Issue 023 — Geração automática de plano

**Repositório:** Collab Engine

Função `generateTrainingPlanForProject(projectId)` que:

1. Lista Funções afetadas pelos Impactos do projeto (via ImpactActivity → atividade → processo → função reverso)
2. Para cada Função, lista Pessoas atualmente nela (`PessoaFuncao` com `dataFim` null)
3. Cria `TrainingPlan` com `TrainingItem` por treinamento necessário
4. Vincula Pessoas via `PessoaTreinamento` (com `derivedFromFuncao = true`)

UI: botão "Gerar plano automaticamente" na criação de plano. Resultado é editável (usuário pode adicionar/remover pessoas manualmente).

### Issue 024 — Convites por e-mail (Resend)

**Repositório:** Collab Engine

Server action `sendInvitationsAction(turmaId)`:

- Para cada InscricaoTurma sem `conviteEnviadoEm`:
  - Render template HTML do convite (data, hora, local, link/sala, descrição, instrutor)
  - Envia via Resend
  - Atualiza `conviteEnviadoEm`

Template em `src/emails/training-invite.tsx` (React Email ou template HTML simples).

Decisão Modo 2 (sem RSVP): convite é informativo, não pede confirmação. Usuário recebe, vai (ou não), instrutor marca.

### Issue 025 — UI de Turma e marcação de presença

**Repositório:** Collab Engine

`/training/turmas/[id]`:

- Cabeçalho: nome, data, instrutor, local, capacidade
- Lista de inscritos:
  - Nome
  - Função
  - Checkbox "Presente"
  - Campo nota (1-5)
  - Campo observação
- Botão "Salvar presença e notas" (em massa)
- Botão "Encerrar turma" (status → CONCLUIDA)
- Após encerrar:
  - PessoaTreinamento.status atualizado: presente → CONCLUIDO; ausente → AUSENTE
  - Triggers de webhook para SMR (caso atividade do projeto tenha sido vinculada)

### Issue 026 — Dashboards de treinamento

**Repositório:** Collab Engine

`/projects/[id]/training/dashboard`:

- Cobertura: % das pessoas designadas que já concluíram
- Por função: heatmap (Função × Status)
- Por turma: lista com taxas de presença
- Próximas turmas (próximos 14 dias)
- Atrasados (designados há mais de X dias sem turma agendada)

Gráficos com Recharts (já no stack).

### Issue 027 — Notificações automatizadas

**Repositório:** Collab Engine

Cron job (via Vercel Cron) que roda diariamente:

- Pessoas designadas há +30 dias sem turma agendada → email pra coordenador do projeto
- Turmas amanhã → email lembrete pra inscritos e instrutor
- Turmas que terminaram ontem mas presença não marcada → email pra instrutor

Tabela `NotificationLog` registra envios para auditoria.

## Critérios de aceite do Sprint

- [ ] Cadastro de Pessoa/Cargo/Função funcional
- [ ] Vinculação Função↔Processo do XPROC
- [ ] Geração automática de plano operacional
- [ ] Edição manual do plano (adicionar/remover pessoas)
- [ ] Criação de turmas com instrutor e local
- [ ] Convites enviados via Resend
- [ ] Marcação de presença + notas pelo instrutor
- [ ] Dashboard de cobertura
- [ ] Notificações cron funcionando
- [ ] Documentação de uso (tutorial passo-a-passo em PT)
- [ ] Caso de uso real testado: projeto piloto da CollabZ usa o módulo

## Dependências

- Sprint 3 concluído (Stakeholders e Impactos funcionais)
- XPROC com endpoints públicos de listagem/detalhe de processos

## Riscos

- Volume de e-mails pode estourar tier free do Resend → monitorar e considerar tier pago em produção
- Cron timing pode ter atrasos → não usar para coisas time-critical

## Notas

M5 é onde o Collab Engine começa a entregar **automação real** — em vez de o consultor manualmente listar quem treinar, o sistema deriva da estrutura organizacional. Esse é o diferencial vs. ferramentas genéricas.
