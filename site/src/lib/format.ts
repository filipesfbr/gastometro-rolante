// Toda a formatação pt-BR do site. Valores monetários entram em centavos inteiros.

const MENOS = '−';
// Espaço inseparável: "R$" e "mi"/"mil" nunca ficam sozinhos no fim da linha.
const NBSP = ' ';
const nf = (min: number, max = min) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max });
const n0 = nf(0);
const n1 = nf(1);
const n2 = nf(2);

export const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const MESES_EXTENSO = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const sinal = (v: number) => (v < 0 ? MENOS : '');

/** 10599142190 → "R$ 105.991.421,90" */
export const formatBRL = (centavos: number) => `${sinal(centavos)}R$${NBSP}${n2.format(Math.abs(centavos) / 100)}`;

/** 10599142190 → "R$ 106,0 mi" · 73217517 → "R$ 732 mil" · 1659260 → "R$ 16,6 mil" · 440647232 → "R$ 4,41 mi" */
export function formatBRLShort(centavos: number): string {
  const r = Math.abs(centavos) / 100;
  let s: string;
  // Os limites ficam meio passo antes da unidade seguinte: o arredondamento não pode sair "1.000 mil".
  if (r >= 999_500) s = `${(r >= 9_995_000 ? n1 : n2).format(r / 1e6)}${NBSP}mi`;
  else if (r >= 1e3) s = `${(r >= 99_950 ? n0 : n1).format(r / 1e3)}${NBSP}mil`;
  else s = n2.format(r);
  return `${sinal(centavos)}R$${NBSP}${s}`;
}

/** Valor em milhões para eixos e leituras de gráfico: 1033599526 → "10,34" */
export const formatMi = (centavos: number) => n2.format(centavos / 1e8);

/** 74.31 → "74,31%" */
export const formatPct = (v: number, casas = 2) => `${nf(casas).format(v)}%`;

/** −35.4 → "−35,4%" · 10.1 → "+10,1%" */
export const formatVariation = (v: number) => `${v > 0 ? '+' : v < 0 ? MENOS : ''}${n1.format(Math.abs(v))}%`;

/** "2026-10-26" → "26/10/2026" */
export const formatDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** "2026-01-01", "2026-10-26" → "01/01 a 26/10/2026" */
export const formatPeriod = (inicio: string, fim: string) => `${formatDate(inicio).slice(0, 5)} a ${formatDate(fim)}`;

/** "2026-10-27T06:00:12-03:00" → "27/10/2026 06:00" (o horário já vem em Brasília) */
export const formatDateTime = (iso: string) => `${formatDate(iso)} ${iso.slice(11, 16)}`;

/** 487255 (centavos por habitante) → "R$ 4.872,55/hab." */
export const formatPerCapita = (centavos: number) => `${formatBRL(centavos)}/hab.`;

export const formatInt = (n: number) => n0.format(n);

/** Rótulo de eixo: 2.5 → "2,5" */
export const formatEixo = (n: number) => nf(0, 2).format(n);
