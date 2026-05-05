# Como trabalhar no Collab Engine usando o Claude Code

> **Antes de começar:** instale o Claude Code seguindo `INSTALL_CLAUDE_CODE.md`. Você já confirmou que tem instalado.

## Fluxo rápido (TL;DR)

```bash
cd collab-engine
claude
```

Depois diga: **"Trabalhe na issue 001 do sprint-1"**.

## Fluxo completo

### 1. Antes de começar uma sessão

Identifique qual sprint está ativo e qual issue você quer trabalhar:

```
docs/issues/
├── sprint-1/    ← comece aqui
├── sprint-2/
├── sprint-3/
├── sprint-4/
└── sprint-5/
```

Cada arquivo dentro do sprint é uma issue numerada. Comece pela `001-...md`, em ordem.

Abra o arquivo da issue **e leia inteiro** antes de pedir pro Claude Code trabalhar nela. Isso é fundamental — você precisa entender o que está sendo pedido pra revisar o trabalho dele depois.

### 2. Inicie a sessão

```bash
cd /caminho/para/collab-engine
claude
```

E peça:

> Pegue a issue 001 do sprint-1, em `docs/issues/sprint-1/001-...md`. Leia a issue, leia os ADRs e skills citados, e implemente seguindo os critérios de aceite. Pergunte se tiver dúvida antes de fazer mudanças que não estejam claras.

### 3. Acompanhe o trabalho

Claude Code vai:

- Listar arquivos e ler o que precisar (`view`, `bash` com `ls`, `find`, `grep`)
- Editar arquivos em pequenos commits
- Rodar comandos de validação (`pnpm typecheck`, `pnpm test`, `pnpm lint`)
- Comitar com mensagens descritivas
- Abrir Pull Request via GitHub CLI (`gh pr create`)

Você pode interromper a qualquer momento:

- "Pare. Por que está mexendo no arquivo X?"
- "Continue."
- "Refaça Z. Ficou diferente do que pedi."
- "Faça também Y."

### 4. Revise o resultado

Quando ele finalizar:

- Leia o diff: `git diff main`
- Confira os critérios de aceite da issue (estão dentro do arquivo da issue)
- Rode você mesmo: `pnpm test`, `pnpm dev`, abra o navegador
- Se tudo OK, mergeie o PR no GitHub
- Se houver problema, peça correção

### 5. Marque a issue como concluída

No topo do arquivo da issue, adicione:

```markdown
> **Status:** Concluída em DD/MM/AAAA. PR: #NN
```

E parta pra próxima.

## Regras importantes

### Uma issue por sessão (geralmente)

Não tente "fazer todo o sprint numa sessão". O contexto fica saturado, ele perde qualidade, vira retrabalho.

Se a issue for pequena e relacionada à anterior, dá pra emendar. Use `/compact` no meio da sessão se ficar longa demais.

### Quando interromper

Pare a sessão e questione se ele:

- Propor mudança grande fora do escopo da issue
- Citar tecnologias que não estão no stack (NestJS, Auth0, Redis Bull, etc.) — leia ADR-002 com ele
- Inventar entidade ou conceito que não existe nos ADRs/skills/issues
- Começar a "refatorar" coisas não pedidas
- Tentar instalar dependência grande sem justificar

### Quando deixar autônomo

Pode deixar trabalhando sozinho quando:

- Issue está bem definida
- Ele já entendeu o padrão (depois de fazer um Risco, fazer um Problema é trivial)
- É trabalho mecânico (CRUD baseado em modelo Prisma)

### Atualize a documentação quando algo mudar

Quando você toma uma decisão arquitetural nova ou descobre que uma antiga estava errada:

- Atualize `CLAUDE.md` se for decisão geral
- Crie um ADR novo em `docs/adr/` se for decisão arquitetural
- Marque ADR antigo como "Superseded by ADR-XXX" se aplicável
- Atualize skill em `.claude/skills/` se for convenção

Próximas sessões do Claude Code lerão o estado novo automaticamente.

## Troubleshooting

### "Ele está travado / lendo demais"

`Ctrl+C` interrompe a operação atual sem perder a sessão. Você pode redirecionar.

### "Ele saiu do trilho"

`/clear` limpa o contexto e começa fresca. Os arquivos do repo continuam lá; só a memória da sessão zera.

### "Ele propôs mudar coisa errada"

Lembre dos ADRs:

> "Espera. Você está propondo X, mas o ADR-002 diz Y. Releia o ADR e confirme se ainda quer fazer assim, e se sim, justifique."

### "Não sei se o que ele fez está correto"

Peça revisão crítica:

> "Revise o que você acabou de fazer com olho crítico. Onde pode ter problema? O que pode quebrar em produção? Liste 3 riscos."

Ou peça testes:

> "Escreva testes que cubram os cenários X, Y e Z. Rode e me mostre os resultados."

## Comandos úteis dentro do Claude Code

- `/help` — lista de comandos
- `/cost` — quanto a sessão está custando
- `/clear` — limpa contexto
- `/compact` — comprime histórico (útil em sessões longas)
- `/quit` — sair

## Anti-padrões a evitar

❌ "Implemente o Sprint 1 inteiro"
✅ "Trabalhe na issue 001"

❌ "Continua de onde parou ontem"
✅ "Pegue a issue 003 do sprint-1, leia o que já foi feito nas issues 001 e 002, e siga"

❌ Deixar ele trabalhar 2 horas sem revisão
✅ Revisar a cada PR/commit grande

❌ Ignorar os ADRs e skills
✅ Citar ADRs/skills relevantes na primeira mensagem da sessão

## Sessões típicas (exemplos)

### Sessão 1: setup inicial

> Sou Fabiano da CollabZ. Acabei de descompactar este pacote no repo.
> Quero que você:
> 1. Verifique a estrutura do repo (deve estar como descrito no CLAUDE.md)
> 2. Me ajude a inicializar git, criar o primeiro commit, e configurar conexão com GitHub
> 3. Configure o ambiente local (instalar deps, subir docker-compose, rodar prisma migrate dev)
> 4. Confirme que `pnpm dev` sobe sem erro
>
> Não comece a implementar features ainda. Só setup.

### Sessão 2: primeira issue

> Pegue a issue 001 do sprint-1. Leia inteira, leia os ADRs e skills citados.
> Não implemente ainda. Me diga o que entendeu, qual o plano de implementação,
> e quais perguntas você tem antes de começar.

### Sessão 3: continuação

> Implemente a issue 001 conforme o plano que conversamos.
> Faça em commits pequenos. Pause quando terminar cada arquivo principal pra eu olhar.
