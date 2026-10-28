import { createContext, useContext, type ReactNode } from 'react';
import type { Resumo, ResumoAno } from '../../../coletor/src/resumo.ts';
import type { Dimensao } from '../../../coletor/src/tipos.ts';
import { formatBRL, formatBRLShort, formatDateTime, formatVariation } from '../lib/format.ts';
import { linkPortal } from '../lib/portal.ts';

export type Contexto = {
  dados: Resumo;
  ano: number;
  atual: ResumoAno;
  anterior: ResumoAno | undefined;
  exato: boolean;
  setExato: (v: boolean) => void;
};

export const Dados = createContext<Contexto | null>(null);

export function useDados() {
  const c = useContext(Dados);
  if (!c) throw new Error('useDados fora do provider');
  return { ...c, brl: (centavos: number) => (c.exato ? formatBRL(centavos) : formatBRLShort(centavos)) };
}

type Svg = { size?: number };
export const IcoSeta = ({ size = 12 }: Svg) => (
  <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
    <path d="M2.5 6h7M6.5 3l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const IcoExterno = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <path d="M4.5 2.5h5v5M9.5 2.5l-7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const IcoEscudo = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 1.5l5.5 2v4c0 3.2-2.3 5.6-5.5 7-3.2-1.4-5.5-3.8-5.5-7v-4l5.5-2z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5.6 8l1.7 1.7 3.2-3.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const IcoRelogio = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
    <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M10 5.5V10l3 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
export const IcoCheck = ({ size = 18 }: Svg) => (
  <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
    <path d="M4 9.5l3.2 3.2L14 5.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const IcoBaixar = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 2v8M4.5 7L8 10.5 11.5 7M3 13.5h10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const IcoTabela = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <rect x="2" y="3" width="12" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M2 7h12M6.5 7v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
  </svg>
);

/** Variação com sinal + seta + cor: nunca só a cor. */
export function Delta({ v }: { v: number | null }) {
  if (v === null) return <span className="pill neu">—</span>;
  const sobe = v > 0;
  return (
    <span className={`pill ${sobe ? 'up' : 'down'}`}>
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d={sobe ? 'M8 13V3M3.5 7.5L8 3l4.5 4.5' : 'M8 3v10M3.5 8.5L8 13l4.5-4.5'}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="sr">{sobe ? 'alta de' : 'queda de'}</span>
      {formatVariation(v)}
    </span>
  );
}

export function LinkPortal({ href, children = 'conferir no portal' }: { href: string; children?: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener">
      {children}
      <IcoExterno />
      <span className="sr">(abre o portal em nova aba)</span>
    </a>
  );
}

/** R4: rodapé de procedência que acompanha todo número. */
type FonteProps = { ano?: number; mes?: number; dimensao?: Dimensao; area?: string; antes?: ReactNode; style?: React.CSSProperties };
export function Fonte({ ano: anoLink, mes, dimensao, area, antes, style }: FonteProps) {
  const { dados, ano: anoAtual } = useDados();
  const ano = anoLink ?? anoAtual;
  const filtro = { ano, ...(mes ? { mes } : {}), ...(dimensao ? { dimensao } : {}), ...(area ? { area } : {}) };
  return (
    <div className="src" style={style}>
      {antes}
      <span>Fonte: Portal da Transparência de Rolante · coletado em {formatDateTime(dados.coletado_em)} ·</span>
      <LinkPortal href={linkPortal(dados.fonte, dados.codigos, filtro)} />
    </div>
  );
}

export function Seg<T extends string | number | boolean>({
  label,
  valor,
  opcoes,
  onChange,
  style,
  sm,
}: {
  label: string;
  valor: T;
  opcoes: [T, string][];
  onChange: (v: T) => void;
  style?: React.CSSProperties;
  sm?: boolean;
}) {
  return (
    <div className={sm ? 'seg sm' : 'seg'} role="group" aria-label={label} style={style}>
      {opcoes.map(([v, txt]) => (
        <button key={String(v)} type="button" className="segb" aria-pressed={valor === v} onClick={() => onChange(v)}>
          {txt}
        </button>
      ))}
    </div>
  );
}
