<!-- l10n-sync: source-file="README.md" -->
🌐 [English](README.md) | [Español](README.es.md) | Português (Brasil) | [한국어](README.ko.md)

# 🎮 Mona Mayhem

**Workshop de VS Code e GitHub Copilot CLI** — Construa uma Arena de Batalha de Contribuições do GitHub

Um template de workshop para construir, com Astro, um site em estilo arcade retrô que compara os gráficos de contribuições do GitHub de dois usuários. Este é o **ponto de partida**: você vai construir o app passo a passo com o GitHub Copilot.

![Mona Mayhem Screenshot](https://github.com/user-attachments/assets/5eca79e2-cb9f-4e93-aa0d-23666ebde3b7)
*O que você vai construir ao final do workshop*

## 📚 Workshop

O workshop oferece duas trilhas — siga a que corresponde ao seu fluxo de trabalho preferido:

- **Trilha VS Code** — Chat, Plan Mode, Agent Mode, agentes em segundo plano e ciclos de revisão nativos do editor
- **Trilha CLI** — `copilot`, contexto com `@file`, `/plan`, edições autônomas, `/fleet`, `/delegate` e `/review`

| Parte | Título | Foco no Copilot |
|-------|--------|-----------------|
| [00](workshop/pt_BR/00-overview.md) | Visão Geral | Escolha da trilha e objetivos de aprendizado |
| [01](workshop/pt_BR/01-setup.md) | Configuração & Engenharia de Contexto | Instruções, permissões e configuração do ambiente |
| [02](workshop/pt_BR/02-plan-and-scaffold.md) | Planejar & Estruturar | Planejamento da API e da arquitetura de páginas |
| [03](workshop/pt_BR/03-agent-mode.md) | Construir o Jogo | Implementação e iteração agentic |
| [04](workshop/pt_BR/04-design-vibes.md) | Temas Design-First | Planejamento e implementação do design visual |
| [05](workshop/pt_BR/05-polish.md) | Polimento & Trabalho Paralelo | Paralelismo, revisões e ajustes de qualidade |
| [06](workshop/pt_BR/06-bonus.md) | Bônus & Extensões | Ideias de funcionalidades abertas e experimentos extras com o Copilot |

## 🚀 Início Rápido

1. **Crie primeiro o seu próprio repositório** de uma destas formas:
   - clicando em **Use this template** para criar um novo repositório, ou
   - fazendo um fork deste repositório.
2. Escolha o caminho do workshop:
   - **VS Code:** clone o repositório e abra-o no VS Code.
   - **GitHub Copilot CLI:** clone o repositório localmente, instale o `copilot` e trabalhe a partir do terminal.
3. Siga o [guia do workshop](workshop/pt_BR/00-overview.md)

## Pré-requisitos

### Comuns

- GitHub Copilot (Pro, Business ou Enterprise)
- Git
- Node.js

### Trilha VS Code

- VS Code v1.107+
- Extensão GitHub Copilot com login feito

### Trilha CLI

- GitHub Copilot CLI (`copilot`)
- Node.js 22+ se você pretende instalar o CLI com `npm install -g @github/copilot`
- Ou Homebrew / WinGet, se preferir instalar com um gerenciador de pacotes nativo

## Stack Tecnológica

- **Framework**: [Astro](https://astro.build/) v6
- **Runtime**: Node.js com adaptador [@astrojs/node](https://docs.astro.build/en/guides/integrations-guide/node/)
- **Fonte**: Press Start 2P (fonte de jogos retrô)
- **API**: API de gráfico de contribuições do GitHub

## Desenvolvimento e validação

```bash
npm ci
npm run dev
```

O servidor de desenvolvimento é executado em `http://localhost:4321`.

```bash
npm test
npm test -- src/lib/contributions.test.ts
npm test -- src/lib/contributions.test.ts -t "expires cached data"
npm run typecheck
npm run build
npm run preview
```

Os testes unitários usam Vitest, com requisições upstream simuladas (mocks) e relógios determinísticos.
O `typecheck` gera os tipos do Astro e verifica o código TypeScript; o `build` cria
a aplicação Node standalone.

## API de Contribuições

`GET /api/contributions/:username` busca no servidor os dados públicos de contribuições em
`https://github.com/{username}.contribs` e normaliza o formato JSON v2 do GitHub.
A interface da página de batalha ainda é apenas um ponto de partida.

```bash
curl -i http://localhost:4321/api/contributions/octocat
curl -i http://localhost:4321/api/contributions/bad_name
```

As respostas de sucesso têm este formato (valores ilustrativos):

```json
{
  "username": "octocat",
  "totalContributions": 3,
  "from": "2026-10-14",
  "to": "2026-10-14",
  "days": [
    { "date": "2026-10-14", "count": 3, "level": 1 }
  ]
}
```

As datas são inclusivas e derivadas em UTC, no formato `YYYY-MM-DD`. Os dias são ordenados
cronologicamente; as contagens são inteiros não negativos e os níveis variam de 0 a 4.
Os nomes de usuário não diferenciam maiúsculas de minúsculas e são retornados em minúsculas. Devem conter
de 1 a 39 letras ASCII, dígitos ou hifens, sem hifens no início, no fim ou consecutivos.

Os erros retornam `{"error":"Human-readable message","code":"STABLE_ERROR_CODE"}`:

| Status HTTP | Código | Significado |
| --- | --- | --- |
| 400 | `INVALID_USERNAME` | Nome de usuário inválido |
| 404 | `USER_NOT_FOUND` | O usuário do GitHub não existe |
| 502 | `UPSTREAM_ERROR` | Falha de rede ou outro status/redirecionamento inesperado do upstream |
| 502 | `INVALID_UPSTREAM_DATA` | JSON inválido, schema/conteúdo não suportado, dados inconsistentes ou corpo grande demais |
| 503 | `UPSTREAM_UNAVAILABLE` | Limitação (throttling) do GitHub ou falha do servidor upstream |
| 503 | `SERVICE_BUSY` | Todos os slots do cache local têm requisições em andamento |
| 504 | `UPSTREAM_TIMEOUT` | A requisição ao GitHub excedeu dez segundos |
| 500 | `INTERNAL_ERROR` | Falha interna inesperada |

Cada requisição upstream tem um prazo de dez segundos, incluindo o consumo do corpo, e
um limite de 1 MiB para o corpo. As requisições não são repetidas e os redirecionamentos não são seguidos.

Os sucessos validados ficam em cache por cinco minutos após a conclusão da busca.
O cache local do processo guarda no máximo 500 nomes de usuário, incluindo requisições
em andamento; requisições simultâneas para o mesmo nome de usuário compartilham uma única busca.
As entradas expiradas são removidas antes de as entradas concluídas menos usadas recentemente
serem descartadas. As falhas não são armazenadas em cache e resultados desatualizados nunca são servidos. O cache
é zerado na reinicialização e não é compartilhado entre instâncias do servidor. As respostas HTTP
usam `Cache-Control: no-store` para que navegadores/CDNs não adicionem um cache separado.

## Notas de Implantação

### Configuração atual do GitHub Pages

O workflow em `.github/workflows/deploy.yml` atualmente implanta no GitHub Pages o conteúdo estático do workshop/docs de `docs/` e `workshop/`. Ele não compila nem implanta o app Astro de `src/`.

### Implantação da aplicação Astro

O proxy de contribuições precisa de um servidor em tempo de execução (runtime). Mantenha a saída de servidor e o
adaptador Node standalone, compile com `npm run build` e execute
`node dist/server/entry.mjs` em um host Node. `HOST` e `PORT` controlam o
endereço de escuta.

O GitHub Pages não consegue hospedar esta aplicação sem alterações. Uma implantação
somente estática exigiria remover a API de contribuições ou movê-la para um backend separado
e adaptar o cliente antes; alterar apenas a saída do Astro não é suficiente.

## Licença

MIT
