# Plano — Gastômetro Rolante

> Versão de 27/10/2026. Documento para retomar o trabalho do zero, sem contexto anterior.
> Irmão do [Impostômetro Rolante](https://github.com/filipesfbr/impostometro-rolante)
> (local: `~/Documents/dev/impostometro-rolante`): o Impostômetro mostra quanto entra, e o Gastômetro mostra
> quanto sai e para onde.

---

## Situação em 27/10/2026 (fim do dia)

- **Fases 1 a 7 prontas localmente, nada commitado.** `npm run lint`, `npm test` (20 testes) e `npm run build`
  passam. Coleta real (`npm run coletar`, ~15 min): 22 de 22 meses conferem nos 4 tipos; 2026 até 27/10 pago
  R$ 100.981.098,46, igual ao card do portal. Varredura R8 em `data/` e `site/dist/` limpa.
- Site conferido no navegador (claro/escuro do sistema, 390 px sem rolagem horizontal). Links "conferir no
  portal" testados, inclusive `tipo-despesa=10` (todas) para o total.
- **Falta só a fase 8** (primeira publicação), que depende de autorização.
- **28/10/2026, layout próprio** (pedido do Filipe: diferenciar do Impostômetro no mesmo design system):
  topo «Para onde foram os R$…» com a barra «de cada R$ 100 pagos»; caminho do dinheiro em 3 etapas na
  horizontal; bloco da **folha de pagamento** (custo do ano empenhado, pago, por habitante, comparação e
  tabela mês a mês), somando os elementos de pessoal da Portaria 163/2001 (`config/folha.json`, R6); as 4
  listas de áreas viraram uma seção só, «Para onde vai o dinheiro», com abas e mapa de blocos (treemap).
  A seção «Por habitante» saiu: o valor por habitante foi para o topo, a folha e o detalhe de cada área.
  «Arrecadou × gastou» continua para depois (depende do CORS do site do Impostômetro).
- Ajustes em relação ao texto abaixo: `totais/{ano}.json` usa `{ e, l, p, por_mes }`; `site.json` traz também
  `codigos`; o `anterior` do resumo traz `funcao` e `elemento`; os PNG foram gerados com o Chrome headless
  (seção 11.7).

---

## 0. Regras de trabalho (ler antes de tudo)

- **Não commitar nem dar push até o sistema inteiro estar pronto e revisado.** O repositório é público
  e o histórico não pode ficar sujo. Desenvolver tudo localmente em `~/Documents/dev/gastometro-rolante`; o
  primeiro commit só sai com autorização explícita do Filipe.
- O repositório já existe no GitHub: https://github.com/filipesfbr/gastometro-rolante, público, MIT, com um
  único commit `Initial commit` (só o `LICENSE`) na `main`. Já foram aplicados `delete_branch_on_merge=false`
  e `allow_rebase_merge=false`.
- Planos e respostas em português (PT-BR).
- O Impostômetro é o **modelo**: copiar a estrutura e adaptar. Não criar pacote compartilhado entre os dois repositórios.
- A **identidade visual e o logo chegaram do Claude Design** em `design_handoff_gastometro_rolante/` (raiz do
  repositório, ainda fora do git). Ver a seção 11: a pasta é movida para `docs/brand/` e não é commitada como está.

---

## 1. Objetivo

Site estático que mostra quanto a Prefeitura de Rolante/RS gastou no ano, **por área** (saúde, educação,
administração…), por secretaria, por tipo de gasto e por origem do recurso, mês a mês e por habitante. Os
dados vêm do Portal da Transparência, coletados todo dia por uma GitHub Action.

Mesmas garantias do Impostômetro:
- nada de estimativa, projeção ou contador por segundo;
- soma conferida ao centavo com o portal antes de publicar;
- link para conferir cada número no portal;
- **nenhum nome de pessoa ou empresa dentro da aplicação**.

---

## 2. Decisões tomadas (27/10/2026)

| # | Decisão |
|---|---|
| D1 | **Só agregados por área.** Nenhum nome, CPF, CNPJ, credor, fornecedor ou histórico do empenho é gravado. Ranking de fornecedores fica fora. |
| D2 | **Anos: corrente e anterior** (hoje 2025 e 2026), igual ao Impostômetro. Dois anos antes (hoje 2024) entra só na folha: dele se coleta só o tipo 2 (elemento), 12 chamadas a mais por dia. |
| D3 | **Despesas orçadas (tipo 0): investigar depois.** Fora da v1. |
| D4 | **Semântica do portal na v1**: o mês é o **mês do empenho**, e liquidado e pago são o estado atual desses empenhos. O site explica isso em texto. "Pago no mês" no sentido de caixa fica para depois (seção 12). |
| D5 | **Número principal: pago.** Empenhado e liquidado aparecem como detalhe ("comprometido → entregue → pago"). |
| D6 | Nome: **Gastômetro Rolante**. Repositório `filipesfbr/gastometro-rolante`. Site em `https://filipesfbr.github.io/gastometro-rolante/`. |
| D7 | Só a **Prefeitura** (entidade `0`). A Câmara fica de fora, como no Impostômetro. |

---

## 3. A API de despesas do portal (verificado em 27/10/2026)

Achada no JS do portal: `https://transparencia.abase.com.br/js/services/DespesasService.js` e
`/js/pages/Usuario/despesas.js`. O Swagger público (`apitransparencia.abase.com.br/swagger`) está com a spec
padrão do petstore e não serve.

- Base: `https://apitransparencia.abase.com.br/`
- Token: `apvqyIT7vjY=`
- Entidade: `0` (Prefeitura)

### Endpoints

| Endpoint | Método | Parâmetros | Papel |
|---|---|---|---|
| `Usuario/Despesas/ListarValores` | GET | `token`, `jsonfiltros` | **Totalizador** (os 4 cards do portal): `valorEmpenhado`, `valorLiquidado`, `valorPago`, `valorAPagar`. Envelope `{"status":"success","data":[{...}]}` |
| `Usuario/Despesas/Listar` | POST (form-urlencoded) | `token`, `jsonfiltros`, `draw=1`, `start=0`, `length=20000` | **Detalhe**: um registro por empenho. Envelope `{"status":true,"recordsTotal":N,"recordsFiltered":N,"draw":1,"data":[...]}` |
| `Usuario/Despesas/GraficoMensalDespesas` | GET | `token`, `jsonfiltros` | Gráfico mensal do portal. Não testado; pode servir de conferência extra |
| `Usuario/Despesas/ListaFuncoes`, `ListaOrgaos`, `ListaVinculos` | GET | `token` | Tabelas código → nome. ✅ Testadas (seção 6.1); usadas no link do R4 por área |
| `Usuario/Despesas/ListaSubFuncao`, `ListaUnidadesOrcamentaria` | GET | `token` | Não testadas; fora da v1 |

### `jsonfiltros`

É uma string JSON. Exemplo: `{"entidade":"0","tipo":"4","ano":"2026","mes":[9]}`

- **`mes` é array de inteiros.** Mandar string dá `Error converting value "9" to type 'System.Int32[]'`.
- **Sem `mes`** = ano inteiro (só para o totalizador; o detalhe é sempre 1 mês por chamada, como no Impostômetro).
- `tipo` escolhe a visão. Cada tipo preenche **um** campo de área e deixa os outros `null`:

| tipo | Visão | Filtros extras obrigatórios | Campo de área no `Listar` | Status |
|---|---|---|---|---|
| 10 | Todas | — | (nenhum útil; `programaDesc`) | base para o total |
| **4** | **Por função** | — | `descricaoFuncao` (**com espaços à direita: fazer `trim`**) | ✅ R2 ok |
| **2** | **Por elemento** | — | `descricaoElemento` | ✅ R2 ok |
| **5** | **Por órgão** | `"orgao":"0","dinamic":"0"` | `descricaoOrgao` | ✅ R2 ok |
| **7** | **Por recurso vinculado** | `"vinculo":"0","dinamic":"0"` | `descricaoVinculo` | ✅ R2 ok |
| 8 | Por subfunção | `"subFunc":"0","dinamic":"0"` | `subFuncao` | ❌ **valores errados**: soma R$ 183,8 mi num mês de R$ 7,8 mi, e o `ListarValores` repete o erro. **Fora da v1.** |
| 0 | Orçadas | (precisa de `orgao`?) | — | ❌ HTTP 400 sem filtro. **D3: depois** |
| 3, 6, 9, 11, 1 | Fornecedor, programa, unidade, resumo por fornecedor, extra-orçamentária | — | — | fora do escopo (D1) |

Sem os filtros extras, os tipos 5 e 7 voltam com `descricaoOrgao` e `descricaoVinculo` vazios.

### Campos do registro de `Listar`

`codigo, codigoModalidade, descricaoModalidade, empenho, credor, nome, data, valorEmpenhado, valorLiquidado,
valorPago, valorAPagar, valorOrcado, valorSuplemento, valorReducao, valorAtualizado, ano, ung, codigolicitacao,
tipoEmpenho, tipoLicitacao, numeroLicitacao, rubrica, descricaoRubrica, elemento, descricaoElemento, orgao,
descricaoOrgao, descricaoUnidade, vinculo, funcao, subFuncao, descricaoFuncao, descricaoProjeto, programa,
programaDesc, projeto, fornecedor, descricaoVinculo, unidadeO, descricaoLinha, especificacao, descricaoOrcada,
movimentacoesEmpenho, itensEmpenho, retencoes, anexos, pagamentosEmpenho, tp_Ordem_Pagamento_Cronologica`

- `data` = **data do empenho** (`"2026-09-01T00:00:00"`).
- Valores em reais (número com casas decimais). Converter com `centavos()` do Impostômetro (`Math.round(v * 100)`).
- **Dados pessoais** (nunca gravar): `nome` (credor; muitos são pessoas físicas, e alguns vêm com CPF ou CNPJ
  no texto), `credor` (id), `fornecedor`, `descricaoLinha` (histórico livre do empenho, que pode citar pessoas),
  `especificacao`, `itensEmpenho`, `pagamentosEmpenho`, `retencoes`, `anexos`, `movimentacoesEmpenho`.

### Testes feitos

| Consulta | Linhas | Soma == `ListarValores` (empenhado, liquidado, pago) |
|---|---|---|
| 2026/09, tipos 10, 4, 2, 5, 7 | 963 cada | ✅ ao centavo (pago R$ 7.781.522,67) |
| 2025/01, tipo 4 | 978 | ✅ (pago R$ 15.139.299,41) |
| 2025/12, tipo 4 | 1.512 | ✅ (pago R$ 12.413.508,93) |
| 2026 ano inteiro (`ListarValores`, sem `mes`) | — | empenhado R$ 124.211.165,88 · liquidado R$ 102.252.404,86 · pago R$ 100.981.098,46 (igual ao card do portal) |

- Todos os tipos devolvem os **mesmos 963 empenhos**: muda só qual campo de área vem preenchido.
- `valorAPagar` do `ListarValores` vem `0.0` em alguns tipos. O portal calcula `empenhado − pago` no JS.
  **Usar sempre `empenhado − pago`**, nunca o campo.
- Exemplo de funções em 2026/09 (pago, centavos): Educação 354.719.567 · Saúde 125.194.922 · Encargos Especiais
  98.531.828 · Administração 83.716.384 · Transporte 29.717.749 · Assistência Social 27.845.268 · Desporto e
  Lazer 19.134.986 · Agricultura 17.512.966 · Urbanismo 17.035.047 · Segurança Pública 2.715.100 · Cultura 2.028.450.

### Reproduzir um teste

```bash
A=https://apitransparencia.abase.com.br/; T='apvqyIT7vjY='
J='{"entidade":"0","tipo":"4","ano":"2026","mes":[9]}'
curl -s -G "${A}Usuario/Despesas/ListarValores" --data-urlencode "token=$T" --data-urlencode "jsonfiltros=$J"
sleep 2
curl -s -X POST "${A}Usuario/Despesas/Listar" --data-urlencode "token=$T" --data-urlencode "jsonfiltros=$J" \
  -d draw=1 -d start=0 -d length=20000 -o listar.json
```

### Cuidados herdados do Impostômetro (`coletor/src/api.ts`)

- **1 chamada a cada 2 s.** Acima disso o portal responde 429/403 com reCAPTCHA. Nesses casos, esperar 30 s, 60 s e 90 s.
- **Nunca paginar**: 1 mês por chamada, `length=20000`, e conferir `data.length === recordsTotal`.
- Parâmetro vazio vai como string vazia, nunca como o texto `null` (no Receitas, `null` zera os totais).
- User-Agent identificável: `GastometroRolante/1.0 (+https://github.com/filipesfbr/gastometro-rolante)`.
- Envelope: `status` pode ser `"success"` ou `true`. Os dois valem; qualquer outro valor é erro.

---

## 4. Fonte de verdade (`docs/fonte-de-verdade.md` do Gastômetro)

Copiar `impostometro-rolante/docs/fonte-de-verdade.md` e adaptar:

| Regra | Gastômetro |
|---|---|
| **R1** | Igual: só valor do portal, ou soma ou divisão simples (por habitante, % do total). Proibido estimar. |
| **R2** | Para **cada mês e cada tipo coletado** (4, 2, 5, 7): `soma(empenhado)`, `soma(liquidado)` e `soma(pago)` == `ListarValores` do mês (tolerância R$ 0,01). E o `ListarValores` do ano == soma dos meses. **Se um mês ou tipo falhar, a coleta inteira não é publicada.** |
| **R3** | Igual: snapshot na branch `data`, agregado e sem dados pessoais, com hash SHA-256 por arquivo no `manifest.json`. |
| **R4** | Cada número com link para `https://transparencia.abase.com.br/despesas/apvqyIT7vjY=` já filtrado (seção 6). |
| **R5** | Histórico de alterações **adaptado** (seção 5.4): pago e liquidado crescem todo dia por natureza (D4), então o histórico registra só **mudança de empenhado em mês já coletado** (anulação, empenho retroativo) e **queda de pago** (estorno). |
| **R6** | As áreas são as **classificações oficiais** que o portal já publica (função de governo pela Portaria MOG 42/1999, elemento de despesa, órgão, fonte de recurso). Nenhum agrupamento nosso. O nome vem do portal, só com `trim`. |
| **R7** | Igual: só a Prefeitura. |
| **R8** | **Mais duro**: nenhum dado de credor ou do empenho individual é gravado (lista na seção 3). A coleta agrega por `(data, área)` **em memória**, antes de gravar. Há teste unitário e passo no `coleta.yml` que falha se aparecer `"nome"`, `"credor"`, `"fornecedor"` ou `"descricaoLinha"` em `data/`. |
| **R9** | SICONFI (despesa por função, RREO anexo 2): **depois**. Fora da v1. |

Texto público ("De onde vêm os números") deve explicar D4 em linguagem simples, por exemplo: *"O mês de cada
gasto é o mês em que a prefeitura assumiu o compromisso (o empenho). O valor pago mostra quanto desse
compromisso já foi pago até hoje, por isso meses anteriores ainda podem crescer."*

---

## 5. Coletor

### 5.1 Estrutura (copiar de `impostometro-rolante/coletor/`)

| Arquivo | O que fazer |
|---|---|
| `api.ts` | Copiar `chamar()` como está. Trocar os métodos por `listarDespesas(ano, mes, tipo)` (POST `Listar`) e `totalizador(ano, mes?)` (GET `ListarValores`, tipo 10). Montar `jsonfiltros` com `mes: [mes]` e os filtros extras dos tipos 5 e 7. |
| `tipos.ts` | `Linha` com só os campos usados (`data`, `valorEmpenhado`, `valorLiquidado`, `valorPago` e o campo da área). Dados pessoais ficam fora do tipo; o comentário explica por quê (R8). |
| `agregar.ts` | Somar por `(data, área)` → `{ d, a, e, l, p }` em centavos. Descartar o resto. |
| `validar.ts` | Validar 3 somas (e, l, p) contra o totalizador. |
| `diff.ts` | Adaptar à regra R5 do Gastômetro (seção 5.4). |
| `ibge.ts` | Copiar igual. Copiar também `config/populacao-ibge.json`. |
| `resumo.ts` | Reescrever para o `site.json` (seção 5.3). |
| `coletar.ts` | Mesmo fluxo: coletar tudo → validar → se ok, gravar → diff → resumo → manifest. |
| `classificar.ts` e `checks/categorias.check.ts` | **Não copiar**: não há tabela código → categoria (R6 usa a área oficial). |

### 5.2 Fluxo de uma coleta

```
para ano em [anoAtual-1, anoAtual]:
  para mes em 1..(12 ou mês atual):
    tot = totalizador(ano, mes)                  # 1 chamada
    para (dimensao, tipo) em [(funcao,4), (elemento,2), (orgao,5), (vinculo,7)]:
      linhas = listarDespesas(ano, mes, tipo)    # 1 chamada
      validar(linhas, tot)                       # R2
      agregados[dimensao] += agregar(linhas, campoDaArea[dimensao])
  totAno = totalizador(ano)                      # confere soma dos meses
```

Volume: 22 meses × 5 chamadas + 2 + 3 tabelas de código (seção 6.1) ≈ 115 chamadas × (2 s + resposta) ≈ **6–10 min**. O timeout do job deve ser 30 min.

A coleta roda às **06:47 de Brasília** (`cron: '47 9 * * *'`), meia hora depois do Impostômetro, para os dois
não baterem juntos no portal.

### 5.3 Arquivos na branch `data`

```
despesas/{ano}-{dimensao}.json   # [{ "d":"2026-09-01", "a":"Educação", "e":123, "l":100, "p":90 }, ...] uma linha por objeto
despesas/{ano}-{dimensao}.csv    # data;area;empenhado_reais;liquidado_reais;pago_reais
totais/{ano}.json                # { empenhado, liquidado, pago, por_mes: { "1": {e,l,p}, ... } }
populacao.json
codigos.json                     # nome da área → código do portal, para o link do R4 (seção 6.1)
historico-alteracoes.json
site.json                        # resumo que o site lê
manifest.json                    # coletado_em, validação por ano/mês/tipo, hash de cada arquivo
```

`dimensao` ∈ `funcao`, `elemento`, `orgao`, `vinculo`.

`site.json` (rascunho do tipo `Resumo`):

```ts
type Valores = { e: number; l: number; p: number };            // centavos
type ResumoDimensao = Record<string, Valores & { por_mes: (Valores | null)[] }>;
type ResumoAno = {
  ano: number; ate: string; mes_parcial: number | null;
  total: Valores; por_mes: (Valores | null)[];
  funcao: ResumoDimensao; elemento: ResumoDimensao; orgao: ResumoDimensao; vinculo: ResumoDimensao;
  anterior: null | { ate: string; total: Valores; funcao: Record<string, Valores> };  // mesmo período do ano anterior
};
type Resumo = {
  versao: 1; coletado_em: string; ultimo_empenho: string;
  fonte: { portal: string; portalDespesas: string; entidade: number; repositorio: string };
  populacao: Record<string, number>;
  validacao: { meses_ok: number; meses_total: number };
  historico: Alteracao[];
  anos: Record<string, ResumoAno>;
};
```

### 5.4 Histórico de alterações (R5)

Comparar o snapshot novo com o anterior **por (ano, mês, função)**, só em meses que a coleta anterior já
cobria por completo:
- `empenhado` mudou → alteração (anulação ou empenho com data retroativa).
- `pago` caiu → alteração (estorno).
- `pago` ou `liquidado` subiu → **normal, não registra**.

Formato: `{ detectado_em, ano, mes, area, campo: 'e' | 'p', antes, depois }`.

### 5.5 Testes (`coletor/test/`)

- Fixture `despesas-mes.json` **sintética**: poucos empenhos, nomes trocados por `"X"` ou removidos. Nunca usar uma resposta real com nomes.
- Agregação soma certo e com `trim` na área.
- `validar` reprova quando qualquer uma das 3 somas diverge em 1 centavo.
- **R8**: a saída do `agregar` e os arquivos gravados não contêm `nome`, `credor`, `fornecedor` nem `descricaoLinha`.
- `diff` registra empenhado alterado e pago em queda, e ignora pago em alta.
- `api` recusa resposta com `data.length !== recordsTotal` e manda `mes` como array.

---

## 6. Link "conferir no portal" (R4)

A tela de Despesas aplica filtros pela URL. Testado: `?entidades=0&tipo-despesa=5&ano=2026&mes=9` abriu
setembro de 2026 por órgão, com os cards iguais à API.

```
https://transparencia.abase.com.br/despesas/apvqyIT7vjY=?entidades=0&tipo-despesa=4&ano=2026&mes=9
```

- Parâmetros = `id` dos campos da tela: `entidades`, `tipo-despesa`, `ano`, `mes`, `dia-mes`, `funcao`,
  `orgao`, `vinculo`.
- Sem `mes` = ano inteiro (testado: Saúde 2026 bateu com o `ListarValores` do ano).

### 6.1 Link por área (verificado em 27/10/2026)

Para filtrar **uma** área (ex.: só Saúde), o link precisa do **código**. O `Listar` traz os campos `funcao`,
`orgao` e `vinculo`, mas eles vêm `null` (2025/01, tipos 4, 5 e 7). O código vem das tabelas:

| Endpoint (GET, só `token`) | Registros | Campos |
|---|---|---|
| `ListaFuncoes` | 29 | `codigo`, `descricao` (**com espaços à direita**), `ano: 0` |
| `ListaOrgaos` | 11 | `codigo`, `descricao`, `ano: 0` |
| `ListaVinculos` | 94 | `codigoVinculo`, `descricaoVinculo`, `anoVinculo: 0`, `prefeitura` |

As tabelas não aceitam ano: o portal também as chama só com `token` (`js/services/DespesasService.js`).

Testado no navegador, com cards iguais aos do `ListarValores` filtrado pelo mesmo código:

| Link | Pago |
|---|---|
| `?entidades=0&tipo-despesa=4&ano=2026&mes=9&funcao=10` (Saúde) | R$ 1.251.949,22 ✅ |
| `?entidades=0&tipo-despesa=5&ano=2026&mes=9&orgao=3` (Gestão Administrativa) | R$ 350.716,79 ✅ |
| `?entidades=0&tipo-despesa=7&ano=2026&mes=9&vinculo=500` (Não vinculados de impostos) | R$ 3.907.065,53 ✅ |
| `?entidades=0&tipo-despesa=4&ano=2026&funcao=10` (Saúde, ano inteiro) | R$ 21.658.057,12 ✅ |

A tela lê a URL em `getParametrosInput()` (`js/core/functions.js`): cada `nome=valor` vira `$('#nome').val(valor)`,
depois de as opções serem carregadas. Na API, o mesmo filtro é `"funcao":"10"`, `"orgao":"3"` ou `"vinculo":"500"`.

Cobertura nome → código (nomes do `Listar` com `trim`, contra as tabelas):

| Dimensão | 2025/01 | 2025/12 | 2026/09 |
|---|---|---|---|
| função | 13/13 | 13/13 | 11/11 |
| órgão | 9/9 | 9/9 | 9/9 |
| vínculo | **3/18** | **5/21** | 20/20 |

- **Vínculo de ano anterior não tem código**: a tabela só traz os vínculos do ano corrente, e o próprio portal não
  consegue filtrar «FUNDEB 30%» de 2025. Esses ficam com link sem filtro de área.
- **Elemento (tipo 2) não tem filtro de área** na tela: só `rubrica`, que é mais fino. Link sem filtro de área.
- `ListaVinculos` tem 1 nome repetido (um vínculo de COVID-19). Nome repetido = link sem filtro de área.

Regra do coletor: a cada coleta, baixar as 3 tabelas (3 chamadas a mais) e gravar `codigos.json` na branch `data`:
`{ funcao: { "Saúde": 10, ... }, orgao: {...}, vinculo: {...} }`, já com `trim` e sem os nomes repetidos. O site
monta o link com o código quando o nome existe; senão, monta o link da visão do tipo, no mesmo mês ou ano, sem
o filtro de área.

---

## 7. Site

Copiar a casca de `impostometro-rolante/site/`: Vite + React 19 + TypeScript strict, página única com
âncoras, plugin `dados()` do `vite.config.ts` (serve `/data` em `./dados/`), `useDados`, `format.ts` (com
testes), `compare.ts`, `ui.tsx`, `Graficos.tsx` (barras, acumulado, mês a mês), `Topo.tsx` e `main.tsx`.
Valores sempre em centavos inteiros; reais só ao formatar.

Seções:

1. **Topo/Hero**: pago no ano, com a data do último empenho e da coleta (R4). Variação contra o mesmo
   período do ano anterior.
2. **Do compromisso ao pagamento**: empenhado → liquidado → pago, e quanto falta pagar (`e − p`). Texto curto
   explicando os 3 termos.
3. **Por área (função)**: barras ordenadas por pago, com % do total, por habitante e variação contra o ano
   anterior. Clique numa área abre o mês a mês dela.
4. **Por secretaria (órgão)**: nomes de secretarias mudam entre anos (ex.: "SAUDE E MEIO AMBIENTE" × "SAÚDE");
   **não comparar com o ano anterior** nesta seção, só mostrar o ano.
5. **Por tipo de gasto (elemento)**: pessoal, material, serviços de terceiros, obras…
6. **De onde vem o recurso (vínculo)**: recursos livres × saúde (SUS) × educação (FUNDEB, PNAE)…
7. **Mês a mês** e **acumulado**, com comparação com o ano anterior.
8. **Por habitante** (IBGE).
9. **De onde vêm os números**: texto da seção 4 (incluindo D4), validação da última coleta, downloads JSON e
   CSV, histórico de alterações.

Rodapé: site independente, sem vínculo com a prefeitura; link para o Impostômetro.

v2: **Arrecadou × gastou**, lendo `https://filipesfbr.github.io/impostometro-rolante/dados/site.json`
(conferir CORS do GitHub Pages) ou copiando no build.

---

## 8. Pipeline e repositório

Padrão do [`workflow-test`](https://github.com/filipesfbr/workflow-test). **Ler o README de lá antes** de
copiar `ci.yml`, `bump.yml` e `release.yml`.

Copiar de `impostometro-rolante/` e trocar nomes e URLs:

- `.github/workflows/`: `ci.yml`, `bump.yml`, `release.yml`, `deploy.yml` (igual), `coleta.yml` (cron
  `47 9 * * *`, `timeout-minutes: 30`, passo R8 com grep de `"nome"|"credor"|"fornecedor"|"descricaoLinha"` em `data/`).
- `.github/dependabot.yml`, `.github/pull_request_template.md`.
- `scripts/bootstrap-repo.sh` (rodar com `filipesfbr/gastometro-rolante` **depois** do primeiro push).
- `package.json` (nome `gastometro-rolante`, versão `0.1.0`; sem o script `checks`), `tsconfig.json`,
  `eslint.config.mjs`, `vitest.config.ts`, `.gitignore` (com `/data/`).
- `config/fonte.json`: `api`, `portal`, `portalDespesas` (`https://transparencia.abase.com.br/despesas/apvqyIT7vjY=`),
  `token`, `entidade: 0`, `ibge: "4316006"`, `repositorio`, `userAgent`, `intervaloMs: 2000`.
- `AGENTS.md`: mesmo formato do Impostômetro (regras R1–R9, centavos, API, identidade visual, pipeline),
  trocando `nome` por "dados de credor" e acrescentando os pontos da seção 3 (`mes` em array, filtros extras
  dos tipos 5 e 7, subfunção quebrada).
- `README.md`: mesmo formato (badge, o que é, o que tem, como funciona com mermaid, pastas, rodar local).

### Primeira publicação (só com autorização)

1. Revisão final local: `npm run lint`, `npm test`, `npm run build`, coleta real (`npm run coletar` com
   `DATA_DIR=data`) e site rodando com os dados.
2. Commit único (ou poucos e limpos) na `main` local por cima do `Initial commit`, e push.
3. `scripts/bootstrap-repo.sh filipesfbr/gastometro-rolante`: cria `develop`, configurações e rulesets.
4. Pages: Settings → Pages → Source = GitHub Actions.
5. Rodar `coleta.yml` na mão (`workflow_dispatch`): cria a branch `data` órfã e chama o deploy.
6. Conferir o site publicado contra o portal (3 números ao acaso).

---

## 9. Ordem de execução

| Fase | Entrega | Estimativa |
|---|---|---|
| 1 | Esqueleto: copiar configs, `package.json`, `config/fonte.json`, `AGENTS.md`, `docs/fonte-de-verdade.md`, `npm ci` | 1 h |
| 2 | Coletor: `api`, `agregar`, `validar`, `diff`, `resumo`, `coletar` + testes; coleta real local passando no R2 | 1 dia |
| 3 | `codigos.json` no coletor e link do R4 por área (seção 6.1, já verificado) | 1 h |
| 4 | Site: seções 1, 2, 3, 7, 8 e 9 com os dados reais | 1–2 dias |
| 5 | Site: seções 4, 5 e 6 | meio dia |
| 6 | Identidade visual e logo (seção 11): mover o pacote, `BrandMark`, ícones PNG, `og-image` | 2–3 h |
| 7 | Workflows, README, revisão final | meio dia |
| 8 | Primeira publicação (seção 8), **só com autorização** | 1 h |

O pacote de design já chegou e usa a mesma paleta do Impostômetro, então o `tokens.css` copiado na fase 4 já é o
definitivo. A fase 6 pode entrar junto com a fase 4.

---

## 10. Riscos

| Risco | Resposta |
|---|---|
| A Abase muda a API ou o formato do `jsonfiltros` | R2 falha, nada é publicado, o site fica no último snapshot. Ajustar o coletor. |
| Dado pessoal vaza para `data/` | Agregar em memória, tipo `Linha` sem os campos, teste unitário e passo no `coleta.yml` (R8). |
| reCAPTCHA (429/403) com ~112 chamadas | Intervalo de 2 s e espera de 30/60/90 s. Se continuar, coletar só o ano corrente todo dia e o anterior uma vez por semana. |
| Mês com mais de 20.000 empenhos | Hoje o máximo visto é ~1.500. O `api` já falha se `length < recordsTotal`. |
| Nomes de área mudam entre anos (órgão) | Não comparar órgão ano a ano (seção 7). Função e elemento são classificações nacionais e estáveis. |
| Pago cresce todo dia (D4) e confunde o leitor | Texto explicando em "De onde vêm os números" e no bloco 2. |

---

## 11. Identidade visual e logo (pacote do Claude Design recebido em 27/10/2026)

Pacote em `design_handoff_gastometro_rolante/` (raiz do repositório): `README.md` (o handoff), `brands.json`,
`styles.css` + `tokens/` (cores, tipografia, forma, fontes), `guidelines/brand-gastometro-rolante.html` (ficha
visual; abrir no navegador) e os 10 SVGs em `assets/gastometro-rolante/`.

**Fidelidade:** marca final (símbolo, assinaturas, cores, tipografia, forma). **Telas não desenhadas**: o layout
segue os fundamentos abaixo, com o mínimo de elementos, e reaproveita o layout do Impostômetro.

### 11.1 Marca

- **Nome:** «Gastômetro» em tinta `#26221d` e «Rolante» em terracota `#b4622f`. No escuro, creme `#fbf4e9` e
  âmbar `#d98a52`. Inter 700, tracking −0.02em. Mesmo padrão do Impostômetro (`accentWord: "Rolante"`).
- **Símbolo:** a gota da família (viewBox 26×34, `rect x2 y2 22×30 rx11`, traço 1.8, preenchimento creme) com
  um cifrão em terracota (traço 1.8), a barra vertical do cifrão (opacidade .45, traço 1.4) e duas ondas de água
  embaixo (opacidade .45, traço 1.4). O cifrão é o dinheiro público; a água liga ao rio de Rolante.
  Par com o Impostômetro: mesma gota e mesma paleta, só muda o conteúdo (mostrador × cifrão sobre ondas).
- **Respiro** = largura do símbolo. **Mínimos:** símbolo 16 px, assinatura horizontal 132 px.
- **Não fazer:** girar, distorcer, sombra, gradiente, trocar a fonte, alterar o traço.

Geometria do símbolo (de `assets/gastometro-rolante/mark.svg`, para o `BrandMark`):

```svg
<rect x="2" y="2" width="22" height="30" rx="11" stroke-width="1.8"/>          <!-- gota -->
<path d="M13 6.4 V20.6" stroke-opacity=".45" stroke-width="1.4"/>              <!-- barra do cifrão -->
<path d="M15.94 10.27 C15.3 9.35 14.29 8.8 13 8.8 C11.16 8.8 10.06 9.81 10.06 11.1 C10.06 12.66 11.53 13.12 13 13.4 C14.47 13.68 15.94 14.14 15.94 15.7 C15.94 16.99 14.84 18 13 18 C11.71 18 10.7 17.45 10.06 16.53" stroke-width="1.8"/>  <!-- S -->
<path d="M7 23.6 q1.5 -1.4 3 0 t3 0 t3 0 t3 0 M8.5 27 q1.5 -1.4 3 0 t3 0 t3 0" stroke-opacity=".45" stroke-width="1.4"/>  <!-- ondas -->
```

Todos com `fill="none"`, `stroke-linecap="round"`, `stroke-linejoin="round"`; a gota leva `fill` creme.

### 11.2 Tokens: a paleta é a mesma do Impostômetro

Comparado com `impostometro-rolante/site/src/styles/tokens.css`: terracota, âmbar, tinta, creme, branco, fundo
`#faf8f4`, corpo `#5a534a`, apagado `#9a9082`, linha `#ece7df`, raio de cartão 14 px e "sem sombra" são
**idênticos**. Consequência:

- **Copiar `tokens.css` do Impostômetro como está.** Só trocar o comentário do topo (nome e caminho
  `docs/brand/gastometro-rolante/`). O tema escuro (`--panel #312C27`, `--line #403B35` etc.) não vem no pacote
  e fica o do Impostômetro.
- **Não usar** `styles.css` nem `tokens/` do pacote no site. Os nomes deles (`--surface-card`, `--text-muted`…)
  diferem dos do Impostômetro (`--panel`, `--ink-3`…) e trocar só geraria diff entre os irmãos.
- **Fonte:** o pacote carrega a Inter do Google Fonts (`tokens/fonts.css`). Manter a **Inter local**
  (`@fontsource-variable/inter` em `main.tsx`), como no Impostômetro: sem chamada a terceiros.
- **Pílula:** o pacote diz raio 20–30 px; o Impostômetro usa `--r-pill: 24px`, que está dentro. Manter.

### 11.3 Regras de interface do pacote

- Rótulos pequenos em CAIXA ALTA: 12 px, peso 600, tracking 0.08em, cor apagada `#9a9082` (ex.: DESPESA
  EMPENHADA). Decidido em 27/10/2026 seguir o pacote aqui, mesmo diferente do Impostômetro (ver 11.6).
- Gráficos: série em destaque em terracota; as demais em terracota com opacidade .3–.55 ou neutro. Sem
  paleta multicolorida. Já é o que o Impostômetro faz (`--cur`, `--prev`, `--part`, `--seg-*`).
- Ícones: traço único arredondado, 1.5–1.8 (sugestão Lucide). Sem emoji. O Impostômetro não usa Lucide, usa
  SVG inline; seguir igual, sem nova dependência.
- Interação (sugestão neutra do pacote): transição 150 ms ease-out, foco visível 2 px terracota (o Impostômetro
  já tem `outline: 2px solid var(--accent)`), hover em cartão trocando a borda para `#d8d0c4` (decidido seguir
  o pacote; entra como token novo `--line-hover` no `tokens.css`).
- Texto: frases curtas e factuais, aspas «angulares», `R$ 1.234.567,89`.
- O pacote sugere Next.js ou Astro. **Ignorar**: a stack é a do Impostômetro (seção 7).

### 11.4 Assets

| Pacote (`assets/gastometro-rolante/`) | Uso no site |
|---|---|
| `mark.svg`, `mark-dark.svg`, `mark-mono-ink.svg`, `mark-mono-white.svg` | referência do `BrandMark` (tons `auto`, `ink`, `white`) |
| `lockup-horizontal.svg`, `lockup-horizontal-dark.svg` (250×34), `lockup-stacked.svg` (240×96) | referência do `BrandLockup`. O `<text>` dos SVGs depende da Inter; o componente usa texto HTML, como no Impostômetro |
| `favicon.svg` (32×32, fundo terracota, raio 7) | `site/public/favicon.svg` |
| `app-icon-512.svg` (raio 112) | gerar `icon-512.png`, `icon-192.png` e `apple-touch-icon.png` |
| `social-square-1200.svg` | gerar `og-image.png` |

Os SVGs trazem um bloco `<metadata>` C2PA (~6 KB de procedência). Manter nos arquivos de `docs/brand/`; tirar
na cópia para `site/public/` se pesar.

### 11.5 Tarefas

- [ ] Mover o pacote para `docs/brand/gastometro-rolante/` no formato do Impostômetro: `README.md` (handoff),
      `brands.json`, `assets/gastometro-rolante/`, `guidelines/`. Criar `docs/brand/README.md` com a tabela
      de arquivos. Apagar `design_handoff_gastometro_rolante/` da raiz.
- [ ] `site/src/styles/tokens.css`: cópia do Impostômetro com o comentário trocado.
- [ ] `site/src/components/brand/BrandMark.tsx` com a geometria da 11.1 (mesmas props `height`, `tone`, `title`)
      e `BrandLockup.tsx` com «Gastômetro <span>Rolante</span>».
- [ ] `site/public/`: `favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `og-image.png`
      e `manifest.webmanifest` (seção 11.7).
- [ ] `AGENTS.md`: seção de identidade visual apontando para `docs/brand/gastometro-rolante/`.
- [ ] Badge e imagem do `README.md`.

### 11.6 Divergências do Impostômetro (decidido em 27/10/2026: seguir o pacote)

- **Cor do rótulo pequeno:** `#9a9082` em 12 px, como no pacote. O Impostômetro evita, porque dá ~3:1 sobre
  `#faf8f4` (abaixo de 4,5:1 da WCAG AA). No `tokens.css`, token novo `--label: #9A9082` só para esses
  rótulos (`--ink-3` continua `#5A534A` nos metadados), e o comentário do topo registra a exceção. No escuro,
  `--label` fica `rgba(251, 244, 233, .72)`.
- **Hover de cartão:** borda `#d8d0c4` (`--line-hover`), como no pacote. No escuro, usar `--line-strong`.

### 11.7 Ícones PNG e manifest (decidido em 27/10/2026: igual ao Impostômetro)

O SVG não serve em três lugares: prévia do link nas redes (`og:image`), ícone do iPhone (`apple-touch-icon`) e
ícone de instalação no Android (`manifest`). Mesmo conjunto e mesmos tamanhos de `impostometro-rolante/site/public/`:

| Arquivo | Tamanho | Origem |
|---|---|---|
| `og-image.png` | 1200×1200 | `social-square-1200.svg` |
| `icon-512.png` | 512×512 | `app-icon-512.svg` |
| `icon-192.png` | 192×192 | `app-icon-512.svg` |
| `apple-touch-icon.png` | 180×180 | `app-icon-512.svg` |

Gerar **uma vez, à mão**, sem script nem dependência no projeto (o Impostômetro também não tem script).

**Feito em 27/10/2026 com o Chrome headless**, não com o resvg abaixo (o `npx` foi bloqueado e a Inter não está
instalada): uma página HTML com o SVG inline e `@font-face` apontando para
`node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2`, renderizada com
`--headless --screenshot --window-size=N,N --default-background-color=00000000`. O `og-image.png` saiu com a
Inter. Comando antigo, não testado, mantido só como alternativa:

```bash
S=docs/brand/gastometro-rolante/assets/gastometro-rolante; P=site/public
npx --yes @resvg/resvg-js-cli --fit-width 1200 --font-dirs ~/Library/Fonts $S/social-square-1200.svg $P/og-image.png
for n in 512 192 180; do npx --yes @resvg/resvg-js-cli --fit-width $n $S/app-icon-512.svg $P/icon-$n.png; done
mv $P/icon-180.png $P/apple-touch-icon.png
```

- O `social-square-1200.svg` tem o nome em `<text>` com Inter. Em 27/10/2026, a Inter **não** estava
  instalada no Mac (`~/Library/Fonts`, `/Library/Fonts`). Antes, baixar a Inter em TTF (rsms.me/inter). O
  `@fontsource` só traz woff2, e o resvg não lê woff2. Sem a Inter, o PNG sai em Helvetica ou Arial. Abrir o
  `og-image.png` e conferir.
- `manifest.webmanifest`: cópia do Impostômetro com `name: "Gastômetro Rolante"`, `short_name: "Gastômetro"`,
  `background_color: "#fbf4e9"` e `theme_color: "#b4622f"`.
- `index.html`: as mesmas tags do Impostômetro (`og:image` com URL absoluta
  `https://filipesfbr.github.io/gastometro-rolante/og-image.png`, `og:image:width/height` 1200, `icon`,
  `apple-touch-icon`, `manifest`).

---

## 12. Depois da v1

- **Despesas orçadas** (tipo 0, D3): investigar o HTTP 400 (provável filtro de `orgao` obrigatório) para ter
  "% do orçamento já gasto" por área.
- **Pago no mês, no sentido de caixa** (D4): investigar `OrdemCronologicaPagamentosService.js` e
  `Usuario/Despesas/BuscaPagamentosTodasDespesasPorCodigo`.
- **Subfunção** (tipo 8): voltar a testar. Se o portal corrigir, dá o nível "ensino fundamental", "atenção básica"…
- **Arrecadou × gastou** com o Impostômetro.
- **SICONFI** (RREO, despesa por função) como conferência externa (R9).
- Outras consultas do portal para sites futuros: obras públicas (situação, paralisações, mapa), licitações,
  emendas parlamentares, frotas (112 veículos, R$ 2,49 mi em 2026), diárias.
