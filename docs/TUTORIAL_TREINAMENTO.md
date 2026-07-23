# Tutorial — Módulo de Treinamento (M5)

> Guia de uso para coordenadores de mudança e RH.
> O Collab:Evolve **não é um LMS**: ele orquestra o treinamento — planos, turmas,
> convites, presença e cobertura. O conteúdo em si (vídeos, apostilas) vive em
> links externos cadastrados como materiais.

## Fluxo em uma frase

**Funções → Plano → Itens → Turmas → Convites → Presença → Dashboard.**

Você define quem precisa treinar o quê (matriz função × treinamento), o sistema
gera o plano, você agenda turmas, convida por e-mail, registra presença/notas e
acompanha a cobertura no dashboard.

---

## 1. Pré-requisitos (cadastros básicos)

Antes de criar o primeiro plano, garanta que existem:

1. **Pessoas** (`/people`) — colaboradores com nome e **e-mail** (necessário para convites).
2. **Funções** (`/funcoes`) — papéis organizacionais (ex.: "Analista Fiscal", "Comprador").
   - Em cada função, vincule as **pessoas ativas** que a exercem.
   - Opcional: vincule **processos** (RACI) na página da função.
3. **Projeto** (`/projects`) — o plano de treinamento pertence a um projeto de mudança.

> **Dica:** a geração automática de plano depende de existir ao menos uma função
> com pessoas ativas vinculadas. Sem isso, o gerador retorna erro orientando o cadastro.

## 2. Criar um plano de treinamento

Acesse `/projects/[projeto]/training` e clique em **+ Novo Plano**
(ou vá direto em `/training/plans/new`).

Há dois caminhos:

### A) Gerar automaticamente (recomendado)

Clique em **"Gerar automaticamente"**. O sistema:

- Varre as **funções com pessoas ativas** do tenant;
- Cria um item de treinamento por necessidade identificada na matriz função × treinamento;
- Designa automaticamente as pessoas de cada função ao item correspondente
  (marcadas como "derivadas da função").

Depois é só revisar o plano gerado e ajustar (remover pessoas, adicionar itens).

### B) Criar manualmente

Preencha **Projeto**, **Nome**, Descrição e datas de início/fim. Os itens são
adicionados depois, na página do plano.

## 3. A página do plano (`/training/plans/[id]`)

Cada plano lista seus **itens de treinamento**. Para cada item você vê e gerencia:

| Seção | O que fazer |
|-------|-------------|
| **Cabeçalho do item** | Título, modalidade (Presencial / Online / Híbrido / Autoestudo), duração e funções vinculadas |
| **Pessoas designadas** | Quem precisa fazer este treinamento. Adicione ou remova manualmente; pessoas derivadas de função são marcadas |
| **Turmas** | Sessões agendadas do item, com datas, local, nº de inscritos e status |
| **Materiais** | Links externos de conteúdo (LMS, PDFs, vídeos) — cadastre título + URL |

## 4. Turmas (`/training/turmas/[id]`)

A turma é a execução concreta de um item: datas, local, capacidade e nota mínima
de aprovação. Na página da turma:

1. **Instrutores** — vincule uma ou mais pessoas como instrutores.
2. **Convites por e-mail** — o botão **"Enviar convites"** dispara e-mail (via Resend)
   para todos os inscritos ainda não notificados. O sistema mostra quantos faltam
   notificar e não reenvia para quem já recebeu.
3. **Lista de presença** — para cada inscrito, registre:
   - Presente (sim/não)
   - Nota de avaliação e nota de exame (se aplicável)
   - Observação
4. **Encerrar turma** — ao concluir, o status vira **Concluída** e a presença é
   congelada. Se a turma tem **nota mínima de aprovação**, o sistema usa as notas
   para determinar aprovação de cada inscrito.

Status possíveis da turma: **Agendada → Em andamento → Concluída** (ou **Cancelada**).

## 5. Dashboard de treinamento (`/projects/[id]/training/dashboard`)

Visão consolidada do projeto:

- **Cobertura**: % de designações concluídas sobre o total;
- Situação por item e por turma (inscritos, presentes, convites enviados);
- Pendências: turmas vencidas não encerradas, pessoas sem turma.

É a página para responder "estamos prontos para o go-live?".

## 6. Notificações automáticas

Um cron diário (`/api/cron/training-notifications`) envia:

- **Lembretes de turma** por e-mail para inscritos e instrutores de turmas próximas;
- **Alertas de treinamento parado**: itens há mais de 30 dias sem turma agendada.

Cada envio é registrado em log (`NotificationLog`) — não há reenvio duplicado.

> **Requisito:** a variável `RESEND_API_KEY` precisa estar configurada em produção.
> Sem ela, convites e lembretes ficam desabilitados (o restante do módulo funciona).

## 7. Perguntas frequentes

**Posso usar o módulo sem projeto?** Não — todo plano pertence a um projeto de mudança.

**E o conteúdo do curso?** Cadastre como material (link externo). O Collab:Evolve
não armazena conteúdo — princípio "não construir LMS próprio".

**Removi uma pessoa da função. Ela sai do plano?** Não automaticamente — a designação
já criada permanece; remova manualmente no painel de pessoas do item se necessário.

**A cobertura aparece em outros lugares?** Sim: no **Leadership Console** do projeto
(KPI "Cobertura de treinamento") e no dashboard de Portfolio.
