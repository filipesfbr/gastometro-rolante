## O que muda

<!-- bullets, foco no porquê e não no "o quê" -->

## Como testar

- [ ] `npm ci && npm run lint && npm run build && npm test`
- [ ] Mudou o coletor? `npm run coletar` e conferir os valores de referência (README)

## Checklist

- [ ] Nenhum secret/credencial no diff
- [ ] Nenhum nome, CPF/CNPJ ou dado de credor em fixture ou dado (R8)
- [ ] Teste cobrindo a mudança (ou justificativa de por que não precisa)
- [ ] PR pra `main` (release): a versão em `develop` já é a que deve sair? Para
      minor/major, rode o `bump.yml` com `kind` antes de abrir
