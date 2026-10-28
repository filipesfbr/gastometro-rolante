import { iguais } from './agregar.ts';
import { centavos } from './api.ts';
import type { Linha, Validacao, Valores } from './tipos.ts';

/** R2: empenhado, liquidado e pago somados no mês têm de ser iguais aos cartões do portal, ao centavo. */
export function validarMes(linhas: Linha[], totalizador: Valores): Validacao {
  const soma = { e: 0, l: 0, p: 0 };
  for (const l of linhas) {
    soma.e += centavos(l.valorEmpenhado);
    soma.l += centavos(l.valorLiquidado);
    soma.p += centavos(l.valorPago);
  }
  return { soma, totalizador, ok: iguais(soma, totalizador) };
}
