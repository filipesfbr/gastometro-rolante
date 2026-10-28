import { useLayoutEffect, useRef, useState } from 'react';
import type { Dimensao } from '../../../coletor/src/tipos.ts';
import { variacao } from '../lib/compare.ts';
import { formatPct, formatPerCapita } from '../lib/format.ts';
import { treemap } from '../lib/treemap.ts';
import { Barras } from './Graficos.tsx';
import { usePopulacao } from './Topo.tsx';
import { Delta, Fonte, Seg, useDados } from './ui.tsx';

const VISOES: { d: Dimensao; aba: string; explica: string }[] = [
  { d: 'funcao', aba: 'Área', explica: 'As funções de governo: saúde, educação, administração…' },
  { d: 'orgao', aba: 'Secretaria', explica: 'Quem pagou: cada secretaria da prefeitura.' },
  { d: 'elemento', aba: 'Tipo de gasto', explica: 'O elemento de despesa: salários, material, serviços, obras…' },
  { d: 'vinculo', aba: 'Recurso', explica: 'De onde veio o dinheiro: recursos livres ou carimbados (saúde, educação, convênios).' },
];

const NO_MAPA = 11;
const OUTRAS = 'Outras';
/** Bloco onde cabem nome (uma linha, 12px) e valor ("R$ 3,33 mi" em 12px tem ~65px, mais o padding). */
const cabeNome = (r: { w: number; h: number }) => r.w >= 88 && r.h >= 50;
/** Na aba Secretaria o bloco mostra só o que distingue uma da outra; o nome completo fica no title e no detalhe. */
const SEM_PREFIXO = /^SECRETARIA\s+MUN(ICIPAL|\.)\s+(DE\s+)?/i;

/** Tamanho do elemento em pixels, para o treemap usar a proporção real (celular é mais alto que largo). */
function useTamanho<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [t, setT] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e && setT({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, t] as const;
}

export function Destino() {
  const { ano, atual } = useDados();
  const [d, setD] = useState<Dimensao>('funcao');
  const visao = VISOES.find((v) => v.d === d)!;
  return (
    <section id="destino" className="sec" aria-labelledby="h-dest">
      <p className="eyebrow">Pago em {ano} · classificações oficiais do portal</p>
      <h2 id="h-dest" className="h2">Para onde vai o dinheiro</h2>
      <div className="abas">
        <Seg label="Ver os gastos por" valor={d} opcoes={VISOES.map((v) => [v.d, v.aba])} onChange={setD} />
      </div>
      <p className="lead">
        {visao.explica} {Object.keys(atual[d]).length} no total. Toque num bloco para ver os detalhes.
      </p>
      <Mapa key={d} d={d} />
    </section>
  );
}

function Mapa({ d }: { d: Dimensao }) {
  const { ano, atual, brl } = useDados();
  const [ref, tam] = useTamanho<HTMLDivElement>();
  const areas = Object.entries(atual[d]).filter(([, v]) => v.p > 0);
  const [sel, setSel] = useState(areas[0]?.[0] ?? null);
  const montar = (k: number) => {
    const blocos = areas.slice(0, k).map(([n, v]) => ({ nome: n, p: v.p }));
    const resto = areas.slice(k);
    if (resto.length) blocos.push({ nome: OUTRAS, p: resto.reduce((s, [, v]) => s + v.p, 0) });
    return { blocos, resto, rets: tam.w > 0 ? treemap(blocos.map((b) => b.p), tam.w, tam.h) : [] };
  };
  // Quantos blocos o mapa mostra: o máximo em que todos cabem ao menos o nome (no celular sobram menos).
  let m = montar(NO_MAPA);
  for (let k = NO_MAPA - 1; k > 0 && !m.rets.every(cabeNome); k--) m = montar(k);
  const { blocos, resto, rets } = m;
  const total = atual.total.p;

  return (
    <>
      <div ref={ref} className="mapa" role="group" aria-label={`Mapa dos gastos de ${ano}: cada bloco tem área proporcional ao valor pago.`}>
        {rets.map((r, i) => {
          const b = blocos[i]!;
          const outras = b.nome === OUTRAS;
          const ativo = outras ? resto.some(([n]) => n === sel) : sel === b.nome;
          // Texto sempre com nome e valor (o mapa só mostra blocos onde cabem); o percentual só no cheio.
          // Larguras mínimas: o valor ("R$ 39,7 mi") tem ~110px no cheio e ~90px no curto, mais o padding.
          const nivel = r.w > 140 && r.h > 100 ? 'cheio' : r.w > 112 && r.h > 56 ? 'curto' : 'mini';
          // Linhas do nome = altura que sobra depois do valor e do percentual (medidas do app.css).
          const linhas = Math.max(1, Math.floor(nivel === 'cheio' ? (r.h - 82) / 19 : nivel === 'curto' ? (r.h - 46) / 19 : (r.h - 30) / 15));
          const nome = outras ? `Outras ${resto.length}` : b.nome;
          return (
            <button
              key={b.nome}
              type="button"
              className={`bloco ${nivel}${ativo ? ' on' : ''}${outras ? ' out' : ''}`}
              style={{ left: r.x, top: r.y, width: r.w, height: r.h }}
              aria-pressed={ativo}
              aria-label={`${nome}: ${brl(b.p)}, ${formatPct((b.p / total) * 100, 1)} do total`}
              title={nome}
              onClick={() => setSel(outras ? resto[0]![0] : b.nome)}
            >
              <span className="n" style={{ WebkitLineClamp: linhas }}>{d === 'orgao' ? nome.replace(SEM_PREFIXO, '') : nome}</span>
              <span className="v num">{brl(b.p)}</span>
              {nivel === 'cheio' && <span className="p num">{formatPct((b.p / total) * 100, 1)}</span>}
            </button>
          );
        })}
      </div>
      {sel && atual[d][sel] && <Detalhe d={d} nome={sel} />}
      <Lista d={d} sel={sel} setSel={setSel} />
    </>
  );
}

function Detalhe({ d, nome }: { d: Dimensao; nome: string }) {
  const { ano, atual, anterior, brl } = useDados();
  const pop = usePopulacao();
  const v = atual[d][nome]!;
  // Órgão e vínculo mudam de nome entre os anos: só função e elemento se comparam.
  const comparavel = d === 'funcao' || d === 'elemento';
  const ant = comparavel ? atual.anterior?.[d][nome]?.p : undefined;
  return (
    <div className="panel adetail" aria-live="polite">
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 16px' }}>
        <p style={{ fontWeight: 700, fontSize: 'clamp(22px,4cqw,32px)', letterSpacing: '-.02em', lineHeight: 1.15, marginRight: 'auto' }}>{nome}</p>
        <span className="num" style={{ color: 'var(--ink-2)' }}>
          {formatPct((v.p / atual.total.p) * 100, 1)} do total{pop && ` · ${formatPerCapita(Math.round(v.p / pop.pop))}`}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(180px,100%),1fr))', gap: '12px 28px' }}>
        <div className="stat"><span className="l">Empenhado</span><span className="v">{brl(v.e)}</span></div>
        <div className="stat"><span className="l">Liquidado</span><span className="v">{brl(v.l)}</span></div>
        <div className="stat"><span className="l">Pago</span><span className="v">{brl(v.p)}</span></div>
        {comparavel && (
          <div className="stat">
            <span className="l">{ano - 1}, mesmo período</span>
            <span className="v">{ant === undefined ? '—' : brl(ant)}</span>
            <Delta v={variacao(v.p, ant)} />
          </div>
        )}
      </div>
      <Barras
        atual={v.por_mes.map((m) => m?.p ?? null)}
        anterior={comparavel ? (anterior?.[d][nome]?.por_mes.map((m) => m?.p ?? null) ?? null) : null}
        parcial={atual.mes_parcial}
        rotulo={`${nome}: pago`}
      />
      <Fonte dimensao={d} area={nome} />
    </div>
  );
}

function Lista({ d, sel, setSel }: { d: Dimensao; sel: string | null; setSel: (n: string) => void }) {
  const { atual, brl } = useDados();
  const comparavel = d === 'funcao' || d === 'elemento';
  const areas = Object.entries(atual[d]);
  return (
    <details className="cods" style={{ marginTop: 12 }}>
      <summary>Ver a lista completa ({areas.length})</summary>
      <div style={{ overflowX: 'auto' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Nome no portal</th>
              <th className="r">Pago</th>
              <th className="r">% do total</th>
              {comparavel && <th className="r">Variação</th>}
            </tr>
          </thead>
          <tbody>
            {areas.map(([n, v]) => (
              <tr key={n} className={n === sel ? 'on' : ''}>
                <td>
                  <button type="button" className="lnk" onClick={() => setSel(n)}>{n}</button>
                </td>
                <td className="r num">{brl(v.p)}</td>
                <td className="r num">{atual.total.p > 0 ? formatPct((v.p / atual.total.p) * 100, 1) : '—'}</td>
                {comparavel && <td className="r"><Delta v={variacao(v.p, atual.anterior?.[d][n]?.p)} /></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
