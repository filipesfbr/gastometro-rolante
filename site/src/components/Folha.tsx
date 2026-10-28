import { variacao } from '../lib/compare.ts';
import { formatDate, formatPct, formatPerCapita, MESES_EXTENSO } from '../lib/format.ts';
import { usePopulacao } from './Topo.tsx';
import { Delta, Fonte, useDados } from './ui.tsx';

/** Folha de pagamento: os elementos de pessoal da Portaria 163/2001 (config/folha.json), somados. */
export function Folha() {
  const { dados, ano, atual, anterior, brl } = useDados();
  const pop = usePopulacao();
  const f = atual.folha;
  const fAnt = atual.anterior?.folha;
  const f2 = atual.folha_2_anos_antes;
  // Pago no mesmo período (01/01 até o último empenho) e no ano inteiro, do ano mais recente ao mais antigo.
  const comparacao = (
    [
      [ano, f.p, undefined],
      [ano - 1, fAnt?.p, anterior?.folha.p],
      [ano - 2, f2?.periodo.p, f2?.ano.p],
    ] as const
  ).filter((x): x is readonly [number, number, number | undefined] => x[1] !== undefined);
  const maiorPeriodo = Math.max(...comparacao.map(([, p]) => p), 1);
  const [anoBase, pagoBase] = comparacao.at(-1)!;
  const crescimento = variacao(f.p, pagoBase);
  const parte = atual.total.p > 0 ? (f.p / atual.total.p) * 100 : 0;
  const maior = Math.max(
    ...f.por_mes.map((m) => m?.p ?? 0),
    ...(anterior?.folha.por_mes ?? []).map((m) => m?.p ?? 0),
    ...(f2?.por_mes ?? []).map((m) => m?.p ?? 0),
    1,
  );
  const ate = formatDate(atual.ate).slice(0, 5);

  return (
    <section id="folha" className="sec" aria-labelledby="h-folha">
      <div className="inv folha">
        <h2 id="h-folha" className="h2" style={{ maxWidth: '20ch' }}>
          A folha de pagamento leva {formatPct(parte, 0)} de tudo o que a prefeitura pagou
        </h2>
        <p className="mut" style={{ fontSize: 17, lineHeight: '26px', maxWidth: '60ch' }}>
          Salários, encargos, aposentadorias e pensões dos servidores, até {ate}. Os valores somam os elementos de despesa de pessoal da
          classificação federal, publicados pelo portal.
        </p>

        <div className="folha-g">
          <div className="folha-n">
            <span className="l">Custo da folha em {ano} (empenhado)</span>
            <span className="v num">{brl(f.e)}</span>
          </div>
          <div className="folha-n">
            <span className="l">Já pago em {ano}</span>
            <span className="v num">{brl(f.p)}</span>
          </div>
          {pop && (
            <div className="folha-n">
              <span className="l">Pago por habitante</span>
              <span className="v num">{formatPerCapita(Math.round(f.p / pop.pop))}</span>
            </div>
          )}
        </div>
        {comparacao.length > 1 && (
          <div className="folha-cmp">
            <h3 className="tit">
              {crescimento === null
                ? `Quanto foi pago de 01/01 a ${ate} em cada ano`
                : (
                  <>
                    Em {ano - anoBase === 2 ? 'dois anos' : 'um ano'}, a folha {crescimento >= 0 ? 'cresceu' : 'baixou'}{' '}
                    <span className="pct">{formatPct(Math.abs(crescimento), 1)}</span>
                  </>
                )}
            </h3>
            <p className="sub">
              De {brl(pagoBase)} em {anoBase} para {brl(f.p)} em {ano}.<br />Comparação do começo do ano até o momento.
            </p>
            <ul>
              <li className="cab" aria-hidden="true">
                <span className="val">De 01/01 a {ate}</span>
                <span className="tot">Ano inteiro</span>
              </li>
              {comparacao.map(([a, p, inteiro]) => {
                const v = a === ano ? null : variacao(f.p, p);
                return (
                  <li key={a} className={a === ano ? 'on' : ''}>
                    <span className="ano">{a}</span>
                    <span className="bar" aria-hidden="true">
                      <i style={{ width: `${(p / maiorPeriodo) * 100}%` }} />
                    </span>
                    <span className="val num">
                      {brl(p)}
                      <span className="sr"> pagos de 01/01 a {ate}</span>
                    </span>
                    <span className="tot num">
                      {inteiro === undefined ? 'em andamento' : brl(inteiro)}
                      <span className="sr">{inteiro === undefined ? '' : ' pagos no ano inteiro'}</span>
                    </span>
                    {v !== null && (
                      <span className="dif" title={`No mesmo período, ${ano} pagou ${formatPct(Math.abs(v), 1)} ${v >= 0 ? 'a mais' : 'a menos'} que ${a}`}>
                        <Delta v={v} />
                        <span className="sr"> em {ano} no mesmo período, em relação a {a}</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="panel" style={{ marginTop: 12 }}>
        <p style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-.02em' }}>Folha mês a mês</p>
        <p style={{ color: 'var(--ink-2)', margin: '4px 0 20px' }}>
          Pelo mês do empenho. Cada mês mostra o pago em cada ano, na mesma escala. {f2 ? `Os totais de ${ano - 1} e ${ano - 2} são os do mesmo período.` : `O total de ${ano - 1} é o do mesmo período.`}
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl mm">
            <thead>
              <tr>
                <th className="mes">Mês</th>
                <th className="r v0"><i className="sw y0" />Pago {ano}</th>
                <th className="barcol" aria-hidden="true" />
                {anterior && <th className="r v1"><i className="sw y1" />Pago {ano - 1}</th>}
                {f2 && <th className="r v2"><i className="sw y2" />Pago {ano - 2}</th>}
              </tr>
            </thead>
            <tbody>
              {MESES_EXTENSO.map((nome, i) => {
                const m = f.por_mes[i] ?? null;
                const a = anterior?.folha.por_mes[i] ?? null;
                const a2 = f2?.por_mes[i] ?? null;
                const parcial = i + 1 === atual.mes_parcial;
                return (
                  <tr key={nome} className={m ? '' : 'fut'}>
                    <td className="mes">
                      {nome}
                      {parcial && <span className="tag">parcial</span>}
                    </td>
                    <td className="r num v0" style={{ fontWeight: 600 }}>{m ? brl(m.p) : '—'}</td>
                    <td className="barcol" aria-hidden="true">
                      <span className="mbar">
                        {m && <i className="y0" style={{ width: `${(m.p / maior) * 100}%` }} />}
                        {a && <i className="y1" style={{ width: `${(a.p / maior) * 100}%` }} />}
                        {a2 && <i className="y2" style={{ width: `${(a2.p / maior) * 100}%` }} />}
                      </span>
                    </td>
                    {anterior && <td className="r num v1" style={{ color: 'var(--ink-2)' }}>{a ? brl(a.p) : '—'}</td>}
                    {f2 && <td className="r num v2" style={{ color: 'var(--ink-2)' }}>{a2 ? brl(a2.p) : '—'}</td>}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="mes">Total até {ate}</td>
                <td className="r num v0">{brl(f.p)}</td>
                <td className="barcol" />
                {anterior && <td className="r num v1">{fAnt ? brl(fAnt.p) : '—'}</td>}
                {f2 && <td className="r num v2">{brl(f2.periodo.p)}</td>}
              </tr>
            </tfoot>
          </table>
        </div>
        <details className="cods" style={{ marginTop: 20 }}>
          <summary>Quais elementos entram na folha ({f.elementos.length} em {ano})</summary>
          <p style={{ color: 'var(--ink-2)', margin: '8px 0 12px', maxWidth: '70ch' }}>
            {dados.folha.fonte}. Nomes como o portal publica; valores pagos em {ano}.
          </p>
          <ul className="els">
            {f.elementos.map((n) => (
              <li key={n}>
                <span>{n}</span>
                <span className="num">{brl(atual.elemento[n]!.p)}</span>
              </li>
            ))}
          </ul>
        </details>
        <Fonte dimensao="elemento" style={{ marginTop: 16 }} />
      </div>
    </section>
  );
}
