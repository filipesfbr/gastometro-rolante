export type Retangulo = { x: number; y: number; w: number; h: number };

const soma = (a: number[]) => a.reduce((s, v) => s + v, 0);

/**
 * Treemap "squarified" (Bruls, Huizing e van Wijk, 2000): divide o retângulo w×h em blocos com área
 * proporcional a cada valor, o mais perto possível de quadrados. `valores` em ordem decrescente e > 0.
 */
export function treemap(valores: number[], w: number, h: number): Retangulo[] {
  const total = soma(valores);
  const areas = valores.map((v) => (total > 0 ? (v / total) * w * h : 0));
  const saida: Retangulo[] = [];
  let x = 0;
  let y = 0;
  let livreW = w;
  let livreH = h;

  // Pior proporção (lado maior ÷ lado menor) de uma fila encostada no lado `lado`.
  const pior = (fila: number[], lado: number) => {
    const s = soma(fila);
    return Math.max((lado * lado * Math.max(...fila)) / (s * s), (s * s) / (lado * lado * Math.min(...fila)));
  };

  for (let i = 0; i < areas.length; ) {
    const lado = Math.min(livreW, livreH);
    const fila = [areas[i]!];
    let j = i + 1;
    while (j < areas.length && pior([...fila, areas[j]!], lado) <= pior(fila, lado)) fila.push(areas[j++]!);

    const s = soma(fila);
    if (livreW >= livreH) {
      const largura = s / livreH;
      let cy = y;
      for (const a of fila) {
        saida.push({ x, y: cy, w: largura, h: a / largura });
        cy += a / largura;
      }
      x += largura;
      livreW -= largura;
    } else {
      const altura = s / livreW;
      let cx = x;
      for (const a of fila) {
        saida.push({ x: cx, y, w: a / altura, h: altura });
        cx += a / altura;
      }
      y += altura;
      livreH -= altura;
    }
    i = j;
  }
  return saida;
}
