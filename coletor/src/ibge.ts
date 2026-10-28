import type { Fonte } from './tipos.ts';

/** Estimativas de população do IBGE (agregado 6579), por ano. */
export async function populacao(fonte: Fonte, f: typeof fetch = fetch): Promise<Record<string, number>> {
  const url = `https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-6/variaveis/9324?localidades=N6[${fonte.ibge}]`;
  let resp: Response | undefined;
  for (let tentativa = 1; !resp; tentativa++) {
    try {
      resp = await f(url, { headers: { 'User-Agent': fonte.userAgent }, signal: AbortSignal.timeout(15000) });
    } catch (erro) {
      if (tentativa >= 3) throw new Error('IBGE: sem resposta', { cause: erro });
      await new Promise((r) => setTimeout(r, 5000 * tentativa));
    }
  }
  if (!resp.ok) throw new Error(`IBGE: HTTP ${resp.status}`);
  type Resposta = { resultados: { series: { serie: Record<string, string> }[] }[] }[];
  const json = (await resp.json()) as Resposta;
  const serie = json[0]!.resultados[0]!.series[0]!.serie;
  return Object.fromEntries(Object.entries(serie).map(([ano, v]) => [ano, Number(v)]));
}
