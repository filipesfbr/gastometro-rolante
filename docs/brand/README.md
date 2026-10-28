# Marca

Identidade visual do Gastômetro Rolante, parte do sistema de marcas Rolante. Pacote do Claude Design recebido
em 27/10/2026, guardado como veio.

| Arquivo | O quê |
|---|---|
| [`gastometro-rolante/README.md`](gastometro-rolante/README.md) | o handoff: marca, fundamentos visuais, tokens e assets. Em conflito, vale este |
| [`gastometro-rolante/brands.json`](gastometro-rolante/brands.json) | os dados da família de marcas em formato de máquina |
| [`gastometro-rolante/assets/`](gastometro-rolante/assets/gastometro-rolante/) | os 10 SVGs da marca (símbolo, assinaturas, favicon, ícone de app, cartão social) |
| [`gastometro-rolante/guidelines/brand-gastometro-rolante.html`](gastometro-rolante/guidelines/brand-gastometro-rolante.html) | ficha visual; abrir no navegador |
| `gastometro-rolante/styles.css` e `tokens/` | tokens do pacote, usados só pela ficha |

No site, a marca entra só pelos componentes `BrandMark` e `BrandLockup` (`site/src/components/brand/`)
e as cores só por `site/src/styles/tokens.css`, que segue a paleta do Impostômetro (idêntica à do pacote).
Os PNG de `site/public/` (`og-image`, `icon-192/512`, `apple-touch-icon`) foram gerados uma vez a partir de
`social-square-1200.svg` e `app-icon-512.svg`, com o Chrome headless e a Inter de `@fontsource-variable/inter`.

Decisões que divergem do Impostômetro (`docs/plano.md`, seção 11.6): rótulos pequenos em caixa alta na cor
apagada (`--label`) e borda `--line-hover` no hover das linhas de área.
