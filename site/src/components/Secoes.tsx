import { useState } from 'react';
import type { Dimensao } from '../../../coletor/src/tipos.ts';
import { formatDate, MESES_EXTENSO } from '../lib/format.ts';
import { Acumulado, Barras } from './Graficos.tsx';
import { Fonte, IcoBaixar, LinkPortal, Seg, useDados } from './ui.tsx';

type Campo = 'p' | 'e';
const CAMPOS: [Campo, string][] = [['p', 'Pago'], ['e', 'Empenhado']];

export function MesAMes() {
  const { ano, atual, anterior } = useDados();
  const [campo, setCampo] = useState<Campo>('p');
  const serie = (meses: typeof atual.por_mes) => meses.map((m) => m?.[campo] ?? null);
  const parcial = atual.mes_parcial;
  const nome = campo === 'p' ? 'Pago' : 'Empenhado';
  return (
    <section id="mes-a-mes" className="sec" aria-labelledby="h-mes">
      <h2 id="h-mes" className="h2">Mês a mês</h2>
      <p className="lead">
        {ano} ao lado de {ano - 1}, pelo mês do empenho.
        {parcial && ` ${MESES_EXTENSO[parcial - 1]![0]!.toUpperCase()}${MESES_EXTENSO[parcial - 1]!.slice(1)} está incompleto: vai só até ${formatDate(atual.ate).slice(0, 5)}.`}
      </p>
      <div className="panel" style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Seg label="O que mostrar no gráfico" valor={campo} opcoes={CAMPOS} onChange={setCampo} style={{ background: 'var(--bg)', alignSelf: 'flex-start' }} />
        <Barras key={campo} atual={serie(atual.por_mes)} anterior={anterior ? serie(anterior.por_mes) : null} parcial={parcial} rotulo={nome} />
        <Fonte />
      </div>
      <div className="panel" style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <p style={{ fontWeight: 600 }}>{nome}: acumulado no ano</p>
        <Acumulado key={campo} atual={serie(atual.por_mes)} anterior={anterior ? serie(anterior.por_mes) : null} />
        <Fonte />
      </div>
    </section>
  );
}

const REGRAS = [
  ['Sem estimativas', 'Só aparece o que o portal publicou. Se não há dado, o espaço fica vazio.'],
  ['A soma tem que bater', 'Só publicamos quando empenhado, liquidado e pago conferem, ao centavo, com o total do portal, mês a mês.'],
  ['Sem nomes', 'Nomes de pessoas e empresas que recebem da prefeitura não são coletados nem guardados.'],
  ['Confira você mesmo', 'Cada número tem um link que abre o portal oficial com o mesmo filtro.'],
];

const DOWNLOADS: [Dimensao, string][] = [['funcao', 'Por área'], ['orgao', 'Por secretaria'], ['elemento', 'Por tipo de gasto'], ['vinculo', 'Por recurso']];

export function DeOndeVem() {
  const { dados, ano, brl } = useDados();
  const repo = dados.fonte.repositorio;
  const caixa = { background: 'color-mix(in srgb,var(--on-inv) 10%,transparent)', borderRadius: 'var(--r-card)', padding: 28, display: 'flex', flexDirection: 'column', gap: 12 } as const;
  const { meses_ok, meses_total } = dados.validacao;
  const [qtdHistorico, setQtdHistorico] = useState(5);
  return (
    <section id="de-onde-vem" className="sec" aria-labelledby="h-onde">
      <div className="inv">
        <h2 id="h-onde" className="h2" style={{ fontSize: 'clamp(30px,8cqw,72px)', margin: '0 0 18px', maxWidth: '18ch' }}>De onde vêm os números</h2>
        <p style={{ fontSize: 'clamp(18px,3cqw,26px)', lineHeight: 1.3, maxWidth: '34ch', letterSpacing: '-.02em' }}>
          Todos os valores vêm do Portal da Transparência da Prefeitura de Rolante. Não fazemos estimativas.
        </p>
        <p className="mut" style={{ fontSize: 17, lineHeight: '26px', maxWidth: '62ch', marginTop: 16 }}>
          Mostramos o que a prefeitura publica, organizado de forma mais fácil de entender. Os dados são coletados todos os dias e só são
          publicados quando a soma confere exatamente com o total exibido no portal. Em cada número há um link para você conferir no próprio
          portal. Este site é independente e não tem vínculo com a prefeitura.
        </p>
        <p className="mut" style={{ fontSize: 17, lineHeight: '26px', maxWidth: '62ch', marginTop: 16 }}>
          O mês de cada gasto é o mês em que a prefeitura assumiu o compromisso (o empenho). O valor pago mostra quanto desse compromisso já
          foi pago até hoje, por isso meses anteriores ainda podem crescer. As áreas são as classificações oficiais que o próprio portal usa:
          função de governo, secretaria, elemento de despesa e recurso vinculado.
        </p>
        <p style={{ marginTop: 16 }}>
          <LinkPortal href={dados.fonte.portal}>Abrir o Portal da Transparência de Rolante</LinkPortal>
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(240px,100%),1fr))', gap: '24px 32px', marginTop: 48 }}>
          {REGRAS.map(([t, d], i) => (
            <div key={t} className="rule">
              <p className="num mut" style={{ fontSize: 14 }}>0{i + 1}</p>
              <p style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-.02em', margin: '4px 0 6px' }}>{t}</p>
              <p className="mut" style={{ fontSize: 15, lineHeight: '22px' }}>{d}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(320px,100%),1fr))', gap: 12, marginTop: 48 }}>
          <div style={caixa}>
            <p className="mut" style={{ fontSize: 14, fontWeight: 500 }}>Status da última coleta</p>
            <p className="num" style={{ fontWeight: 700, letterSpacing: '-.03em', fontSize: 34, lineHeight: 1.05 }}>
              {formatDate(dados.coletado_em)} às {dados.coletado_em.slice(11, 16)}
            </p>
            <span className="pill accent" style={{ alignSelf: 'flex-start' }}>
              {meses_ok} de {meses_total} meses conferidos {meses_ok === meses_total ? '✓' : ''}
            </span>
            <p className="mut" style={{ fontSize: 14 }}>
              Último empenho no portal: {formatDate(dados.ultimo_empenho)}. Coleta diária, às 6h47. Se passar de 36 horas sem coleta, o site avisa no topo.
            </p>
          </div>
          <div style={{ ...caixa, gap: 14 }}>
            <p className="mut" style={{ fontSize: 14, fontWeight: 500 }}>Baixar os dados de {ano}</p>
            <p style={{ fontSize: 18, lineHeight: '26px', letterSpacing: '-.01em' }}>
              Empenhado, liquidado e pago somados por dia e área, em formato aberto. Sem nomes.
            </p>
            {DOWNLOADS.map(([d, rotulo]) => (
              <div key={d} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                <span style={{ flexBasis: '100%' }}>{rotulo}</span>
                <a className="btn-inv" href={`dados/despesas/${ano}-${d}.json`} download><IcoBaixar />JSON</a>
                <a className="btn-inv" href={`dados/despesas/${ano}-${d}.csv`} download><IcoBaixar />CSV</a>
              </div>
            ))}
            <p className="mut" style={{ fontSize: 14 }}>
              Todas as coletas ficam guardadas, com data e hash, na <a href={`${repo}/commits/data`} target="_blank" rel="noopener">branch de dados do repositório</a>.
            </p>
          </div>
        </div>

        <div id="historico" style={{ marginTop: 56 }}>
          <p style={{ fontWeight: 700, fontSize: 24, letterSpacing: '-.02em' }}>Histórico de alterações</p>
          {dados.historico.length ? (
            <>
              <ul className="hist">
                {[...dados.historico].reverse().slice(0, qtdHistorico).map((h) => (
                  <li key={`${h.detectado_em}-${h.ano}-${h.mes}-${h.area}-${h.campo}`}>
                    <b>{formatDate(h.detectado_em)}</b> · {MESES_EXTENSO[h.mes - 1]} de {h.ano} · {h.area} · {h.campo === 'e' ? 'empenhado' : 'pago'}: de{' '}
                    {brl(h.antes)} para {brl(h.depois)}
                  </li>
                ))}
              </ul>
              {qtdHistorico < dados.historico.length && (
                <button type="button" className="btn-inv o" onClick={() => setQtdHistorico(qtdHistorico + 5)} style={{ display: 'flex', margin: '14px auto 0' }}>
                  Ver mais
                </button>
              )}
            </>
          ) : (
            <div style={{ marginTop: 14, border: '1px dashed color-mix(in srgb,var(--on-inv) 45%,transparent)', borderRadius: 'var(--r-card)', padding: '22px 24px' }}>
              <p className="mut" style={{ fontSize: 15, lineHeight: '22px', maxWidth: '62ch' }}>
                Nenhuma alteração registrada até agora. Pago crescendo é normal e não entra aqui. Entra quando o portal muda o empenhado de um mês
                já fechado (anulação ou empenho com data antiga) ou quando o pago diminui (estorno): data da nossa coleta, mês, área, valor anterior
                e valor novo.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
