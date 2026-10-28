/**
 * Anos coletados com todas as dimensões. O ano retrasado só entra inteiro se já foi
 * gravado inteiro antes (era o ano anterior): senão total e áreas ficariam de coletas
 * diferentes. Sem isso ele só traz `elemento`, para a comparação da folha.
 */
export const anosCompletos = (anos: number[], anoAtual: number, jaGravadoInteiro: (ano: number) => boolean) =>
  new Set(anos.filter((a) => a !== anoAtual - 2 || jaGravadoInteiro(a)));
