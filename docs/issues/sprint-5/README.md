# Sprint 5 — Diagnóstico Cultural OCAI + M7 Liderança + Dashboards Cross-Sistema

> **Estimativa:** 3-4 semanas  
> **Foco:** Diagnóstico cultural via OCAI (Cameron-Quinn), módulo M7 Leadership Console, dashboards executivos no Bridge agregando dados dos três sistemas

## Visão geral

Sprint 5 entrega:

- **OCAI** (Organizational Culture Assessment Instrument): diagnóstico cultural no início do projeto, dois modos (gestor direto OU survey distribuído)
- **M7 — Leadership Console:** dashboard executivo focado em sponsors/líderes
- **Cross-system dashboards:** Bridge agrega dados de SMR + XPROC + Collab para visão unificada

Após Sprint 5, **MVP completo entregue** (Risk + Problem + Impact + Stakeholder + Training + Cultural + Leadership). 9 dos 16 módulos do MERIDIAN original implementados.

## Issues planejadas

### Issue 028 — Schema de Diagnóstico Cultural

**Repositório:** Collab Engine

```prisma
model DiagnosticoCultural {
  id          String   @id @default(uuid())
  tenantId    String
  projectId   String
  project     Project  @relation(...)
  
  tipo        TipoDiagnostico  // OCAI_DIRETO, OCAI_SURVEY
  modo        ModoDiagnostico  // COMPLETO_24, SIMPLIFICADO_LIKERT
  
  status      StatusDiagnostico @default(EM_PREPARACAO)
  
  dataInicio  DateTime?
  dataFim     DateTime?
  
  // Para survey distribuído
  questionarios QuestionarioOCAI[]
  
  // Resultado consolidado
  perfilAtual  PerfilCulturalOCAI?
  perfilDesejado PerfilCulturalOCAI?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
}

enum TipoDiagnostico {
  OCAI_DIRETO   // gestor preenche sozinho representando a organização
  OCAI_SURVEY   // survey distribuído, resposta agregada
}

enum ModoDiagnostico {
  COMPLETO_24    // 24 itens em 6 dimensões, alocação 100 pontos
  SIMPLIFICADO_LIKERT  // versão simplificada, escala Likert 1-5
}

enum StatusDiagnostico {
  EM_PREPARACAO
  ATIVO        // survey aberto pra respostas
  ENCERRADO    // respostas fechadas, perfil gerado
  ARQUIVADO
}

model QuestionarioOCAI {
  id              String   @id @default(uuid())
  diagnosticoId   String
  diagnostico     DiagnosticoCultural @relation(...)
  
  pessoaId        String?  // se identificado
  pessoa          Pessoa?  @relation(...)
  emailToken      String?  @unique  // se anônimo via link
  
  status          StatusQuestionario @default(PENDENTE)
  
  respostas       RespostaOCAI[]
  
  enviadoEm       DateTime?
  respondidoEm    DateTime?
  
  @@index([diagnosticoId, status])
}

enum StatusQuestionario {
  PENDENTE
  ENVIADO
  RESPONDIDO
  EXPIRADO
}

model RespostaOCAI {
  id              String   @id @default(uuid())
  questionarioId  String
  questionario    QuestionarioOCAI @relation(...)
  
  dimensao        DimensaoOCAI  // 6 dimensões: características dominantes, etc.
  cultura         CulturaOCAI   // 4 culturas: clan, adhocracy, market, hierarchy
  
  // Modo COMPLETO_24: alocação de pontos (soma 100 por dimensão)
  pontosAtual     Int?
  pontosDesejado  Int?
  
  // Modo SIMPLIFICADO_LIKERT: escala 1-5
  notaAtual       Int?
  notaDesejado    Int?
}

enum DimensaoOCAI {
  CARACTERISTICAS_DOMINANTES
  LIDERANCA_ORGANIZACIONAL
  GESTAO_PESSOAS
  COESAO_ORGANIZACIONAL
  ENFASE_ESTRATEGICA
  CRITERIOS_SUCESSO
}

enum CulturaOCAI {
  CLAN          // colaborativo, familiar
  ADHOCRACY     // criativo, inovador
  MARKET        // competitivo, orientado a resultados
  HIERARCHY     // controlado, processo
}

model PerfilCulturalOCAI {
  id              String   @id @default(uuid())
  diagnosticoId   String   @unique
  diagnostico     DiagnosticoCultural @relation(fields: [diagnosticoId], references: [id])
  
  tipo            TipoPerfil  // ATUAL, DESEJADO
  
  // Pontuação consolidada por cultura (média ponderada das respostas)
  clan            Float
  adhocracy       Float
  market          Float
  hierarchy       Float
  
  amostra         Int      // quantos respondentes
  
  geradoEm        DateTime @default(now())
}

enum TipoPerfil {
  ATUAL
  DESEJADO
}
```

### Issue 029 — UI do diagnóstico (gestor direto)

**Repositório:** Collab Engine

`/projects/[id]/cultural-diagnostic/new`:

- Wizard:
  1. Escolher tipo (DIRETO ou SURVEY)
  2. Escolher modo (COMPLETO ou SIMPLIFICADO)
  3. Para DIRETO: gestor preenche o questionário direto
  4. Para SURVEY: configurar destinatários e enviar (próxima issue)

Tela do questionário OCAI completo (24 itens):
- 6 dimensões em accordion
- Em cada dimensão, 4 alternativas (uma por cultura)
- Para cada par alternativa × cultura: input "ATUAL" e input "DESEJADO"
- Soma deve dar 100 por dimensão (validação client-side)

### Issue 030 — Survey distribuído (modo 2)

**Repositório:** Collab Engine

- Coordenador escolhe lista de pessoas (PessoaFuncao do projeto)
- Sistema gera token único por pessoa
- Resend envia e-mail com link `/diagnostic/respond/[token]`
- Pessoa responde sem precisar de conta
- Cron fecha survey após X dias OU quando coordenador clica "Encerrar"
- Após encerrar: agregação calcula `PerfilCulturalOCAI` para ATUAL e DESEJADO

### Issue 031 — Visualização do perfil cultural

**Repositório:** Collab Engine

`/projects/[id]/cultural-diagnostic/[did]`:

- Gráfico radar (4 quadrantes: Clan, Adhocracy, Market, Hierarchy) com perfil atual e desejado sobrepostos
- Tabela de gap (diferença atual vs desejado)
- Análise narrativa (gerada por IA — Anthropic SDK):
  - "Sua organização atual é predominantemente Hierarchy + Market..."
  - "Para chegar ao perfil desejado, foque em iniciativas que fortaleçam Clan..."
- Recomendações de ações de mudança baseadas no gap (pode usar Anthropic SDK pra gerar)

### Issue 032 — Ajuste de severidade por cultura

**Repositório:** Collab Engine

Função `adjustImpactSeverityByCulture(impact, culturalProfile)`:

- Se cultura predominante é Hierarchy + impacto é em Process → severidade alta (resistência a mudança de processo)
- Se cultura é Adhocracy + impacto é em Technology → severidade baixa (cultura abraça inovação)
- Multiplicador 0.7-1.3x sobre severidade base

UI do impacto mostra severidade base e severidade ajustada lado a lado.

Esse ajuste é informacional (não substitui severidade base) e configurável (pode desligar).

### Issue 033 — M7 Leadership Console

**Repositório:** Collab Engine

`/projects/[id]/leadership-console`:

Visão executiva, foco em sponsors/decisores:

- Status do projeto em uma frase ("On track", "At risk", "Critical")
- 3-5 KPIs mais importantes (configurável):
  - % adoption (se medido)
  - Stakeholders Champion vs Resistor (saldo)
  - Impactos Open vs Closed (saldo)
  - Treinamento: % cobertura
  - Riscos críticos abertos (do SMR)
- Próximas 3 ações que requerem atenção do líder
- Decisões pendentes (impactos com status ACCEPTED requerem ratificação)

Otimizado pra mobile (sponsor pode acessar do celular antes de reunião).

### Issue 034 — Bridge: Cross-system dashboard

**Repositório:** Collab Engine (sub-domínio bridge)

`/bridge/dashboard` (acesso restrito a admin/gerência):

- Listagem de projetos da CollabZ (de SMR)
- Para cada projeto, agregar:
  - Tarefas em atraso (do SMR)
  - Riscos críticos (do SMR)
  - Problemas abertos (do SMR)
  - Impactos abertos (do Collab)
  - Treinamentos atrasados (do Collab)
  - Processos não revisados há X meses (do XPROC)
- Score de saúde unificado

Implementação:

- `src/integration/bridge/aggregators.ts` — funções que consultam os 3 sistemas via API
- Cache em tabela `BridgeCache` com TTL (não martelar API a cada page view)
- Refresh manual + cron diário

### Issue 035 — Relatório executivo PDF

**Repositório:** Collab Engine

Geração de relatório PDF mensal por projeto:

- Status executivo
- Heatmaps de risco/impacto
- Lista de stakeholders críticos
- Plano de treinamento + cobertura
- Perfil cultural + gap
- Próximos passos

Biblioteca: `puppeteer` para renderizar página HTML como PDF, ou `react-pdf` para layout custom.

Botão "Gerar relatório" em `/projects/[id]/dashboard`. Async (job em background, e-mail quando pronto).

## Critérios de aceite do Sprint

- [ ] OCAI direto funcional (gestor preenche)
- [ ] OCAI survey funcional (distribuído por e-mail)
- [ ] Perfil cultural visualizado (radar)
- [ ] Análise narrativa gerada por IA
- [ ] Ajuste de severidade por cultura ativo (toggle por projeto)
- [ ] Leadership Console operacional
- [ ] Cross-system dashboard agregando 3 sistemas
- [ ] Relatório PDF gerável
- [ ] Caso de uso real: 1 projeto da CollabZ executa OCAI completo
- [ ] Documentação para sponsor (como ler o leadership console)
- [ ] **MVP do Collab Engine declarado pronto** 🎉

## Dependências

- Sprint 4 concluído
- XPROC com endpoint de listagem de processos não revisados
- SMR com endpoint de listagem de tarefas em atraso, riscos, problemas

## Riscos

- IA gerando análises culturais imprecisas — sempre apresentar como sugestão, com botão "Editar análise"
- Performance do bridge dashboard com muitos projetos — paginação e cache obrigatórios
- PDF generation custosa — async + queue

## Notas

Após Sprint 5, o Collab Engine entrega valor end-to-end: descoberta cultural → planejamento → execução → monitoramento → relatório executivo. **MVP suficiente** para uso interno da CollabZ e oferta a clientes selecionados.

Sprints 6+ são incremento de módulos (M6, M8-M16), refinamento, e preparação para escala (multi-region, observabilidade avançada, testes E2E expandidos).
