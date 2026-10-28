# AGENTS.md

Gastômetro Rolante: site estático que mostra quanto a Prefeitura de Rolante gasta e em quê, com dados do
Portal da Transparência. Irmão do [Impostômetro Rolante](https://github.com/filipesfbr/impostometro-rolante),
que é o modelo de estrutura. Visão geral, comandos e dados: `README.md`. Plano de trabalho: `docs/plano.md`.

## Regras que não podem quebrar

- **`docs/fonte-de-verdade.md` (R1–R9) manda.** Nada de estimativa, projeção ou contador por segundo
  (R1). Coleta só é publicada se, para cada mês e cada tipo, empenhado, liquidado e pago baterem ao
  centavo com o totalizador do portal (R2). Nenhum dado de credor ou do empenho individual é gravado
  (`nome`, `credor`, `fornecedor`, `descricaoLinha`…): a agregação é em memória (R8), e há teste e passo
  no `coleta.yml` para isso.
- Valores sempre em **centavos inteiros**; reais só na hora de formatar (`site/src/lib/format.ts`).
- O mês é o **mês do empenho**; pago e liquidado de meses passados crescem todo dia. Saldo a pagar é
  sempre `empenhado − pago`, nunca o campo `valorAPagar` (vem `0.0` em alguns tipos).
- API do portal: **nunca paginar** `Listar` (1 mês por chamada, `length=20000`), 1 chamada a cada 2 s,
  parâmetro vazio é string vazia (nunca o texto `null`).
- `jsonfiltros`: `mes` é **array de inteiros** (`"mes":[9]`); os tipos 5 (órgão) e 7 (vínculo) exigem
  `"orgao":"0"` ou `"vinculo":"0"` e `"dinamic":"0"`, senão a área vem vazia. O tipo 8 (subfunção) soma
  errado no portal e fica fora. `descricaoFuncao` vem com espaços à direita: sempre `trim`.
- Fixtures sintéticas, sem nomes de pessoas ou empresas.

## Identidade visual

Fonte de verdade em `docs/brand/gastometro-rolante/`. Cor só em `site/src/styles/tokens.css` (um único
acento: terracota, âmbar no escuro); sem sombras nem gradientes; fonte Inter local; marca só via
`BrandMark`/`BrandLockup`; texto pequeno nunca em `--accent` nem `--line-strong`. Exceção decidida com o
design: rótulos pequenos em caixa alta usam `--label` (apagado).

## Pipeline

Padrão do repositório [`workflow-test`](https://github.com/filipesfbr/workflow-test): leia o README de
lá antes de mudar `ci.yml`, `bump.yml` ou `release.yml`. As guardas (bump na `develop`, release que
nunca escreve na `main`, guarda de tag, sync que falha em conflito, `delete_branch_on_merge=false`)
seguram problemas reais.

Específico daqui: `coleta.yml` (06:47 de Brasília, meia hora depois do Impostômetro) commita na branch
`data` (nunca na `main`) e chama `deploy.yml`, porque push com `GITHUB_TOKEN` não dispara workflow.
**Nada é commitado nem enviado ao GitHub até o sistema estar pronto e com autorização do Filipe.**
