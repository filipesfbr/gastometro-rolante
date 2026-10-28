import { useEffect, useState } from 'react';
import type { Resumo } from '../../coletor/src/resumo.ts';
import { formatDateTime } from './lib/format.ts';
import { Destino } from './components/Destino.tsx';
import { Folha } from './components/Folha.tsx';
import { DeOndeVem, MesAMes } from './components/Secoes.tsx';
import { Caminho, Hero } from './components/Topo.tsx';
import { Dados, IcoRelogio } from './components/ui.tsx';
import { BrandLockup } from './components/brand/BrandLockup.tsx';
import { BrandMark } from './components/brand/BrandMark.tsx';

const LIMITE_ATRASO_MS = 36 * 3600_000;
const IMPOSTOMETRO = 'https://filipesfbr.github.io/impostometro-rolante/';

function Cabecalho() {
  return (
    <header className="hdr">
      <span className="logo">
        <BrandLockup />
      </span>
      <nav className="nav" aria-label="Seções da página">
        <a href="#folha">Folha</a>
        <a href="#destino">Para onde vai</a>
        <a href="#mes-a-mes">Mês a mês</a>
        <a href="#de-onde-vem">De onde vêm os números</a>
      </nav>
    </header>
  );
}

function Rodape({ repo }: { repo?: string }) {
  return (
    <footer className="ftr">
      <p style={{ marginBottom: 12 }}>
        <BrandLockup markHeight={22} />
      </p>
      <p style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 22px' }}>
        <a href="#de-onde-vem">De onde vêm os números</a>
        <a href={IMPOSTOMETRO}>Impostômetro Rolante: quanto a prefeitura arrecada</a>
        {repo && <a href={repo} target="_blank" rel="noopener">Repositório público</a>}
      </p>
    </footer>
  );
}

function Carregando() {
  return (
    <div style={{ padding: '44px 0', display: 'flex', flexDirection: 'column', gap: 14 }} aria-busy="true" aria-label="Carregando os dados">
      <div className="sk" style={{ width: '60%', height: 18 }} />
      <div className="sk" style={{ width: '100%', height: 72 }} />
      <div className="sk" style={{ width: '46%', height: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
        <div className="sk" style={{ height: 96 }} />
        <div className="sk" style={{ height: 96 }} />
      </div>
    </div>
  );
}

export function App() {
  const [dados, setDados] = useState<Resumo | null>(null);
  const [erro, setErro] = useState(false);
  const [exato, setExato] = useState(false);

  useEffect(() => {
    fetch('dados/site.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setDados)
      .catch(() => setErro(true));
  }, []);

  // O alvo da âncora (#folha, #de-onde-vem) só existe depois que os dados chegam.
  useEffect(() => {
    if (dados && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [dados]);

  const anos = dados ? Object.keys(dados.anos).map(Number).sort() : [];
  const ano = anos.at(-1)!;
  const atrasado = dados && Date.now() - new Date(dados.coletado_em).getTime() > LIMITE_ATRASO_MS;

  return (
    <div className="pg">
      <div className="wrap">
        <Cabecalho />
        {erro && (
          <div className="msg err" role="alert">
            <BrandMark height={52} />
            <p>Não conseguimos carregar os dados deste site agora. Tente recarregar a página.</p>
          </div>
        )}
        {!dados && !erro && <Carregando />}
        {dados && (
          <Dados.Provider value={{ dados, ano, atual: dados.anos[ano]!, anterior: dados.anos[ano - 1], exato, setExato }}>
            {atrasado && (
              <div className="msg warn" role="status" style={{ marginTop: 12 }}>
                <IcoRelogio />
                <p>
                  <b>Atualização pendente.</b> A última coleta foi em {formatDateTime(dados.coletado_em).replace(' ', ' às ')}, há mais de 36
                  horas. Os valores abaixo são dessa coleta e podem estar um pouco atrás do portal.
                </p>
              </div>
            )}
            <main>
              <Hero />
              <Caminho />
              <Folha />
              <Destino />
              <MesAMes />
              <DeOndeVem />
            </main>
          </Dados.Provider>
        )}
        <Rodape {...(dados ? { repo: dados.fonte.repositorio } : {})} />
      </div>
    </div>
  );
}
