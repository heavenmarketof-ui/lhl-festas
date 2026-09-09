import * as base from "./financeiro-api";
import type { CachedReadOptions } from "./gas-cache";
import { fetchOrdersFromSheet } from "./sheets-api";

export * from "./financeiro-api";

export function lancamentoEhRealizado(data: unknown, hojeISO: string): boolean {
  const iso = String(data ?? "").slice(0, 10);
  return !iso || iso <= hojeISO;
}

function hojeLocalISO() {
  const hoje = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${hoje.getFullYear()}-${p(hoje.getMonth() + 1)}-${p(hoje.getDate())}`;
}

function ativo(l: base.Lancamento) {
  return String(l.ativo || "Sim").toLowerCase() === "sim";
}

function chaveContratoOrigem(l: Pick<base.Lancamento, "contratoId" | "origem">) {
  return `${String(l.contratoId || "").trim()}|${String(l.origem || "").trim()}`;
}

const ORIGENS_RECEBIMENTO_CONTRATO = new Set([
  "sinalRecebido",
  "pagamentoFinal",
  "caucaoRecebida",
  "caucaoDevolvida",
]);

function lancamentoContrato(
  origem: "sinalRecebido" | "pagamentoFinal" | "caucaoRecebida" | "caucaoDevolvida",
  order: any,
  referencia: base.Lancamento,
): base.Lancamento | null {
  const total = base.parseValor(order.details?.valorTotal);
  const sinal = base.parseValor(order.details?.valorSinal);
  const restanteInformado = base.parseValor(order.details?.valorRestante);
  const caucao = base.parseValor(order.details?.valorCaucao);
  const final = restanteInformado > 0 ? restanteInformado : Math.max(total - sinal, 0);

  const cfg = origem === "sinalRecebido"
    ? { ok: order.details?.sinalRecebido === "Sim", valor: sinal, tipo: "Entrada" as const, categoria: "Sinal", label: "Sinal" }
    : origem === "pagamentoFinal"
      ? { ok: order.details?.pagamentoFinalRecebido === "Sim", valor: final, tipo: "Entrada" as const, categoria: "Pagamento Final", label: "Pagamento Final" }
      : origem === "caucaoRecebida"
        ? { ok: order.details?.caucaoRecebida === "Sim", valor: caucao, tipo: "Entrada" as const, categoria: "Caução Recebida", label: "Caução Recebida" }
        : { ok: order.details?.caucaoDevolvida === "Sim", valor: caucao, tipo: "Saída" as const, categoria: "Caução Devolvida", label: "Devolução de Caução" };

  if (!cfg.ok || cfg.valor <= 0) return null;

  return {
    id: crypto.randomUUID(),
    data: referencia.data || hojeLocalISO(),
    tipo: cfg.tipo,
    categoria: cfg.categoria,
    descricao: `${cfg.label} - ${order.nome || "Cliente"}${order.tema ? ` - ${order.tema}` : ""}`,
    valor: cfg.valor,
    formaPagamento: referencia.formaPagamento || "PIX",
    conta: referencia.conta || "PIX",
    beneficiario: "",
    observacoes: "",
    contratoId: order.id,
    origem,
    createdAt: new Date().toISOString(),
    ativo: "Sim",
  };
}

/**
 * Gravação idempotente do fluxo.
 * Quando o usuário confirma um recebimento vindo da tela do contrato, esta
 * camada também reconcilia outros recebimentos que foram marcados como Sim na
 * mesma edição. Assim sinal + pagamento final não ficam pela metade.
 */
export async function createLancamento(l: base.Lancamento): Promise<void> {
  const existentes = await base.fetchLancamentos({ includeDeleted: true, force: true });
  const chaves = new Set(existentes.filter(ativo).map(chaveContratoOrigem));
  const chave = chaveContratoOrigem(l);

  if (!l.contratoId || !l.origem || !chaves.has(chave)) {
    await base.createLancamento({ ...l, tipo: base.normalizeTipo(l.tipo), valor: Math.abs(base.parseValor(l.valor)) });
    if (l.contratoId && l.origem) chaves.add(chave);
  }

  if (!l.contratoId || !ORIGENS_RECEBIMENTO_CONTRATO.has(String(l.origem || ""))) return;

  const orders = await fetchOrdersFromSheet({ includeDeleted: true, force: true });
  const order = orders.find((o) => o.id === l.contratoId);
  if (!order) return;

  for (const origem of ["sinalRecebido", "pagamentoFinal", "caucaoRecebida", "caucaoDevolvida"] as const) {
    const pendente = lancamentoContrato(origem, order, l);
    if (!pendente) continue;
    const k = chaveContratoOrigem(pendente);
    if (chaves.has(k)) continue;
    await base.createLancamento(pendente);
    chaves.add(k);
  }
}

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
  const hojeISO = hojeLocalISO();
  return items
    .filter((l) => lancamentoEhRealizado(l.data, hojeISO))
    .map((l) => ({ ...l, tipo: base.normalizeTipo(l.tipo), valor: Math.abs(base.parseValor(l.valor)) }));
}

export function saldoCaixa(lancamentos: Array<Pick<base.Lancamento, "tipo" | "valor">>): number {
  return Math.round(lancamentos.reduce((saldo, l) => {
    const valor = Math.abs(base.parseValor(l.valor));
    return saldo + (base.normalizeTipo(l.tipo) === "Entrada" ? valor : -valor);
  }, 0) * 100) / 100;
}
