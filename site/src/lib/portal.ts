import type { Resumo } from '../../../coletor/src/resumo.ts';
import type { Dimensao } from '../../../coletor/src/tipos.ts';

type Fonte = Resumo['fonte'];

/** `tipo-despesa` de cada visão da tela de Despesas; 10 = todas. */
const TIPO: Record<Dimensao, number> = { funcao: 4, elemento: 2, orgao: 5, vinculo: 7 };

/**
 * Link para a tela de Despesas do portal já filtrada (testado em 27/10/2026). A tela copia cada
 * parâmetro para o campo de mesmo `id`. A área só entra com código: elemento não tem filtro na tela,
 * e vínculos de anos anteriores não estão na tabela de códigos do portal.
 */
export function linkPortal(
  fonte: Fonte,
  codigos: Resumo['codigos'],
  f: { ano: number; mes?: number; dimensao?: Dimensao; area?: string },
): string {
  const p = new URLSearchParams({
    entidades: String(fonte.entidade),
    'tipo-despesa': String(f.dimensao ? TIPO[f.dimensao] : 10),
    ano: String(f.ano),
  });
  if (f.mes) p.set('mes', String(f.mes));
  const d = f.dimensao;
  if (d && d !== 'elemento' && f.area) {
    const codigo = codigos[d][f.area];
    if (codigo !== undefined) p.set(d, String(codigo));
  }
  return `${fonte.portalDespesas}?${p}`;
}
