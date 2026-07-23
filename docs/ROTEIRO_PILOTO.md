# Roteiro do Piloto CollabZ — Collab:Evolve

> Script ponta-a-ponta para validar o MVP com um projeto real da CollabZ.
> Executar em produção (Vercel + Supabase) com o tenant CollabZ.
> Ao final deste roteiro, o MVP pode ser declarado pronto.

## Pré-requisitos (uma vez)

| Item | Onde | Verificação |
|------|------|-------------|
| `RESEND_API_KEY` | Vercel → Environment Variables | Botão "Enviar convites" habilitado |
| `ANTHROPIC_API_KEY` | Vercel → Environment Variables | Análise IA do OCAI funciona |
| Usuário admin CollabZ | `/login` | Login ok |
| Deploy da main atual | Vercel | Build verde |

---

## Fase 1 — Cadastros básicos (15 min)

1. **Pessoas** (`/people`): cadastre 5–10 colaboradores reais **com e-mail válido**
   (os convites de treinamento e OCAI vão para esses endereços).
2. **Funções** (`/funcoes`): crie 2–3 funções (ex.: "Analista Fiscal", "Comprador")
   e vincule as pessoas ativas a cada uma.
3. **Projeto** (`/projects`): crie o projeto piloto (ex.: "Implantação ERP — Piloto").

**Critério de saída:** ao menos 1 função com ≥2 pessoas ativas vinculadas.

## Fase 2 — Stakeholders e Impactos (20 min)

1. Na página do projeto, cadastre **stakeholders** com posição (aliado/neutro/resistente)
   e influência — inclua ao menos 1 resistente para o console ter o que mostrar.
2. Cadastre **3+ impactos** com probabilidade × severidade variados:
   - 1 na zona vermelha (score ≥ 16) — vai aparecer em "Decisões pendentes";
   - os demais em zonas intermediárias.

**Critério de saída:** Leadership Console do projeto mostra saldo de stakeholders
e impactos abertos ≠ 0.

## Fase 3 — Treinamento (30 min)

Fluxo completo (ver `docs/TUTORIAL_TREINAMENTO.md` para detalhes):

1. **Gerar plano**: `/training/plans/new` → "Gerar automaticamente".
   Confirme que os itens refletem a matriz função × treinamento.
2. **Ajustar designações**: na página do plano, use **"Designar pessoa…"** no painel
   de pessoas para incluir alguém manualmente (badge "manual").
3. **Criar turma**: no item, clique **"+ Nova Turma"** — nome, datas (próximas),
   modalidade, local, capacidade e nota mínima (ex.: 70).
4. **Inscrever**: abra a turma → seção **"Inscrever pessoas"** → inscreva os designados.
5. **Instrutor**: vincule 1 instrutor na seção Instrutores.
6. **Convites**: clique **"Enviar convites"** — verifique recebimento nos e-mails reais.
7. **Presença e notas**: registre presença e notas de exame (uma abaixo da nota mínima,
   para validar reprovação) → **Encerrar turma**.
8. **Dashboard**: `/projects/[id]/training/dashboard` — cobertura deve refletir
   as conclusões (aprovados vs designados).

**Critério de saída:** cobertura > 0% no dashboard e no Leadership Console;
e-mails de convite recebidos.

## Fase 4 — Cultura (OCAI) (30 min + tempo dos respondentes)

1. **Criar avaliação**: `/cultura/new` → tipo **PROJETO**, vinculada ao projeto piloto.
2. **Ativar**: na página da avaliação (`/cultura/[id]`), mude o status para **Ativa**.
3. **Convidar**: `/cultura/[id]/convidar` → selecione os respondentes → enviar.
   Cada um recebe link único `/ocai/[token]` (não requer login).
4. **Responder**: cada convidado distribui 100 pontos entre as 4 culturas
   (Clã, Adhocracia, Mercado, Hierarquia) nas 6 dimensões, para Atual e Preferida.
5. **Encerrar**: com respostas suficientes (≥3), encerre a avaliação.
6. **Resultados**: `/cultura/[id]/resultados` — radar Atual × Preferida por dimensão
   e **análise IA** (requer `ANTHROPIC_API_KEY`).

**Critério de saída:** resultados com ≥3 respostas e análise IA gerada.

## Fase 5 — Visões executivas (15 min)

1. **Leadership Console** (`/projects/[id]/leadership-console`):
   - Selo de status coerente com os dados (provavelmente 🟡 Em Risco, pelo impacto vermelho);
   - 4 KPIs preenchidos (stakeholders, impactos, cobertura, ADKAR);
   - "Decisões pendentes" mostra o impacto de zona vermelha.
   - Abrir **no celular** — o console é mobile-first.
2. **ADKAR**: avalie 1–2 líderes do projeto para o KPI sair de "—".
3. **Portfolio** (`/portfolio`): projeto piloto listado com indicadores.
4. **Relatório PDF**: gere o relatório executivo na página do projeto.

**Critério de saída:** console coerente no celular; PDF gerado.

## Registro de problemas

Anote qualquer fricção durante o piloto (bug, texto confuso, passo não óbvio) como
issue em `docs/issues/` ou no GitHub. Critério de sucesso do piloto: **fluxo completo
sem bloqueio** — fricções de usabilidade são backlog, não bloqueio.

## Checklist final do MVP

- [ ] Fase 1–5 executadas sem bloqueio
- [ ] E-mails (convite treinamento + OCAI) entregues
- [ ] Análise IA do OCAI gerada
- [ ] Leadership Console validado em celular por um sponsor real
- [ ] Problemas registrados como issues

Quando tudo acima estiver marcado → **MVP declarado pronto**.
