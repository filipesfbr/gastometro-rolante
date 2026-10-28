import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { anosCompletos } from './anos.ts';
import { agregar, iguais, ordenar, somar, zero } from './agregar.ts';
import { criarApi } from './api.ts';
import { diff } from './diff.ts';
import { populacao } from './ibge.ts';
import { resumirAno, type EntradaAno, type Resumo } from './resumo.ts';
import {
  DIMENSOES,
  type Agregado,
  type Alteracao,
  type Codigos,
  type Dimensao,
  type Fonte,
  type Populacao,
  type Totais,
  type Validacao,
} from './tipos.ts';
import { validarMes } from './validar.ts';

const DATA = process.env.DATA_DIR ?? 'data';
const NOMES = Object.keys(DIMENSOES) as Dimensao[];

const lerJson = <T>(caminho: string, padrao?: T): T =>
  existsSync(caminho) ? JSON.parse(readFileSync(caminho, 'utf8')) : (padrao as T);

const escritos: Record<string, string> = {};
function gravar(relativo: string, conteudo: string) {
  const caminho = join(DATA, relativo);
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, conteudo);
  escritos[relativo] = `sha256:${createHash('sha256').update(conteudo).digest('hex')}`;
}
const json = (x: unknown) => `${JSON.stringify(x, null, 2)}\n`;
// Uma linha por (data, área): o diff do git mostra exatamente o que mudou.
const jsonLinhas = (a: Agregado[]) => `[\n${a.map((x) => JSON.stringify(x)).join(',\n')}\n]\n`;

function csv(agregados: Agregado[]) {
  const reais = (v: number) => (v / 100).toFixed(2).replace('.', ',');
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const linhas = agregados.map((x) => [x.d, esc(x.a), reais(x.e), reais(x.l), reais(x.p)].join(';'));
  return `data;area;empenhado_reais;liquidado_reais;pago_reais\n${linhas.join('\n')}\n`;
}

/** Data e hora em Brasília (UTC−3, sem horário de verão desde 2019). */
function agoraBRT(d = new Date()) {
  const iso = new Date(d.getTime() - 3 * 3600_000).toISOString().slice(0, 19);
  return { hoje: iso.slice(0, 10), coletadoEm: `${iso}-03:00` };
}

const arquivo = (ano: number, d: Dimensao, ext: 'json' | 'csv') => `despesas/${ano}-${d}.${ext}`;

async function main() {
  const fonte = lerJson<Fonte>('config/fonte.json');
  const folha = lerJson<{ fonte: string; elementos: string[] }>('config/folha.json');
  const { hoje, coletadoEm } = agoraBRT();
  const anoAtual = Number(hoje.slice(0, 4));
  const mesAtual = Number(hoje.slice(5, 7));
  const anos = process.env.ANOS ? process.env.ANOS.split(',').map(Number) : [anoAtual - 2, anoAtual - 1, anoAtual];
  // Dois anos antes só entra na comparação da folha, que sai inteira do tipo 2 (elemento),
  // a menos que o ano já tenha sido gravado inteiro (ver anos.ts).
  const completos = anosCompletos(anos, anoAtual, (ano) => existsSync(join(DATA, arquivo(ano, 'funcao', 'json'))));
  const dimensoes = (ano: number): Dimensao[] => (completos.has(ano) ? NOMES : ['elemento']);

  const api = criarApi(fonte);
  const novos: Record<number, EntradaAno> = {};
  const validacao: Record<string, Record<string, Record<string, Validacao>>> = {};
  const erros: string[] = [];

  for (const ano of anos) {
    const meses = ano === anoAtual ? mesAtual : 12;
    const agregados = Object.fromEntries(NOMES.map((d) => [d, [] as Agregado[]])) as Record<Dimensao, Agregado[]>;
    const porMes: Totais['por_mes'] = {};
    validacao[ano] = {};

    for (let mes = 1; mes <= meses; mes++) {
      const totalizador = await api.totalizador(ano, mes);
      porMes[mes] = totalizador;
      const conferencia: Record<string, Validacao> = (validacao[ano][mes] = {});
      const status: string[] = [];

      // Cada tipo devolve os mesmos empenhos, com outro campo de área preenchido: cada um é conferido (R2).
      for (const d of dimensoes(ano)) {
        const { tipo, campo } = DIMENSOES[d];
        const linhas = await api.listarDespesas(ano, mes, tipo);
        const v = validarMes(linhas, totalizador);
        conferencia[tipo] = v;
        if (!v.ok) erros.push(`${ano}/${mes} tipo ${tipo}: soma ${JSON.stringify(v.soma)} ≠ totalizador ${JSON.stringify(v.totalizador)}`);
        try {
          agregados[d].push(...agregar(linhas, campo));
        } catch (erro) {
          erros.push(`${ano}/${mes} tipo ${tipo}: ${(erro as Error).message}`);
        }
        status.push(`${d} ${linhas.length}${v.ok ? '' : ' NÃO CONFERE'}`);
      }
      console.log(`${ano}/${String(mes).padStart(2, '0')}: ${status.join(' · ')}`);
    }

    const totalAno = await api.totalizador(ano);
    const somaMeses = Object.values(porMes).reduce(somar, zero());
    if (!iguais(totalAno, somaMeses)) {
      erros.push(`${ano}: total do ano ${JSON.stringify(totalAno)} ≠ soma dos meses ${JSON.stringify(somaMeses)}`);
    }
    for (const d of NOMES) ordenar(agregados[d]);
    novos[ano] = { agregados, totais: { ...totalAno, por_mes: porMes } };
  }

  // R2: se algum mês ou tipo não fechar, nada é gravado e o site fica no último snapshot.
  if (erros.length) {
    console.error(`\nColeta NÃO publicada (R2):\n- ${erros.join('\n- ')}`);
    process.exit(1);
  }

  // Códigos são só para o link do R4: falha aqui mantém a tabela anterior e não impede a coleta.
  let codigos = lerJson<Codigos>(join(DATA, 'codigos.json'), { funcao: {}, orgao: {}, vinculo: {} });
  try {
    codigos = await api.codigos();
  } catch (erro) {
    console.warn(`Tabelas de código indisponíveis, mantendo as anteriores: ${String(erro)}`);
  }

  // R5: alterações em meses que a coleta anterior já cobria por completo.
  const manifestAnterior = lerJson<{ coletado_em: string } | null>(join(DATA, 'manifest.json'), null);
  const historico = lerJson<Alteracao[]>(join(DATA, 'historico-alteracoes.json'), []);
  if (manifestAnterior) {
    for (const ano of anos.filter((a) => dimensoes(a).includes('funcao'))) {
      const anterior = lerJson<Agregado[] | null>(join(DATA, arquivo(ano, 'funcao', 'json')), null);
      if (anterior) {
        historico.push(...diff(ano, anterior, novos[ano]!.agregados.funcao, manifestAnterior.coletado_em, hoje));
      }
    }
  }

  // População é dado de apoio (só o "por habitante"): falha do IBGE nunca impede a coleta.
  // O IBGE costuma não responder a servidores fora do Brasil (como os do GitHub Actions);
  // por isso a coleta parte da última população gravada ou da semente em config/.
  const semente = lerJson<{ municipios: Populacao }>('config/populacao-ibge.json');
  const pop = lerJson<Populacao>(join(DATA, 'populacao.json'), {});
  pop[fonte.ibge] = { ...semente.municipios[fonte.ibge], ...pop[fonte.ibge] };
  if (!pop[fonte.ibge]?.[anoAtual]) {
    try {
      pop[fonte.ibge] = { ...pop[fonte.ibge], ...(await populacao(fonte)) };
    } catch (erro) {
      console.warn(`IBGE indisponível, mantendo a população já conhecida: ${String(erro)}`);
    }
  }

  for (const ano of anos) {
    for (const d of dimensoes(ano)) {
      gravar(arquivo(ano, d, 'json'), jsonLinhas(novos[ano]!.agregados[d]));
      gravar(arquivo(ano, d, 'csv'), csv(novos[ano]!.agregados[d]));
    }
    gravar(`totais/${ano}.json`, json(novos[ano]!.totais));
  }
  gravar('codigos.json', json(codigos));
  gravar('populacao.json', json(pop));
  gravar('historico-alteracoes.json', json(historico));

  // Anos já gravados em coletas anteriores (fora da janela atual) continuam no site.
  const todosAnos = readdirSync(join(DATA, 'despesas'))
    .filter((f) => /^\d{4}-funcao\.json$/.test(f))
    .map((f) => Number(f.slice(0, 4)))
    .sort();
  // Ano coletado só em parte: as outras dimensões vêm do que já está gravado.
  const entrada = (ano: number): EntradaAno | undefined =>
    (completos.has(ano) ? novos[ano] : undefined) ??
    (existsSync(join(DATA, `totais/${ano}.json`))
      ? {
          agregados: Object.fromEntries(
            NOMES.map((d) => [d, lerJson<Agregado[]>(join(DATA, arquivo(ano, d, 'json')), [])]),
          ) as EntradaAno['agregados'],
          totais: lerJson(join(DATA, `totais/${ano}.json`)),
        }
      : undefined);

  for (const ano of todosAnos) {
    const arquivos = [...NOMES.flatMap((d) => [arquivo(ano, d, 'json'), arquivo(ano, d, 'csv')]), `totais/${ano}.json`];
    for (const f of arquivos) {
      if (!escritos[f] && existsSync(join(DATA, f))) gravar(f, readFileSync(join(DATA, f), 'utf8'));
    }
  }

  const ultimoEmpenho =
    novos[anoAtual]?.agregados.funcao.at(-1)?.d ?? novos[anoAtual - 1]?.agregados.funcao.at(-1)?.d ?? hoje;
  const conferidos = Object.values(validacao).flatMap((m) => Object.values(m));
  const resumo: Resumo = {
    versao: 1,
    coletado_em: coletadoEm,
    ultimo_empenho: ultimoEmpenho,
    fonte: {
      portal: fonte.portal,
      portalDespesas: fonte.portalDespesas,
      entidade: fonte.entidade,
      repositorio: fonte.repositorio,
    },
    populacao: pop[fonte.ibge] ?? {},
    codigos,
    folha: { fonte: folha.fonte, elementos: folha.elementos },
    validacao: {
      meses_ok: conferidos.filter((m) => Object.values(m).every((v) => v.ok)).length,
      meses_total: conferidos.length,
    },
    historico,
    anos: Object.fromEntries(
      todosAnos.map((ano) => [
        ano,
        // Ano só com elemento não serve de "ano anterior" completo: total e funções viriam zerados.
        resumirAno(ano, entrada(ano)!, todosAnos.includes(ano - 1) ? entrada(ano - 1) : undefined, entrada(ano - 2), hoje, folha.elementos),
      ]),
    ),
  };
  gravar('site.json', json(resumo));

  gravar(
    'manifest.json',
    json({
      coletado_em: coletadoEm,
      fonte: { portal: fonte.portal, api: fonte.api, entidade: fonte.entidade },
      ultimo_empenho: ultimoEmpenho,
      anos: todosAnos,
      validacao,
      arquivos: escritos,
    }),
  );
  console.log(`\nColeta ok: ${conferidos.length} meses conferem em todos os tipos coletados · último empenho ${ultimoEmpenho}`);
}

await main();
