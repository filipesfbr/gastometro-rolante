import { useState } from 'react';
import { acumulado, variacao } from '../lib/compare.ts';
import { formatDate, formatEixo, MESES, MESES_EXTENSO } from '../lib/format.ts';
import { Delta, IcoTabela, useDados } from './ui.tsx';

type Serie = (number | null)[];

/** Rótulo do eixo: "jan" ou, em gráfico estreito, "j" (o CSS escolhe). */
const Mes = ({ m }: { m: string }) => (
  <>
    <span className="ext">{m}</span>
    <span className="ini">{m[0]}</span>
  </>
);

/** Escala "redonda" com 4 divisões, na unidade em que o eixo é lido (mi ou mil). */
export function escala(maximo: number) {
  const mi = maximo >= 1e8;
  const unidade = mi ? 1e8 : 1e5;
  const bruto = Math.max(maximo / unidade, 1) / 4;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const passo = ([1, 2, 2.5, 5, 10].find((m) => m * pot >= bruto) ?? 10) * pot;
  return {
    max: passo * 4 * unidade,
    marcas: [0, 1, 2, 3, 4].map((i) => ({ v: passo * i * unidade, l: formatEixo(passo * i) })),
    nome: mi ? 'milhões de reais' : 'milhares de reais',
  };
}

type Props = {
  atual: Serie;
  anterior: Serie | null;
  /** Mês em andamento (1–12) do ano atual. */
  parcial: number | null;
  rotulo: string;
};

/** Barras mês a mês, ano atual × anterior, com seleção por botão e tabela equivalente. */
export function Barras({ atual, anterior, parcial, rotulo }: Props) {
  const { ano, atual: resumo, brl } = useDados();
  const ultimo = atual.reduce<number>((u, v, i) => (v === null ? u : i), 0);
  const [sel, setSel] = useState(ultimo);
  const [tabela, setTabela] = useState(false);
  const esc = escala(Math.max(...atual.map((v) => v ?? 0), ...(anterior ?? []).map((v) => v ?? 0)));
  const h = (v: number | null | undefined) => `${Math.max(((v ?? 0) / esc.max) * 100, 0).toFixed(2)}%`;
  const dia = formatDate(resumo.ate).slice(0, 5);

  const leitura = (i: number) => {
    const a = atual[i] ?? null;
    const b = anterior?.[i] ?? null;
    const ehParcial = i + 1 === parcial;
    return {
      titulo: ehParcial ? `${MESES_EXTENSO[i]} · parcial até ${dia}` : `${MESES_EXTENSO[i]} de ${ano}`,
      a,
      b,
      delta: a === null || ehParcial ? null : variacao(a, b),
      nota:
        a === null
          ? `Mês ainda não ocorrido. O valor de ${ano - 1} aparece para referência.`
          : ehParcial
            ? `Mês incompleto: o de ${ano - 1} está fechado, por isso não calculamos variação.`
            : '',
    };
  };
  const rd = leitura(sel);

  return (
    <>
      <button type="button" className="btn2" aria-pressed={tabela} onClick={() => setTabela(!tabela)} style={{ alignSelf: 'flex-start' }}>
        <IcoTabela />
        {tabela ? 'Ver como gráfico' : 'Ver como tabela'}
      </button>
      {tabela ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <caption style={{ textAlign: 'left', fontSize: 14, color: 'var(--ink-3)', paddingBottom: 8 }}>{rotulo} por mês</caption>
            <thead>
              <tr>
                <th>Mês</th>
                <th className="r">{ano}</th>
                {anterior && <th className="r">{ano - 1}</th>}
                {anterior && <th className="r">Variação</th>}
              </tr>
            </thead>
            <tbody>
              {MESES.map((m, i) => {
                const r = leitura(i);
                return (
                  <tr key={m}>
                    <td>{m}</td>
                    <td className="r num">{r.a === null ? '—' : `${brl(r.a)}${i + 1 === parcial ? ' (parcial)' : ''}`}</td>
                    {anterior && <td className="r num">{r.b === null ? '—' : brl(r.b)}</td>}
                    {anterior && <td className="r">{r.delta === null ? '—' : <Delta v={r.delta} />}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="lgd">
            <span><i style={{ background: 'var(--cur)' }} />{ano}</span>
            {anterior && <span><i style={{ background: 'var(--prev)' }} />{ano - 1}</span>}
            {parcial && <span><i className="bpart" />{ano}, mês incompleto</span>}
          </div>
          <div className="chart" role="group" aria-label={`Gráfico de barras: ${rotulo.toLowerCase()} por mês. Há uma tabela equivalente no botão "Ver como tabela".`}>
            <div className="plot">
              {esc.marcas.map((g) => (
                <div key={g.v} className="gl" style={{ bottom: h(g.v) }}>
                  <span>{g.l}</span>
                </div>
              ))}
              <div className="cols">
                {MESES.map((m, i) => {
                  const r = leitura(i);
                  return (
                    <button
                      key={m}
                      type="button"
                      className="mcol"
                      aria-pressed={sel === i}
                      aria-label={`${MESES_EXTENSO[i]}: ${r.a === null ? 'mês ainda não ocorrido' : `${ano}, ${brl(r.a)}${i + 1 === parcial ? ' (mês incompleto)' : ''}`}${r.b === null ? '' : `; ${ano - 1}, ${brl(r.b)}`}`}
                      onClick={() => setSel(i)}
                    >
                      {anterior && <b className="bprev" style={{ height: h(r.b) }} />}
                      <b className={i + 1 === parcial ? 'bpart' : 'bcur'} style={{ height: h(r.a) }} />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mlabs" aria-hidden="true">
              {MESES.map((m, i) => (
                <span key={m} className={atual[i] === null ? 'fut' : ''}><Mes m={m} /></span>
              ))}
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginLeft: 34 }}>Eixo em {esc.nome}.</p>
          </div>
          <div className="read" aria-live="polite">
            <p style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-.02em' }}>{rd.titulo}</p>
            <p className="num"><b>{rd.a === null ? '—' : brl(rd.a)}</b> em {ano}</p>
            {anterior && <p className="num" style={{ color: 'var(--ink-2)' }}>{rd.b === null ? '—' : brl(rd.b)} em {ano - 1}</p>}
            {rd.delta !== null && <Delta v={rd.delta} />}
            {rd.nota && <p style={{ fontSize: 14, color: 'var(--ink-2)', flex: 1, minWidth: 200 }}>{rd.nota}</p>}
          </div>
        </>
      )}
    </>
  );
}

/** Acumulado no ano: linha contínua no ano atual, tracejada no anterior. */
export function Acumulado({ atual, anterior }: { atual: Serie; anterior: Serie | null }) {
  const { ano, brl } = useDados();
  const [tabela, setTabela] = useState(false);
  const a = acumulado(atual);
  const b = anterior ? acumulado(anterior) : null;
  const esc = escala(Math.max(...a.map((v) => v ?? 0), ...(b ?? []).map((v) => v ?? 0)));
  const pontos = (s: (number | null)[]) =>
    ['0,100', ...s.flatMap((v, i) => (v === null ? [] : [`${(i + 1) * 10},${(100 - (v / esc.max) * 100).toFixed(2)}`]))].join(' ');

  return (
    <>
      <button type="button" className="btn2" aria-pressed={tabela} onClick={() => setTabela(!tabela)} style={{ alignSelf: 'flex-start' }}>
        <IcoTabela />
        {tabela ? 'Ver como gráfico' : 'Ver como tabela'}
      </button>
      {tabela ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <caption style={{ textAlign: 'left', fontSize: 14, color: 'var(--ink-3)', paddingBottom: 8 }}>Acumulado até o fim de cada mês</caption>
            <thead>
              <tr><th>Mês</th><th className="r">{ano}</th>{b && <th className="r">{ano - 1}</th>}</tr>
            </thead>
            <tbody>
              {MESES.map((m, i) => (
                <tr key={m}>
                  <td>{m}</td>
                  <td className="r num">{a[i] == null ? '—' : brl(a[i]!)}</td>
                  {b && <td className="r num">{b[i] == null ? '—' : brl(b[i]!)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="lgd">
            <span><i style={{ background: 'var(--cur)' }} />{ano} (linha contínua)</span>
            {b && <span><i style={{ background: 'var(--prev)' }} />{ano - 1} (tracejada)</span>}
          </div>
          <div className="chart" role="img" aria-label={`Acumulado no ano: ${ano} chega a ${brl(a.filter((v) => v !== null).at(-1) ?? 0)}${b ? `; ${ano - 1} fechou em ${brl(b.at(-1) ?? 0)}` : ''}.`}>
            <div className="plot">
              {esc.marcas.map((g) => (
                <div key={g.v} className="gl" style={{ bottom: `${(g.v / esc.max) * 100}%` }}>
                  <span>{g.l}</span>
                </div>
              ))}
              <svg viewBox="0 0 120 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }} aria-hidden="true">
                {b && <polyline points={pontos(b)} fill="none" stroke="var(--prev)" strokeWidth="3" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />}
                <polyline points={pontos(a)} fill="none" stroke="var(--cur)" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="mlabs" style={{ marginTop: 6 }} aria-hidden="true">
              {MESES.map((m) => <span key={m}><Mes m={m} /></span>)}
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginLeft: 34, marginTop: 8 }}>Eixo em {esc.nome}.</p>
          </div>
        </>
      )}
    </>
  );
}
