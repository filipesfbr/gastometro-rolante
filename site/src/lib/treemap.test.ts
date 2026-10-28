import { describe, expect, it } from 'vitest';
import { treemap } from './treemap.ts';

describe('treemap', () => {
  it('área de cada bloco é proporcional ao valor e cobre o retângulo sem sobra', () => {
    const valores = [60, 25, 10, 5];
    const r = treemap(valores, 160, 100);
    expect(r).toHaveLength(4);
    r.forEach((b, i) => expect(b.w * b.h).toBeCloseTo((valores[i]! / 100) * 160 * 100, 6));
    for (const b of r) {
      expect(b.x).toBeGreaterThanOrEqual(-1e-9);
      expect(b.y).toBeGreaterThanOrEqual(-1e-9);
      expect(b.x + b.w).toBeLessThanOrEqual(160 + 1e-9);
      expect(b.y + b.h).toBeLessThanOrEqual(100 + 1e-9);
    }
  });
  it('um valor só ocupa tudo', () => {
    expect(treemap([7], 10, 5)).toEqual([{ x: 0, y: 0, w: 10, h: 5 }]);
  });
});
