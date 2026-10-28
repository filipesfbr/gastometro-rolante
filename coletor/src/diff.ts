import type { Agregado, Alteracao } from './tipos.ts';

/**
 * R5: compara, por (mês, função), só os meses que a coleta anterior já cobria por completo
 * (anteriores ao mês de `coletaAnterior`). Pago e liquidado crescem todo dia, porque o mês é o do
 * empenho: isso não é alteração. Registra empenhado diferente (anulação, empenho retroativo) e pago
 * em queda (estorno).
 */
export function diff(
  ano: number,
  anterior: Agregado[],
  novo: Agregado[],
  coletaAnterior: string,
  detectadoEm: string,
): Alteracao[] {
  const limite = coletaAnterior.slice(0, 7);
  const somar = (lista: Agregado[]) => {
    const m = new Map<string, { e: number; p: number }>();
    for (const x of lista) {
      if (x.d.slice(0, 7) >= limite) continue;
      const chave = `${Number(x.d.slice(5, 7))}\t${x.a}`;
      const s = m.get(chave) ?? { e: 0, p: 0 };
      s.e += x.e;
      s.p += x.p;
      m.set(chave, s);
    }
    return m;
  };
  const antes = somar(anterior);
  const depois = somar(novo);

  const alteracoes: Alteracao[] = [];
  for (const chave of new Set([...antes.keys(), ...depois.keys()])) {
    const a = antes.get(chave) ?? { e: 0, p: 0 };
    const b = depois.get(chave) ?? { e: 0, p: 0 };
    const [mes, area] = chave.split('\t') as [string, string];
    const base = { detectado_em: detectadoEm, ano, mes: Number(mes), area };
    if (a.e !== b.e) alteracoes.push({ ...base, campo: 'e', antes: a.e, depois: b.e });
    if (b.p < a.p) alteracoes.push({ ...base, campo: 'p', antes: a.p, depois: b.p });
  }
  return alteracoes.sort((x, y) => x.mes - y.mes || (x.area < y.area ? -1 : x.area > y.area ? 1 : 0) || (x.campo < y.campo ? -1 : 1));
}
