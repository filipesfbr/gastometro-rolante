import { describe, expect, it, vi } from 'vitest';
import linhas from './fixtures/despesas-mes.json' with { type: 'json' };
import { agregar } from '../src/agregar.ts';
import { criarApi } from '../src/api.ts';
import { diff } from '../src/diff.ts';
import { resumirAno } from '../src/resumo.ts';
import type { Agregado, Fonte } from '../src/tipos.ts';
import { validarMes } from '../src/validar.ts';

// empenhado 100,10 + 0,20 + 1000,55 − 50,11 · liquidado 100,10 + 500,25 · pago 90,00 + 500,25
const TOTAL = { e: 105074, l: 60035, p: 59025 };

describe('validar (R2)', () => {
  it('fecha quando as 3 somas são iguais ao totalizador', () => {
    expect(validarMes(linhas, TOTAL)).toEqual({ soma: TOTAL, totalizador: TOTAL, ok: true });
  });
  it.each(['e', 'l', 'p'] as const)('falha com 1 centavo de diferença em %s', (campo) => {
    expect(validarMes(linhas, { ...TOTAL, [campo]: TOTAL[campo] + 1 }).ok).toBe(false);
  });
});

describe('agregar', () => {
  it('soma em centavos por (data, área), com trim e negativos', () => {
    expect(agregar(linhas, 'descricaoFuncao')).toEqual([
      { d: '2026-09-01', a: 'Saúde', e: 10030, l: 10010, p: 9000 },
      { d: '2026-09-15', a: 'Educação', e: 95044, l: 50025, p: 50025 },
    ]);
  });
  it('área vazia é erro (tipos 5 e 7 sem os filtros extras)', () => {
    expect(() => agregar(linhas, 'descricaoOrgao')).toThrow('sem descricaoOrgao');
  });
  it('nunca leva dado de credor ou do empenho (R8)', () => {
    const saida = JSON.stringify(agregar(linhas, 'descricaoFuncao'));
    for (const proibido of ['nome', 'credor', 'fornecedor', 'descricaoLinha', 'FICTICIA', 'FICTICIO']) {
      expect(saida).not.toContain(proibido);
    }
  });
});

describe('diff (R5)', () => {
  const antes: Agregado[] = [
    { d: '2026-08-10', a: 'Saúde', e: 1000, l: 500, p: 400 },
    { d: '2026-09-02', a: 'Saúde', e: 300, l: 0, p: 0 },
  ];
  const coletaAnterior = '2026-09-05T06:47:00-03:00';

  it('pago e liquidado em alta não geram entrada; empenho novo em mês aberto também não', () => {
    const depois = [{ ...antes[0]!, l: 900, p: 900 }, { ...antes[1]!, e: 999 }];
    expect(diff(2026, antes, depois, coletaAnterior, '2026-10-27')).toEqual([]);
  });
  it('empenhado alterado e pago em queda geram entrada', () => {
    const depois = [{ ...antes[0]!, e: 800, p: 300 }, antes[1]!];
    const base = { detectado_em: '2026-10-27', ano: 2026, mes: 8, area: 'Saúde' };
    expect(diff(2026, antes, depois, coletaAnterior, '2026-10-27')).toEqual([
      { ...base, campo: 'e', antes: 1000, depois: 800 },
      { ...base, campo: 'p', antes: 400, depois: 300 },
    ]);
  });
});

describe('resumo', () => {
  const ag = (d: string, a: string, p: number): Agregado => ({ d, a, e: p, l: p, p });
  const vazio = { elemento: [], orgao: [], vinculo: [] };
  it('ordena por pago, separa por mês e compara com o mesmo período do ano anterior', () => {
    const atual = {
      agregados: { funcao: [ag('2026-01-05', 'Saúde', 10), ag('2026-02-03', 'Educação', 50)], ...vazio },
      totais: { e: 60, l: 60, p: 60, por_mes: { '1': { e: 10, l: 10, p: 10 }, '2': { e: 50, l: 50, p: 50 } } },
    };
    const anterior = {
      agregados: { funcao: [ag('2025-02-03', 'Saúde', 7), ag('2025-02-04', 'Saúde', 100)], ...vazio },
      totais: { e: 107, l: 107, p: 107, por_mes: {} },
    };
    const r = resumirAno(2026, atual, anterior, undefined, '2026-02-10', []);
    expect(Object.keys(r.funcao)).toEqual(['Educação', 'Saúde']);
    expect(r.funcao['Saúde']!.por_mes).toEqual([{ e: 10, l: 10, p: 10 }, { e: 0, l: 0, p: 0 }, ...Array(10).fill(null)]);
    expect(r.mes_parcial).toBe(2);
    expect(r.folha_2_anos_antes).toBeNull();
    expect(r.anterior).toEqual({
      ate: '2025-02-03',
      total: { e: 7, l: 7, p: 7 },
      funcao: { Saúde: { e: 7, l: 7, p: 7 } },
      elemento: {},
      folha: { e: 0, l: 0, p: 0 },
    });
  });

  it('folha soma os elementos de pessoal, sem acento nem caixa, por mês e no período anterior', () => {
    const el = [
      ag('2026-01-05', 'Vencimentos e vantagens fixas - pessoal civil', 100),
      ag('2026-02-05', 'Obrigacoes Patronais', 20),
      ag('2026-02-05', 'Obrigações patronais', 5),
      ag('2026-02-06', 'Material de consumo', 999),
    ];
    const atual = { agregados: { ...vazio, funcao: [ag('2026-02-05', 'Saúde', 1)], elemento: el }, totais: { e: 0, l: 0, p: 0, por_mes: {} } };
    const anterior = {
      agregados: { ...vazio, funcao: [], elemento: [ag('2025-01-10', 'Obrigações patronais', 7), ag('2025-03-01', 'Obrigações patronais', 50)] },
      totais: { e: 0, l: 0, p: 0, por_mes: {} },
    };
    const doisAntes = {
      agregados: { ...vazio, funcao: [], elemento: [ag('2024-01-10', 'Obrigacoes Patronais', 3), ag('2024-02-20', 'Obrigações patronais', 40), ag('2024-01-11', 'Material de consumo', 999)] },
      totais: { e: 0, l: 0, p: 0, por_mes: {} },
    };
    const r = resumirAno(2026, atual, anterior, doisAntes, '2026-02-10', ['Vencimentos e vantagens fixas - pessoal civil', 'Obrigações patronais']);
    expect(r.folha.p).toBe(125);
    expect(r.folha.por_mes.slice(0, 3)).toEqual([{ e: 100, l: 100, p: 100 }, { e: 25, l: 25, p: 25 }, null]);
    expect(r.folha.elementos).toHaveLength(3);
    expect(r.anterior!.folha.p).toBe(7);
    // Até 05/02 de 2024 (dia do último empenho de 2026); o ano inteiro e o mês a mês vão até dezembro.
    const f2 = r.folha_2_anos_antes!;
    expect(f2.ate).toBe('2024-02-05');
    expect(f2.periodo.p).toBe(3);
    expect(f2.ano.p).toBe(43);
    expect(f2.por_mes.slice(0, 3)).toEqual([{ e: 3, l: 3, p: 3 }, { e: 40, l: 40, p: 40 }, { e: 0, l: 0, p: 0 }]);
  });
});

describe('api', () => {
  const fonte = { api: 'https://api.exemplo/', token: 't', entidade: 0, userAgent: 'teste', intervaloMs: 2000 } as Fonte;
  const resposta = (status: number, corpo: unknown = {}) => new Response(JSON.stringify(corpo), { status });
  const valores = { valorEmpenhado: 10.5, valorLiquidado: 2, valorPago: 1.01, valorAPagar: 0 };

  it('429 → espera e tenta de novo', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(resposta(429))
      .mockResolvedValueOnce(resposta(200, { status: 'success', data: [valores] }));
    const esperar = vi.fn().mockResolvedValue(undefined);
    const api = criarApi(fonte, { fetch, esperar });
    expect(await api.totalizador(2026, 1)).toEqual({ e: 1050, l: 200, p: 101 });
    expect(esperar).toHaveBeenCalledWith(30000);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('manda mes como array e os filtros extras do tipo 5', async () => {
    const fetch = vi.fn().mockResolvedValue(resposta(200, { status: true, recordsTotal: 0, data: [] }));
    await criarApi(fonte, { fetch, esperar: async () => {} }).listarDespesas(2026, 9, 5);
    const corpo = new URLSearchParams(fetch.mock.calls[0]![1].body as string);
    expect(JSON.parse(corpo.get('jsonfiltros')!)).toEqual({ orgao: '0', dinamic: '0', entidade: '0', tipo: '5', ano: '2026', mes: [9] });
    expect(corpo.get('length')).toBe('20000');
  });

  it('data.length != recordsTotal → erro', async () => {
    const fetch = vi.fn().mockResolvedValue(resposta(200, { status: true, recordsTotal: 3, data: [linhas[0]] }));
    const api = criarApi(fonte, { fetch, esperar: async () => {} });
    await expect(api.listarDespesas(2026, 1, 4)).rejects.toThrow('vieram 1 de 3');
  });

  it('códigos: trim e nome repetido fica de fora', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(resposta(200, { status: 'success', data: [{ codigo: 10, descricao: 'Saúde   ' }] }))
      .mockResolvedValueOnce(resposta(200, { status: 'success', data: [] }))
      .mockResolvedValueOnce(
        resposta(200, {
          status: 'success',
          data: [
            { codigoVinculo: 500, descricaoVinculo: 'Livre' },
            { codigoVinculo: 1, descricaoVinculo: 'Repetido' },
            { codigoVinculo: 2, descricaoVinculo: 'Repetido' },
          ],
        }),
      );
    const api = criarApi(fonte, { fetch, esperar: async () => {} });
    expect(await api.codigos()).toEqual({ funcao: { Saúde: 10 }, orgao: {}, vinculo: { Livre: 500 } });
  });
});
