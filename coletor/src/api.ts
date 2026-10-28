import type { Codigos, Fonte, Linha, Valores } from './tipos.ts';

type Opcoes = {
  fetch?: typeof fetch;
  esperar?: (ms: number) => Promise<void>;
};

const TENTATIVAS = 3;

type Envelope<T> = { status: string | boolean; data: T; recordsTotal?: number };

/** Reais (número ou string "10335995.2600") → centavos inteiros. */
export const centavos = (v: number | string): number => Math.round(Number(v) * 100);

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Sem estes filtros, os tipos 5 (órgão) e 7 (vínculo) voltam com a área vazia.
const FILTROS_EXTRAS: Partial<Record<number, Record<string, string>>> = {
  5: { orgao: '0', dinamic: '0' },
  7: { vinculo: '0', dinamic: '0' },
};

/**
 * Cliente da API Abase. Uma chamada a cada `intervaloMs` (o portal responde
 * 429/403 com reCAPTCHA quando passa disso); nesses casos espera 30 s, 60 s, 90 s.
 */
export function criarApi(fonte: Fonte, op: Opcoes = {}) {
  const f = op.fetch ?? fetch;
  const esperar = op.esperar ?? dormir;
  let primeira = true;

  async function chamar<T>(
    caminho: string,
    params: Record<string, string | number>,
    metodo: 'GET' | 'POST' = 'GET',
  ): Promise<Envelope<T>> {
    // Parâmetro vazio vai como string vazia: o texto "null" zera os totalizadores sem erro.
    const corpo = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
    const url = new URL(caminho, fonte.api);
    if (metodo === 'GET') url.search = corpo.toString();

    for (let tentativa = 1; ; tentativa++) {
      if (!primeira) await esperar(fonte.intervaloMs);
      primeira = false;

      let resp: Response;
      try {
        resp = await f(url, {
          method: metodo,
          headers: {
            'User-Agent': fonte.userAgent,
            ...(metodo === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
          },
          ...(metodo === 'POST' ? { body: corpo.toString() } : {}),
        });
      } catch (erro) {
        if (tentativa >= TENTATIVAS) throw new Error(`${caminho}: falha de rede`, { cause: erro });
        await esperar(5000 * tentativa);
        continue;
      }

      if (resp.status === 429 || resp.status === 403) {
        if (tentativa > TENTATIVAS) throw new Error(`${caminho}: portal pediu verificação (${resp.status})`);
        await esperar(30000 * tentativa);
        continue;
      }
      if (resp.status >= 500 && tentativa < TENTATIVAS) {
        await esperar(5000 * tentativa);
        continue;
      }
      if (!resp.ok) throw new Error(`${caminho}: HTTP ${resp.status}`);

      const json = (await resp.json()) as Envelope<T>;
      if (json.status !== 'success' && json.status !== true) {
        throw new Error(`${caminho}: status ${JSON.stringify(json.status)}`);
      }
      return json;
    }
  }

  /** `mes` é array de inteiros: mandar string dá erro de conversão no portal. Sem `mes` = ano inteiro. */
  const filtros = (tipo: number, ano: number, mes?: number) =>
    JSON.stringify({
      ...FILTROS_EXTRAS[tipo],
      entidade: String(fonte.entidade),
      tipo: String(tipo),
      ano: String(ano),
      ...(mes ? { mes: [mes] } : {}),
    });

  return {
    /** Empenhos de um mês inteiro em uma chamada: paginar repete e pula linhas. */
    async listarDespesas(ano: number, mes: number, tipo: number): Promise<Linha[]> {
      const r = await chamar<Linha[] | null>(
        'Usuario/Despesas/Listar',
        { token: fonte.token, jsonfiltros: filtros(tipo, ano, mes), draw: 1, start: 0, length: 20000 },
        'POST',
      );
      const linhas: Linha[] = r.data ?? [];
      if (linhas.length !== r.recordsTotal) {
        throw new Error(`Listar ${ano}/${mes} tipo ${tipo}: vieram ${linhas.length} de ${r.recordsTotal} linhas`);
      }
      return linhas;
    },

    /** Os cartões do portal (visão "todas", tipo 10), em centavos. Sem `mes` = ano inteiro. */
    async totalizador(ano: number, mes?: number): Promise<Valores> {
      const r = await chamar<{ valorEmpenhado: number; valorLiquidado: number; valorPago: number }[]>(
        'Usuario/Despesas/ListarValores',
        { token: fonte.token, jsonfiltros: filtros(10, ano, mes) },
      );
      const v = r.data[0];
      if (!v) throw new Error(`ListarValores ${ano}/${mes ?? 'ano'}: sem dados`);
      return { e: centavos(v.valorEmpenhado), l: centavos(v.valorLiquidado), p: centavos(v.valorPago) };
    },

    /** Tabelas nome → código. Só valem para o ano corrente (o portal não aceita ano). Nome repetido fica de fora. */
    async codigos(): Promise<Codigos> {
      const tabela = async (caminho: string, codigo: string, nome: string) => {
        const r = await chamar<Record<string, string | number>[]>(`Usuario/Despesas/${caminho}`, { token: fonte.token });
        const m = new Map<string, number | null>();
        for (const x of r.data) {
          const n = String(x[nome]).trim();
          m.set(n, m.has(n) ? null : Number(x[codigo]));
        }
        return Object.fromEntries(
          [...m].filter((e): e is [string, number] => e[1] !== null).sort(([a], [b]) => a.localeCompare(b, 'pt-BR')),
        );
      };
      return {
        funcao: await tabela('ListaFuncoes', 'codigo', 'descricao'),
        orgao: await tabela('ListaOrgaos', 'codigo', 'descricao'),
        vinculo: await tabela('ListaVinculos', 'codigoVinculo', 'descricaoVinculo'),
      };
    },
  };
}
