/** Variação % entre dois valores do portal. Sem base positiva, não há variação (null → "—"). */
export const variacao = (atual: number, anterior: number | null | undefined): number | null =>
  anterior && anterior > 0 ? (atual / anterior - 1) * 100 : null;

/**
 * Divide 100 pontos entre as partes pelo maior resto, para a barra "de cada R$ 100" somar
 * exatamente 100 (arredondar cada parte sozinha pode dar 99 ou 101).
 */
export function pontos(partes: number[]): number[] {
  const total = partes.reduce((s, v) => s + Math.max(v, 0), 0);
  if (!total) return partes.map(() => 0);
  const brutos = partes.map((v) => (Math.max(v, 0) / total) * 100);
  const inteiros = brutos.map(Math.floor);
  let falta = 100 - inteiros.reduce((s, v) => s + v, 0);
  const ordem = brutos.map((b, i) => [b - Math.floor(b), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of ordem) {
    if (falta-- <= 0) break;
    inteiros[i]!++;
  }
  return inteiros;
}

/** Soma acumulada mês a mês; para no primeiro mês sem dado. */
export function acumulado(meses: (number | null)[]): (number | null)[] {
  let s = 0;
  let parou = false;
  return meses.map((v) => {
    if (v === null || parou) {
      parou = true;
      return null;
    }
    return (s += v);
  });
}
