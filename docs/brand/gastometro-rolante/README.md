# Handoff: Gastômetro Rolante

## Overview
Gastômetro Rolante é um site público que mostra para onde vão os gastos públicos de Rolante/RS. Faz parte do **Sistema de Marcas Rolante**, ao lado de TransparêncIA, Impostômetro Rolante (receita), auditoria-rolante e cameras-rolante. O Gastômetro é o par do Impostômetro: um mostra o que entra, o outro mostra o que sai.

Este pacote traz a **identidade de marca e os tokens visuais**. Ainda não há telas desenhadas. O site deve ser construído aplicando as regras abaixo.

## About the Design Files
Os arquivos deste pacote são **referências de design**: SVGs de marca, tokens CSS e uma ficha visual em HTML. Não são código de produção para copiar direto. A tarefa é implementar o site no framework do projeto. Se ainda não houver código, escolha a stack mais adequada (sugestão: Next.js ou Astro para um site público, estático ou com SSR, rápido e acessível). Os SVGs de `assets/` podem ser usados como estão.

## Fidelity
- **Marca: alta fidelidade.** Símbolo, assinaturas, cores, tipografia e forma são finais.
- **Telas: não desenhadas.** Monte o layout seguindo os fundamentos visuais abaixo, com o mínimo de elementos.

## Marca
- **Nome:** Gastômetro Rolante. «Gastômetro» em tinta `#26221d` e «Rolante» em terracota `#b4622f`. Em fundo escuro, creme `#fbf4e9` e âmbar `#d98a52`.
- **Assinatura:** Inter 700, letter-spacing −0.02em.
- **Público:** cidadão, por isso o contorno da gota é terracota.
- **Símbolo:** a gota (viewBox 26×34, retângulo x2 y2 22×30 rx11, traço 1.8). Dentro dela, um cifrão em terracota (traço 1.8) com a barra vertical (opacidade .45, traço 1.4) e duas ondas de água embaixo (opacidade .45, traço 1.4). O cifrão é o dinheiro público; a água liga ao rio de Rolante e à gota da família.
- **Respiro:** margem livre igual à largura do símbolo.
- **Tamanhos mínimos:** símbolo 16px; assinatura horizontal 132px.
- **Não fazer:** girar, distorcer, aplicar sombra ou gradiente, trocar a fonte, alterar o traço.

## Fundamentos visuais (aplicar ao site)
- **Cor:** uma só cor de acento, terracota `#b4622f` (âmbar `#d98a52` em fundo escuro). Nenhuma outra cor entra. Se for preciso variar, use oklch com a mesma croma e luminância.
  - Texto forte `#26221d`, corpo `#5a534a`, apagado `#9a9082`.
  - Fundo da página `#faf8f4`, cartão `#ffffff`, peças de marca `#fbf4e9`, fundo escuro `#26221d`.
  - Linha/borda `#ece7df`.
- **Tipo:** só Inter, pesos 400–800 (alternativas: Helvetica Neue, Arial). Títulos em caixa normal. Rótulos pequenos em CAIXA ALTA: 12px, peso 600, tracking 0.08em, cor apagada (ex.: DESPESA EMPENHADA).
- **Forma:** sem sombras e sem gradientes. A profundidade vem de borda 1px `#ece7df` sobre branco. Cartões com raio 14px; pílulas com raio 20–30px.
- **Ícones de interface:** não há biblioteca própria. Use ícones de traço único arredondado, coerentes com a gota (ex.: Lucide, traço 1.5–1.8). Sem emoji.
- **Gráficos de dados:** a série em destaque vai em terracota; as demais, em terracota com opacidade .3–.55 ou em tons neutros. Sem paleta multicolorida.
- **Texto:** português do Brasil, frases curtas e factuais, tom institucional e direto. Aspas «angulares» para citar palavras. Valores em reais no formato `R$ 1.234.567,89`.

## Interactions & Behavior
Animação e estados de hover não estão definidos no sistema. Sugestão neutra: transições de 150ms ease-out; hover em cartões trocando a borda para `#d8d0c4`; foco visível com contorno 2px terracota. Confirme com o design antes de ir além disso.

## State Management / Dados
Não definido no design. O site provavelmente vai consumir dados abertos de despesa do município (portal de transparência / TCE-RS). A estrutura de dados fica a cargo do desenvolvimento.

## Design Tokens
Estão em `tokens/` e são importados por `styles.css`:
- `colors.css`: `--terracota`, `--ambar`, `--tinta`, `--creme`, `--branco`, `--fundo-pagina`, `--corpo`, `--apagado`, `--linha` e os aliases semânticos (`--accent`, `--text-strong`, `--surface-card`, `--border`…).
- `typography.css`: `--font-sans`, pesos 400–800, `--tracking-brand` −0.02em, `--tracking-label` 0.08em, `--label-size` 12px.
- `shape.css`: `--radius-card` 14px, `--radius-pill-sm` 20px, `--radius-pill-lg` 30px, `--border-width` 1px, `--shadow` none.
- `fonts.css`: Inter via Google Fonts.

## Assets (`assets/gastometro-rolante/`)
- `mark.svg`: símbolo para fundo claro (gota preenchida de creme).
- `mark-dark.svg`: símbolo para fundo escuro (âmbar).
- `mark-mono-ink.svg`, `mark-mono-white.svg`: versões monocromáticas.
- `lockup-horizontal.svg`, `lockup-horizontal-dark.svg`: assinatura horizontal, 250×34. Use no cabeçalho do site.
- `lockup-stacked.svg`: assinatura empilhada, 240×96.
- `favicon.svg`: 32×32, fundo terracota, raio 7.
- `app-icon-512.svg`: ícone de app, 512×512, raio 112.
- `social-square-1200.svg`: imagem 1200×1200 para compartilhamento (og:image).

O texto das assinaturas é `<text>` com Inter. Para produção, converta em curvas ou garanta que a Inter esteja carregada.

## Files
- `styles.css` + `tokens/`: tokens CSS.
- `brands.json`: dados da família de marcas, em formato legível por máquina (inclui a entrada `gastometro-rolante`).
- `guidelines/brand-gastometro-rolante.html`: ficha visual da marca. Abra no navegador para ver todas as versões.
- `assets/gastometro-rolante/`: os 10 SVGs.
