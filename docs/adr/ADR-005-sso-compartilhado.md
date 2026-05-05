# ADR-005 — SSO Compartilhado entre SMR, XPROC e Collab Engine

**Status:** Aceito (implementação em Sprint 1)  
**Data:** 2026-05-04  
**Decisão por:** Fabiano Sannino (CollabZ)

## Contexto

Os três sistemas serão usados pelos mesmos usuários (consultores CollabZ + clientes da consultoria). Forçar login três vezes seria fricção desnecessária e gerador de erros (senhas diferentes, esquecimento, etc.).

## Decisão

**Cookie compartilhado no domínio raiz `.collabz.com.br`, JWT assinado com `jose` HS256, mesma JWT_SECRET nos três sistemas.**

## Arquitetura

### Domínios

- `smr.collabz.com.br` — SMR Projetos
- `xproc.collabz.com.br` — XPROC
- `collab.collabz.com.br` — Collab Engine

Domínio raiz: `.collabz.com.br` (com ponto na frente — RFC 6265).

### Cookie

Nome unificado: `collabz_session`

Atributos:
- `httpOnly: true` (proteção XSS)
- `secure: true` (apenas HTTPS em produção)
- `sameSite: 'lax'` (proteção CSRF mas permite navegação normal)
- `domain: '.collabz.com.br'` (válido em todos subdomínios)
- `maxAge: 8h`

### JWT payload

Estrutura **idêntica** nos três sistemas:

```typescript
{
  userId: string,      // UUID do usuário (mesmo ID nos três sistemas)
  tenantId: string,    // UUID do tenant
  email: string,
  role: UserRole,      // ADMIN, CHANGE_MANAGER, PROJECT_MANAGER, etc.
  iat: number,
  exp: number,
}
```

### Algoritmo

HS256 (symmetric). A mesma `JWT_SECRET` é mantida nos três sistemas, em variável de ambiente.

**Geração da secret:** mínimo 32 bytes aleatórios (256 bits). Em produção, gerada via:

```bash
openssl rand -base64 32
```

Armazenada em vault corporativo, não em repositório.

## Fluxo de login

1. Usuário acessa qualquer um dos três sistemas
2. Sistema redireciona para `auth.collabz.com.br` (centralizado) — opcional, alternativa abaixo
3. Auth service autentica e gera JWT com payload padronizado
4. Cookie `collabz_session` é set no domínio raiz
5. Browser inclui cookie automaticamente em qualquer subdomínio
6. Cada sistema, ao receber requisição, valida o cookie via `jose.jwtVerify` com a mesma secret

### Alternativa simplificada para MVP

Sem `auth.collabz.com.br` centralizado. Cada sistema tem sua tela de login, mas:

- Todos geram cookie com mesmos parâmetros
- Todos validam o cookie do outro (porque secret é a mesma)
- Resultado: usuário loga em qualquer um, está logado nos três

Vantagem: zero infra adicional. Desvantagem: três telas de login (mas usuário só vê uma vez por sessão de 8h).

**Para o MVP, adotamos a alternativa simplificada.**

## User database

Cada sistema tem sua tabela `User` própria. **Mas o ID e o email têm que coincidir.**

Estratégias possíveis:

### Estratégia 1: Replicação eventual

- Master: SMR Projetos (sistema mais antigo, com mais usuários)
- Replicação: webhook quando usuário é criado/atualizado no SMR → endpoint nos outros dois sistemas
- Conflitos: SMR sempre vence

**Adotada para MVP.**

### Estratégia 2: User Service centralizado (futuro)

- `auth.collabz.com.br` é fonte única
- SMR/XPROC/Collab consultam via API
- Mais limpo arquitetonicamente, mais infra

Adiada para Fase 2.

## Migração

### Estado atual

- SMR usa NextAuth com cookie `next-auth.session-token` em domínio do SMR
- XPROC usa `jose` com cookie `xproc_session` em domínio do XPROC
- Collab Engine: ainda não existe

### Para chegar ao SSO

1. **Sprint 1, Issue 003:** SMR migra de NextAuth para `jose`. Estrutura de cookie e payload alinhada.
2. **Sprint 1, Issue 004:** Domínios em produção configurados (subdomínios sob `collabz.com.br`).
3. **Sprint 1, Issue 005:** Cookie name unificado para `collabz_session` nos três.
4. **Sprint 1, Issue 006:** JWT_SECRET sincronizada via vault (não vai em código).
5. **Sprint 1, Issue 007:** Webhook de sync de User entre os três sistemas.

## Segurança

### Riscos

- **Compromisso da secret** invalida sessões em todos os três sistemas
- **Token roubado** vale em todos os três (não há scope por sistema no MVP)
- **Logout em um sistema** não invalida nos outros (limitação do JWT stateless)

### Mitigações

- Secret armazenada em vault, rotação anual
- Logout coordenado (blacklist de tokens em Redis ou tabela `RevokedTokens`) — adiado para Fase 2
- Tempo de vida curto (8h) limita janela de exposição
- Logs de acesso nos três sistemas para auditoria

### Para clientes regulados (ANVISA, ISO)

- Logout coordenado é requisito — pode adiantar implementação
- MFA obrigatório — adiantar implementação
- IP whitelist — configuração por tenant

## Consequências

### Positivas
- UX fluida (login uma vez, navega nos três)
- Simplicidade de implementação no MVP
- Reuso de stack `jose` já dominado no XPROC
- Caminho claro para evolução (User Service centralizado)

### Negativas
- Três tabelas User precisam permanecer sincronizadas (risco de drift)
- Logout não-coordenado é limitação para clientes muito regulados
- Compromisso de secret é catastrófico

### Reversibilidade

A qualquer momento podemos:
- Ativar `auth.collabz.com.br` centralizado (mudança de redirect, sem refator)
- Adotar Auth0/Keycloak/Okta (substituir geração/validação do JWT)
- Adicionar refresh tokens (extensão do payload)

## Referências

- RFC 6265 — HTTP State Management Mechanism (cookies)
- jose docs: https://github.com/panva/jose
- Skill `jose-auth` — implementação detalhada
- ADR-002 — stack unificado (justifica jose vs Auth0)
