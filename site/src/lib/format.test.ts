import { describe, expect, it } from 'vitest';
import { acumulado, pontos, variacao } from './compare.ts';
import {
  formatBRL,
  formatBRLShort,
  formatDate,
  formatDateTime,
  formatPct,
  formatPerCapita,
  formatPeriod,
  formatVariation,
} from './format.ts';

// Os valores usam espaço inseparável; nos testes ele vira espaço comum para legibilidade.
const txt = (s: string) => s.replace(/\u00a0/g, ' ');

describe('format', () => {
  it('moeda exata e abreviada', () => {
    expect(formatBRL(100)).toBe('R$\u00a01,00');
    expect(txt(formatBRL(10599142190))).toBe('R$ 105.991.421,90');
    expect(txt(formatBRL(-20011))).toBe('−R$ 200,11');
    expect(txt(formatBRLShort(10599142190))).toBe('R$ 106,0 mi');
    expect(txt(formatBRLShort(440647232))).toBe('R$ 4,41 mi');
    expect(txt(formatBRLShort(73217517))).toBe('R$ 732 mil');
    expect(txt(formatBRLShort(1659260))).toBe('R$ 16,6 mil');
    expect(txt(formatBRLShort(3100))).toBe('R$ 31,00');
    expect(txt(formatBRLShort(99999900))).toBe('R$ 1,00 mi');
    expect(txt(formatBRLShort(999499999))).toBe('R$ 9,99 mi');
  });
  it('percentuais e variação com sinal de menos verdadeiro', () => {
    expect(formatPct(74.31)).toBe('74,31%');
    expect(formatVariation(-35.4)).toBe('−35,4%');
    expect(formatVariation(10.1)).toBe('+10,1%');
  });
  it('datas', () => {
    expect(formatDate('2026-10-26')).toBe('26/10/2026');
    expect(formatPeriod('2026-01-01', '2026-10-26')).toBe('01/01 a 26/10/2026');
    expect(formatDateTime('2026-10-27T06:00:12-03:00')).toBe('27/10/2026 06:00');
  });
  it('por habitante', () => {
    expect(txt(formatPerCapita(487250))).toBe('R$ 4.872,50/hab.');
  });
});

describe('compare', () => {
  it('variação só com base positiva', () => {
    expect(variacao(110, 100)).toBeCloseTo(10);
    expect(variacao(5, 0)).toBeNull();
    expect(variacao(5, null)).toBeNull();
  });
  it('de cada R$ 100 soma 100', () => {
    expect(pontos([13.9, 83.3, 2.8])).toEqual([14, 83, 3]);
    expect(pontos([1, 1, 1]).reduce((a, b) => a + b)).toBe(100);
  });
  it('acumulado para no mês sem dado', () => {
    expect(acumulado([1, 2, null, 4])).toEqual([1, 3, null, null]);
  });
});
