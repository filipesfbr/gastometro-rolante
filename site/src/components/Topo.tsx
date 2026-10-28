import { useEffect, useState } from 'react';
import { pontos } from '../lib/compare.ts';
import { formatPct } from '../lib/format.ts';
import { Fonte, Seg, useDados } from './ui.tsx';

/** Anima de 0 até o valor real uma vez (900 ms). Nunca um contador por estimativa (R1). */
function useContagem(alvo: number) {
  const [v, setV] = useState(() => (matchMedia('(prefers-reduced-motion: reduce)').matches ? alvo : 0));
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return setV(alvo);
    const t0 = performance.now();
    let id = 0;
    const passo = (t: number) => {
      const p = Math.min((t - t0) / 900, 1);
      setV(Math.round(alvo * (1 - (1 - p) ** 3)));
      if (p < 1) id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [alvo]);
  return v;
}

/** Estimativa do IBGE do próprio ano ou, se ainda não saiu, a mais recente antes dele. */
export function usePopulacao() {
  const { dados, ano } = useDados();
  const anoPop = Object.keys(dados.populacao).map(Number).filter((a) => a <= ano).sort().at(-1);
  return anoPop ? { ano: anoPop, pop: dados.populacao[anoPop]! } : null;
}

const CORES = [
  'var(--accent)',
  'color-mix(in srgb,var(--accent) 55%,var(--ink))',
  'color-mix(in srgb,var(--accent) 30%,var(--ink))',
  'color-mix(in srgb,var(--accent) 50%,var(--bg))',
  'var(--line-strong)',
];

/** Folha + os 3 maiores elementos de fora dela + o resto: as fatias da barra "de cada R$ 100". */
function useFatias() {
  const { atual } = useDados();
  const naFolha = new Set(atual.folha.elementos);
  const fora = Object.entries(atual.elemento).filter(([n]) => !naFolha.has(n));
  const maiores = fora.slice(0, 3).map(([n, v]) => ({ nome: n, p: v.p }));
  const resto = atual.total.p - atual.folha.p - maiores.reduce((s, x) => s + x.p, 0);
  const fatias = [{ nome: 'Folha de pagamento', p: atual.folha.p }, ...maiores, { nome: 'Todo o resto', p: resto }];
  const pts = pontos(fatias.map((f) => f.p));
  return fatias.map((f, i) => ({ ...f, reais: pts[i]!, cor: CORES[i]! }));
}

export function Hero() {
  const { atual, exato, setExato, brl } = useDados();
  const valor = useContagem(atual.total.p);
  const fatias = useFatias();
  return (
    <section id="inicio" className="hero" aria-labelledby="h-hero">
      <h1 id="h-hero">
        <span className="hero-t">Para onde foram os</span>
        <span className="bignum num" style={exato ? undefined : { fontSize: 'clamp(40px,13cqw,128px)' }}>
          <span aria-hidden="true">{brl(valor)}</span>
          <span className="sr">{brl(atual.total.p)}</span>
        </span>
        <span className="hero-t" style={{ marginTop: 0 }}>pagos pela Prefeitura de Rolante/RS</span>
      </h1>

      <div className="cem" style={{ marginTop: 36 }}>
        <p className="cem-t">De cada R$&nbsp;100 pagos, quanto foi para cada gasto</p>
        <div className="stk" role="img" aria-label="Divisão de cada R$ 100 pagos entre os gastos listados abaixo">
          {fatias.map((f) => f.reais > 0 && <i key={f.nome} style={{ flexGrow: f.reais, background: f.cor }} />)}
        </div>
        <ul className="cem-l">
          {fatias.map((f) => f.reais > 0 && (
            <li key={f.nome} aria-label={`${f.nome}: R$ ${f.reais} de cada R$ 100 (${brl(f.p)})`}>
              <span className="v num"><i className="sw" style={{ background: f.cor }} aria-hidden="true" />R$&nbsp;{f.reais}</span>
              <span className="n">{f.nome}</span>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 24px', alignItems: 'center', justifyContent: 'flex-end', marginTop: 28 }}>
        <div className="srcbox">
          <Fonte dimensao="elemento" />
        </div>
        <Seg sm label="Formato dos valores" valor={exato} opcoes={[[false, 'Abreviado'], [true, 'Valor exato']]} onChange={setExato} />
      </div>
    </section>
  );
}

const ETAPAS = [
  { id: 'e', nome: 'Empenhado', explica: 'Comprometido: a prefeitura reservou o dinheiro para um gasto.' },
  { id: 'l', nome: 'Liquidado', explica: 'Entregue: o serviço foi prestado ou o material chegou, e a prefeitura conferiu.' },
  { id: 'p', nome: 'Pago', explica: 'O dinheiro saiu da conta da prefeitura.' },
] as const;

const Seta = () => (
  <svg className="seta" width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
    <path d="M6 14h15M16 8l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function Caminho() {
  const { ano, atual, brl } = useDados();
  const t = atual.total;
  const pct = (v: number) => (t.e > 0 ? (v / t.e) * 100 : 0);
  return (
    <section id="caminho" className="sec" aria-labelledby="h-cam">
      <p className="eyebrow">O caminho do dinheiro · {ano}</p>
      <h2 id="h-cam" className="h2">Do compromisso ao pagamento</h2>
      <p className="lead">Todo gasto público passa por três etapas. Os valores somam todos os empenhos de {ano}.</p>
      <ol className="passos">
        {ETAPAS.map((e, i) => (
          <li key={e.id} className="passo">
            {i > 0 && <Seta />}
            <div className="passo-c">
              <span className="n">
                <span className="i num">{i + 1}</span>
                {e.nome}
              </span>
              <span className="v num">{brl(t[e.id])}</span>
              <span className="p num">{e.id === 'e' ? 'ponto de partida' : `${formatPct(pct(t[e.id]), 1)} do empenhado`}</span>
              <span className="d">{e.explica}</span>
            </div>
          </li>
        ))}
      </ol>
      <div className="panel" style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(260px,100%),1fr))', gap: '18px 28px' }}>
        <div className="stat">
          <span className="l">Falta pagar (empenhado − pago)</span>
          <span className="v">{brl(t.e - t.p)}</span>
        </div>
        <div className="stat">
          <span className="l">Já entregue, ainda não pago (liquidado − pago)</span>
          <span className="v">{brl(t.l - t.p)}</span>
        </div>
        <p className="d" style={{ gridColumn: '1/-1', maxWidth: '70ch' }}>
          O mês de cada gasto é o mês do empenho. O valor pago mostra quanto desse compromisso já foi pago até hoje, por isso meses
          anteriores ainda podem crescer.
        </p>
        <Fonte style={{ gridColumn: '1/-1' }} />
      </div>
    </section>
  );
}
