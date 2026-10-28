import { somar, zero } from './agregar.ts';
import type { Agregado, Alteracao, Codigos, Dimensao, Fonte, Totais, Valores } from './tipos.ts';

type Meses = (Valores | null)[];

export type ResumoArea = Valores & { por_mes: Meses };
export type ResumoDimensao = Record<string, ResumoArea>;

export type ResumoAno = {
  ano: number;
  /** Último dia coberto: 31/12 em ano fechado, último empenho no ano corrente. */
  ate: string;
  /** Mês ainda em andamento (só no ano corrente): não se compara com mês fechado. */
  mes_parcial: number | null;
  total: Valores;
  por_mes: Meses;
  funcao: ResumoDimensao;
  elemento: ResumoDimensao;
  orgao: ResumoDimensao;
  vinculo: ResumoDimensao;
  /** Folha de pagamento: soma dos elementos de pessoal de `config/folha.json` (R6), com os elementos que entraram. */
  folha: Valores & { por_mes: Meses; elementos: string[] };
  /** Mesmo período (01/01 até o mesmo dia/mês) do ano anterior, se houver dados. Órgão não entra: os nomes mudam. */
  anterior: null | {
    ate: string;
    total: Valores;
    funcao: Record<string, Valores>;
    elemento: Record<string, Valores>;
    folha: Valores;
  };
  /** Folha de dois anos antes (desse ano só o tipo 2 é coletado): mesmo período, ano inteiro e mês a mês. */
  folha_2_anos_antes: null | { ate: string; periodo: Valores; ano: Valores; por_mes: Meses };
};

export type Resumo = {
  versao: 1;
  coletado_em: string;
  ultimo_empenho: string;
  fonte: Pick<Fonte, 'portal' | 'portalDespesas' | 'entidade' | 'repositorio'>;
  populacao: Record<string, number>;
  codigos: Codigos;
  /** Elementos que formam a folha de pagamento e a norma de onde vêm (R6). */
  folha: { fonte: string; elementos: string[] };
  validacao: { meses_ok: number; meses_total: number };
  historico: Alteracao[];
  anos: Record<string, ResumoAno>;
};

export type EntradaAno = { agregados: Record<Dimensao, Agregado[]>; totais: Totais };

function somarPeriodo(agregados: Agregado[], ate: string) {
  const total = zero();
  const porArea: Record<string, Valores> = {};
  for (const x of agregados) {
    if (x.d > ate) continue;
    somar(total, x);
    somar((porArea[x.a] ??= zero()), x);
  }
  return { total, porArea };
}

/** Compara nomes de elemento sem acento nem caixa: o portal tem "Obrigações patronais" e "Obrigacoes Patronais". */
export const chaveNome = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

export function resumirAno(
  ano: number,
  entrada: EntradaAno,
  anterior: EntradaAno | undefined,
  doisAntes: EntradaAno | undefined,
  hoje: string,
  elementosFolha: string[],
): ResumoAno {
  const folha = new Set(elementosFolha.map(chaveNome));
  const ehFolha = (nome: string) => folha.has(chaveNome(nome));
  const corrente = ano === Number(hoje.slice(0, 4));
  const ultimoNoAno = entrada.agregados.funcao.reduce((m, x) => (x.d > m ? x.d : m), `${ano}-01-01`);
  const ate = corrente ? ultimoNoAno : `${ano}-12-31`;
  const mesesColetados = corrente ? Number(hoje.slice(5, 7)) : 12;
  const meses = (): Meses => Array.from({ length: 12 }, (_, i) => (i < mesesColetados ? zero() : null));

  const dimensao = (agregados: Agregado[]): ResumoDimensao => {
    const r: ResumoDimensao = {};
    for (const x of agregados) {
      const area = (r[x.a] ??= { ...zero(), por_mes: meses() });
      somar(area, x);
      somar(area.por_mes[Number(x.d.slice(5, 7)) - 1]!, x);
    }
    // Maior pago primeiro: é a ordem em que o site mostra.
    return Object.fromEntries(Object.entries(r).sort(([, a], [, b]) => b.p - a.p));
  };

  let resumoAnterior: ResumoAno['anterior'] = null;
  if (anterior) {
    const ateAnterior = `${ano - 1}${ate.slice(4)}`;
    const f = somarPeriodo(anterior.agregados.funcao, ateAnterior);
    const el = somarPeriodo(anterior.agregados.elemento, ateAnterior);
    const folhaAnterior = Object.entries(el.porArea).reduce((s, [n, v]) => (ehFolha(n) ? somar(s, v) : s), zero());
    resumoAnterior = { ate: ateAnterior, total: f.total, funcao: f.porArea, elemento: el.porArea, folha: folhaAnterior };
  }

  let folha2: ResumoAno['folha_2_anos_antes'] = null;
  if (doisAntes) {
    folha2 = { ate: `${ano - 2}${ate.slice(4)}`, periodo: zero(), ano: zero(), por_mes: Array.from({ length: 12 }, () => zero()) };
    for (const x of doisAntes.agregados.elemento) {
      if (!ehFolha(x.a)) continue;
      somar(folha2.ano, x);
      somar(folha2.por_mes[Number(x.d.slice(5, 7)) - 1]!, x);
      if (x.d <= folha2.ate) somar(folha2.periodo, x);
    }
  }

  const elemento = dimensao(entrada.agregados.elemento);
  const resumoFolha: ResumoAno['folha'] = { ...zero(), por_mes: meses(), elementos: [] };
  for (const [nome, v] of Object.entries(elemento)) {
    if (!ehFolha(nome)) continue;
    resumoFolha.elementos.push(nome);
    somar(resumoFolha, v);
    v.por_mes.forEach((m, i) => m && somar(resumoFolha.por_mes[i]!, m));
  }

  const { por_mes: totalMes, ...total } = entrada.totais;
  return {
    ano,
    ate,
    mes_parcial: corrente ? mesesColetados : null,
    total,
    por_mes: meses().map((v, i) => (v === null ? null : (totalMes[String(i + 1)] ?? zero()))),
    funcao: dimensao(entrada.agregados.funcao),
    elemento,
    orgao: dimensao(entrada.agregados.orgao),
    vinculo: dimensao(entrada.agregados.vinculo),
    folha: resumoFolha,
    anterior: resumoAnterior,
    folha_2_anos_antes: folha2,
  };
}
