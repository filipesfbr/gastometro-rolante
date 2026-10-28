export type Fonte = {
  api: string;
  portal: string;
  portalDespesas: string;
  token: string;
  entidade: number;
  ibge: string;
  repositorio: string;
  userAgent: string;
  intervaloMs: number;
};

/** Visões do portal que o site mostra, com o `tipo` do `jsonfiltros` e o campo de área do `Listar`. */
export const DIMENSOES = {
  funcao: { tipo: 4, campo: 'descricaoFuncao' },
  elemento: { tipo: 2, campo: 'descricaoElemento' },
  orgao: { tipo: 5, campo: 'descricaoOrgao' },
  vinculo: { tipo: 7, campo: 'descricaoVinculo' },
} as const;

export type Dimensao = keyof typeof DIMENSOES;

/** Empenhado, liquidado e pago, em centavos. */
export type Valores = { e: number; l: number; p: number };

/**
 * Registro de `Listar` (um por empenho), só com os campos lidos. A API traz também credor, fornecedor,
 * histórico, itens e pagamentos do empenho: nada disso entra no tipo nem sai da memória (R8).
 */
export type Linha = {
  data: string;
  valorEmpenhado: number;
  valorLiquidado: number;
  valorPago: number;
  descricaoFuncao?: string | null;
  descricaoElemento?: string | null;
  descricaoOrgao?: string | null;
  descricaoVinculo?: string | null;
};

/** Empenhos somados por (data, área), em centavos. */
export type Agregado = { d: string; a: string } & Valores;

export type Validacao = { soma: Valores; totalizador: Valores; ok: boolean };

export type Totais = Valores & { por_mes: Record<string, Valores> };

/** Nome da área (com `trim`) → código do portal, para o link "conferir no portal" (R4). */
export type Codigos = Record<'funcao' | 'orgao' | 'vinculo', Record<string, number>>;

export type Alteracao = {
  detectado_em: string;
  ano: number;
  mes: number;
  area: string;
  campo: 'e' | 'p';
  antes: number;
  depois: number;
};

export type Populacao = Record<string, Record<string, number>>;
