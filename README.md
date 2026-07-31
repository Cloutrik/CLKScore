# CLKScore

Gera "scorecards" gamificados (SVG) com as metricas de contribuicao de cada
colaborador de uma organizacao do GitHub — commits, pull requests, PRs
mergeados, code reviews e issues — junto com nivel, barra de XP, sequencia
(streak) de dias contribuindo e conquistas (badges).

Um GitHub Action roda todas as noites, recalcula as metricas e commita os
SVGs atualizados de volta no repositorio, prontos para serem usados no
proprio perfil do GitHub de cada colaborador.

## O que e gerado

- `data/certificates/<login>.svg` — card completo (nivel, XP, stats, badges).
- `data/badges/<login>.svg` — versao compacta, tipo "badge" pequeno.
- `data/leaderboard.svg` — ranking dos top colaboradores da organizacao.
- `data/state.json` — estado acumulado (nao mexer manualmente); permite que
  cada execucao busque so o delta desde a ultima rodada, em vez de
  recalcular tudo do zero todos os dias.

## Como funciona o calculo

1. Na primeira execucao, para cada membro da organizacao, o script busca as
   contribuicoes desde `bootstrapStartDate` (em `config.json`) ate hoje,
   usando a API GraphQL do GitHub (`contributionsCollection` com
   `organizationID`, que já isola apenas contribuições feitas dentro da
   organização).
2. Nas execucoes seguintes, busca só o delta desde a última sincronização e
   soma aos totais acumulados em `data/state.json`.
3. Score = `commits*peso + PRs*peso + PRs mergeados*peso + reviews*peso + issues*peso`
   (pesos configuraveis em `config.json`).
4. Nivel segue uma curva de RPG (`xp_necessario = levelBase * nivel^2`).
5. Streak: incrementa se o colaborador teve qualquer contribuição na
   janela da última execução, zera caso contrário (funciona bem com cadência
   diária).
6. Badges: thresholds configuraveis em `config.json` (`mergeMaster`,
   `commitMachine`, `teamPlayer`, `issueTracker`, `streakDays`).

## Setup

### 1. Crie o repositorio no GitHub e suba este projeto

```bash
git init
git add .
git commit -m "chore: scaffold inicial do CLKScore"
git branch -M main
git remote add origin https://github.com/<sua-org-ou-usuario>/<repo>.git
git push -u origin main
```

### 2. Crie um token de acesso (PAT) com leitura da organizacao

O `GITHUB_TOKEN` automático do Actions só enxerga o próprio repositório —
para ler membros e contribuições da organização inteira você precisa de um
Personal Access Token à parte:

- Vá em **Settings → Developer settings → Personal access tokens**.
- Crie um **fine-grained token** (recomendado) com acesso de leitura a
  **Organization → Members** e aos repositórios da organização
  (`Contents: read`, `Pull requests: read`, `Issues: read`), ou um
  **classic token** com os escopos `read:org` e `repo` (ou `public_repo` se
  os repositórios forem públicos).
- No repositório deste projeto, vá em **Settings → Secrets and variables →
  Actions → Secrets** e crie o secret `ORG_SCORECARD_TOKEN` com o valor do
  token.

### 3. Configure o nome da organizacao

Em **Settings → Secrets and variables → Actions → Variables**, crie a
variavel `ORG_NAME` com o login da organizacao (ex: `minha-org`).

### 4. Rode manualmente para testar

Va em **Actions → Nightly Scorecard → Run workflow** para disparar a
primeira execucao sem esperar o cron. Depois disso ele roda sozinho todas
as noites (`.github/workflows/scorecard.yml`, cron `17 3 * * *` UTC — ajuste
o horario se quiser).

### 5. Teste local (opcional)

```bash
npm install
$env:ORG_NAME="minha-org"      # PowerShell
$env:GH_TOKEN="ghp_xxx"
node src/index.js
```

## Usando o card no perfil do GitHub

Depois da primeira execução, cada colaborador pode colar no proprio
`README.md` de perfil (repo `<usuario>/<usuario>`):

```markdown
![Meu scorecard](https://raw.githubusercontent.com/<org>/<repo>/main/data/certificates/<usuario>.svg)
```

A versão compacta (`data/badges/<usuario>.svg`) é útil para colar ao lado de
outros badges/shields no topo do README.

## Personalizando

- `config.json`: pesos do score, thresholds de badges, data de início do
  bootstrap, tamanho do leaderboard.
- `src/svg.js`: cores, layout e conteúdo dos cards.

### Marca d'água (logo da empresa)

Coloque o arquivo do logo (de preferência PNG ou SVG com fundo transparente)
em `data/cloutrik-logo.png` e ele é embutido automaticamente (como base64,
direto dentro do SVG — não depende de host externo) em baixa opacidade nos
cards, badges e no leaderboard. Configurável em `config.json`:

```json
"watermark": {
  "enabled": true,
  "path": "data/cloutrik-logo.png",
  "opacity": 0.1
}
```

Se o arquivo não existir, o script apenas avisa no console e segue sem a
marca d'água — não quebra a execução.

## Limitacoes conhecidas (v1)

- A API `contributionsCollection` conta contribuições em repositórios da
  organização às quais o token tem acesso; repositórios privados exigem que
  o PAT tenha permissão de leitura sobre eles.
- A contagem de PRs mergeados usa a Search API do GitHub, que tem um rate
  limit mais restrito — em organizações muito grandes (centenas de membros)
  pode ser necessário espaçar as execuções ou paralelizar com cuidado.
- O streak é calculado com base na cadência de execução do workflow (diária
  por padrão); se o cron for alterado para semanal, o conceito de "streak
  diário" deixa de fazer sentido e o threshold em `config.json` deveria ser
  ajustado.
