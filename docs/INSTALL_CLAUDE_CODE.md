# Como instalar o Claude Code

> Você mencionou que usa o **Claude aplicativo** (Claude.ai web/app). Esse é o lugar onde a gente conversou e desenhou tudo. Mas para **executar** o desenvolvimento do Collab Engine de forma autônoma, você precisa do **Claude Code**, que é uma ferramenta diferente.
>
> Claude Code é um agente que opera no seu sistema de arquivos (terminal), com acesso a bash, edição de arquivos e Git. Ele lê o `CLAUDE.md` deste repo e entende o contexto automaticamente.

## Passo 1 — Instalar Node.js

Se você ainda não tem:

```bash
# Verificar se já tem
node --version  # precisa ser 18 ou superior

# Se não tiver, instalar via nvm (recomendado)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
nvm use 20
```

## Passo 2 — Instalar Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

## Passo 3 — Autenticar

```bash
claude
```

Na primeira vez, abrirá uma página no navegador para você fazer login com sua conta Anthropic. Se você tem assinatura Claude Pro ou superior, o Claude Code está incluído.

## Passo 4 — Abrir o Collab Engine

```bash
cd /caminho/para/collab-engine
claude
```

Pronto. Claude Code lê o `CLAUDE.md` automaticamente, descobre as skills em `.claude/skills/`, e está pronto pra trabalhar.

## Como usar pra desenvolver o Collab Engine

### Fluxo padrão de uma sessão

1. Abra o terminal no diretório do repo
2. Execute `claude`
3. Diga algo como:
   > "Pegue a issue 001 do sprint-1 e implemente. Pergunte se tiver dúvida."
4. Ele vai:
   - Ler a issue completa
   - Ler ADRs e skills citados pela issue
   - Examinar código existente relevante
   - Implementar em pequenos commits
   - Rodar testes
   - Abrir um Pull Request via `gh pr create`
5. Você revisa o PR no GitHub e faz merge

### Cuidados importantes

- **Sempre comece sessões com objetivo claro** ("trabalhe na issue X") em vez de "faça progresso geral"
- **Revise os PRs** — Claude Code é muito capaz mas não é infalível
- **Se ele propuser mudança grande não solicitada**, pare e pergunte por quê. Pode estar inventando algo fora do escopo
- **Mantenha o CLAUDE.md atualizado** — quando uma decisão mudar, atualize o arquivo. A próxima sessão vai ler o estado novo automaticamente

### Quando algo der errado

Se uma sessão sair do trilho (ele começa a fazer coisas estranhas):

```bash
# No terminal do Claude Code
/clear

# Ou, em casos extremos, saia e abra de novo
exit
claude
```

Cada nova sessão lê o CLAUDE.md de novo e começa fresca. O contexto persistente está nos arquivos do repo, não na memória dele.

### Comandos úteis dentro do Claude Code

- `/help` — lista comandos disponíveis
- `/cost` — mostra quanto a sessão atual está custando (se você pagar por uso de API)
- `/clear` — limpa o contexto e começa de novo
- `/quit` — sai
- `/compact` — comprime o histórico da sessão (útil em sessões longas)

## Diferença entre Claude (app) e Claude Code

| Aspecto | Claude (app/web) | Claude Code |
|---------|------------------|-------------|
| Onde roda | Browser ou app desktop/mobile | Terminal do seu computador |
| O que faz | Conversa, design, planejamento | Executa tarefas no código |
| Acesso ao seu código | Não direto (você cola) | Direto (lê e edita arquivos) |
| Git | Não | Sim, abre PRs e comita |
| Persistência | Memória da conversa | Arquivos do repo + sessão |
| Quando usar | Pensar, planejar, tirar dúvida | Implementar, refatorar, debugar |

A gente usou o **Claude (app)** pra desenhar a arquitetura do Collab Engine. Daqui pra frente, **Claude Code** é quem vai construir.

## Se preferir não usar Claude Code

Você pode implementar tudo manualmente seguindo os arquivos em `docs/issues/sprint-N/`. Cada issue tem critérios de aceite claros. Mas vai demorar muito mais.
