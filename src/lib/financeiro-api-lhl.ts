import * as base from "./financeiro-api";
import type { CachedReadOptions } from "./gas-cache";

export * from "./financeiro-api";

/**
 * Camada soberana LHL para o Fluxo de Caixa.
 * Lançamento financeiro é caixa realizado: uma data futura nunca pode entrar
 * em saldo, entradas ou saídas atuais. Obrigações futuras continuam no módulo
 * Contas a Pagar, que usa fonte própria.
 */
export async function fetchLancamentos(
  opts?: { includeDeleted?: boolean } & CachedReadOptions,
): Promise<base.Lancamento[]> {
  const items = await base.fetchLancamentos(opts);
  const hoje = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const hojeISO = `${hoje.getFullYear()}-${p(hoje.getMonth() + 1)}-${p(hoje.getDate())}`;
  return items.filter((l) => {
    const data = String(l.data || "").slice(0, 10);
    return !data || data <= hojeISO;
  });
}
