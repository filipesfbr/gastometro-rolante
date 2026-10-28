# Fonte de verdade — Gastômetro Rolante

> Definição de onde vem cada número do site e das regras para exibi-lo.
> Definido em 27/10/2026. Estas regras valem para o coletor e para o site.
> Adaptado de `impostometro-rolante/docs/fonte-de-verdade.md`.

---

## 1. Definição

> **A única fonte de verdade é o Portal da Transparência da Prefeitura Municipal de Rolante**
> (https://transparencia.abase.com.br/home/apvqyIT7vjY=, operado pela Abase Sistemas),
> **entidade "Prefeitura Municipal de Rolante"**.
>
> Um número está correto quando é **igual ao que o portal exibe** para o mesmo filtro.

O site **não produz dados**: ele copia, organiza e mostra o que o portal publica. A nossa base é um **espelho datado** do portal, nunca a fonte.

---

## 2. Hierarquia

| Nível | O quê | Origem (endpoint) | Papel |
|---|---|---|---|
| **1. Fonte de verdade** | Empenhado, liquidado e pago (ano, mês) | `Usuario/Despesas/ListarValores`: os cartões da tela de Despesas do portal | define o número |
| **2. Detalhe** | Empenhos do mês com a área preenchida (função, elemento, órgão, recurso vinculado) | `Usuario/Despesas/Listar`, tipos 4, 2, 5 e 7 | permite quebrar por área e mês. **Só é aceito se a soma bater com o nível 1** |
| **3. Conferência** | Despesa por função declarada ao Tesouro | SICONFI (RREO, anexo 2) | **depois da v1**. Nunca altera número |
| Apoio | População | IBGE (agregado 6579) | fonte de verdade só para "por habitante" |
| Apoio | Nome da área → código do portal | `ListaFuncoes`, `ListaOrgaos`, `ListaVinculos` | só para montar o link "conferir no portal" (R4) |
| Espelho | Snapshots diários | nossa coleta | cópia auditável, nunca fonte |

O mês de cada valor é o **mês do empenho** (data do empenho). Liquidado e pago são o estado atual desses empenhos, por isso meses passados continuam crescendo.

---

## 3. Regras

**R1 — Nenhum número sem origem.** Todo número exibido é um valor do portal, ou uma soma ou divisão simples de valores do portal (ex.: por habitante, % do total, empenhado − pago). **Proibido:** projeção, estimativa, extrapolação ("R$ por segundo"), correção pela inflação, média de anos.

**R2 — Fechamento obrigatório.** A cada coleta, para cada mês e cada tipo coletado (4, 2, 5, 7): `soma(empenhado)`, `soma(liquidado)` e `soma(pago)` dos empenhos == `ListarValores` do mês (tolerância R$ 0,01). E o `ListarValores` do ano == soma dos meses. Se algum mês ou tipo não fechar, **aquela coleta não é publicada**. O site continua com o último snapshot válido e mostra "atualização pendente".

**R3 — Snapshot imutável.** Cada coleta guarda os dados da API **já agregados por (data, área) e sem nenhum dado de credor ou do empenho individual** (R8), os totalizadores do portal, a data/hora da coleta e o hash SHA-256 de cada arquivo. O histórico do repositório git é o registro imutável. Os snapshots ficam versionados e públicos. Assim dá para provar o que o portal mostrava em cada data.

**R4 — Rastreabilidade na tela.** Todo número exibe: *"Fonte: Portal da Transparência de Rolante · coletado em dd/mm/aaaa hh:mm · [conferir no portal]"*. O link abre a tela de Despesas do portal com o mesmo tipo, ano, mês e, quando o portal permite, a mesma área (`funcao`, `orgao` ou `vinculo`). A data exibida é a **da nossa coleta** e a **do último empenho**: a "Última Atualização" do rodapé do portal é só o relógio do navegador e não serve como dado.

**R5 — Mudanças retroativas.** O portal pode alterar valores passados. Pago e liquidado crescem todo dia por natureza (o mês é o do empenho), então isso **não** é alteração. O histórico de alterações público registra só, por (ano, mês, função), em meses que a coleta anterior já cobria:
- **empenhado mudou** (anulação ou empenho com data retroativa);
- **pago caiu** (estorno).

**R6 — Classificação oficial.** As áreas são as **classificações que o portal já publica**: função de governo (Portaria MOG 42/1999), elemento de despesa, órgão e fonte de recurso vinculado. Nenhum agrupamento nosso. O nome da área é o do portal, só com `trim`.

Única soma de áreas: a **folha de pagamento** é a soma dos elementos do grupo 1, Pessoal e Encargos Sociais, da Portaria Interministerial STN/SOF 163/2001. A lista fica em `config/folha.json` e é publicada no site. Como o portal não devolve o código do elemento, a comparação é pelo nome, sem acento nem caixa. Sentenças judiciais e despesas de exercícios anteriores podem ser de qualquer grupo e ficam fora.

**R7 — Escopo.** Só a **Prefeitura** (a Câmara fica de fora). Só o que o portal publica.

**R8 — Privacidade.** Nenhum dado de credor ou do empenho individual é armazenado nem publicado: `nome`, `credor`, `fornecedor`, `descricaoLinha`, `especificacao`, `itensEmpenho`, `pagamentosEmpenho`, `retencoes`, `anexos`, `movimentacoesEmpenho`. A coleta agrega por `(data, área)` **em memória** e descarta o resto antes de gravar. Há teste unitário e passo no `coleta.yml` que falha se aparecer `"nome"`, `"credor"`, `"fornecedor"` ou `"descricaoLinha"` em `data/`.

**R9 — Divergência externa.** Depois da v1: se o SICONFI divergir do portal, o site mantém o número do portal e acrescenta uma nota explicando a diferença.

---

## 4. Como o site interativo aplica isso

```
coletor diário (06:47) ──► API do portal (Abase)
   │  valida R2, agrega em memória e descarta dados de credor (R8)
   ▼
snapshots versionados na branch `data` (JSON + hash + data/hora)   ◄── R3, R5
   ▼
site estático lê os JSON  ──► gráficos, filtros, comparações
   │
   └─ link "conferir no portal" em cada número: abre a tela de Despesas
      do portal com o mesmo tipo, ano, mês e área                   ◄── R4
```

- O site **não depende da API em tempo real**. A API tem rate limit com reCAPTCHA e pode mudar sem aviso; se o portal cair, o site mostra o último snapshot com a data.
- A conferência é diária e automática: a coleta só é publicada se cada mês e cada tipo baterem com o portal (R2). O site mostra quantos meses conferiram na última coleta.
- A interatividade (filtrar por mês, comparar anos, ver por área) usa só os dados do snapshot (níveis 1 e 2).

---

## 5. Texto público sugerido ("De onde vêm os números")

> Todos os valores deste site vêm do **Portal da Transparência da Prefeitura de Rolante**. Não fazemos estimativas: mostramos o que a prefeitura publica, organizado de forma mais fácil de entender. Os dados são coletados todos os dias e só são publicados quando a soma confere exatamente com o total exibido no portal. Em cada número há um link para você conferir no próprio portal. Nomes de pessoas e empresas não são coletados.
>
> O mês de cada gasto é o mês em que a prefeitura assumiu o compromisso (o empenho). O valor pago mostra quanto desse compromisso já foi pago até hoje, por isso meses anteriores ainda podem crescer.

---

## 6. O que pode invalidar esta definição

| Evento | Efeito | Resposta |
|---|---|---|
| Abase muda a API ou o formato do `jsonfiltros` | coleta falha ou R2 não fecha | site congela no último snapshot e exibe aviso; ajustar o coletor |
| Prefeitura troca de sistema (já aconteceu em mar/2026) | fonte muda de endereço ou formato | redefinir o nível 1 para o novo portal; documentar a data da troca |
| Portal fora do ar | sem coleta | último snapshot com data visível |
| Portal publica valor errado (ex.: a visão por subfunção, tipo 8, soma errado em 27/10/2026) | o site repetiria o erro | a visão errada fica fora do site; nas demais, por definição o site espelha o portal |
