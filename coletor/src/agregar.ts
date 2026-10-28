import { centavos } from './api.ts';
import type { Agregado, Linha, Valores } from './tipos.ts';

type Campo = 'descricaoFuncao' | 'descricaoElemento' | 'descricaoOrgao' | 'descricaoVinculo';

/**
 * Soma os empenhos por (data, área) em centavos. Só lê `data`, os três valores e o campo da área:
 * nenhum dado de credor ou do empenho individual é copiado (R8). O nome da área é o do portal, com `trim` (R6).
 * Área vazia é erro: nos tipos 5 e 7 ela vem vazia quando faltam os filtros extras.
 */
export function agregar(linhas: Linha[], campo: Campo): Agregado[] {
  const somas = new Map<string, Agregado>();
  for (const l of linhas) {
    const d = l.data.slice(0, 10);
    const a = (l[campo] ?? '').trim();
    if (!a) throw new Error(`empenho de ${d} sem ${campo}`);
    const chave = `${d}\t${a}`;
    const s = somas.get(chave) ?? { d, a, e: 0, l: 0, p: 0 };
    s.e += centavos(l.valorEmpenhado);
    s.l += centavos(l.valorLiquidado);
    s.p += centavos(l.valorPago);
    somas.set(chave, s);
  }
  return ordenar([...somas.values()]);
}

export const ordenar = (a: Agregado[]): Agregado[] =>
  a.sort((x, y) => (x.d === y.d ? (x.a < y.a ? -1 : x.a > y.a ? 1 : 0) : x.d < y.d ? -1 : 1));

export const zero = (): Valores => ({ e: 0, l: 0, p: 0 });

export function somar(alvo: Valores, v: Valores): Valores {
  alvo.e += v.e;
  alvo.l += v.l;
  alvo.p += v.p;
  return alvo;
}

export const iguais = (x: Valores, y: Valores) => x.e === y.e && x.l === y.l && x.p === y.p;
