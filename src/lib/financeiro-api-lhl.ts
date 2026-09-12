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

function norm(v: unknown) {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export type OrigemContratoCanonica = "sinalRecebido" | "pagamentoFinal" | "caucaoRecebida" | "caucaoDevolvida";

export function origemContratoCanonica(origem: unknown): OrigemContratoCanonica | "" {
  const s = norm(origem).replace(/[\s_-]+/g, "");
  if (s === "sinal" || s === "sinalrecebido") return "sinalRecebido";
  if (s === "pagamentofinal" || s === "final") return "pagamentoFinal";
  if (s === "caucaorecebida" || s === "caucaorecebido") return "caucaoRecebida";
  if (s === "caucaodevolvida" || s === "devolucaocaucao" || s === "devolucaodecaucao") return "caucaoDevolvida";
  return "";
}

function chaveContratoOrigem(l: Pick<base.Lancamento, "contratoId" | "origem">) {
  const contratoId = String(l.contratoId || "").trim();
  const origem = origemContratoCanonica(l.origem) || String(l.origem || "").trim();
  return `${contratoId}|${origem}`;
}

const ORIGENS_RECEBIMENTO_CONTRATO = new Set<OrigemContratoCanonica>([
  "sinalRecebido",
  "pagamentoFinal",
  "caucaoRecebida",
  "caucaoDevolvida",
]);

/**
 * Chave de negócio usada apenas quando existe uma identidade financeira forte.
 * Não deduplicamos despesas manuais só porque têm mesma descrição/valor/data:
 * duas compras iguais podem ser legítimas. Dedupe é seguro para:
 * - mesmo id técnico;
 * - recebimento/devolução de um contrato + origem canônica;
 * - mesma solicitação financeira de compra.
 */
function chaveNegocio(l: base.Lancamento): string {
  const contratoId = String(l.contratoId || "").trim();
  const origemRaw = String(l.origem || "").trim();
  const origemContrato = origemContratoCanonica(origemRaw);
  if (contratoId && origemContrato) return `contrato:${contratoId}:${origemContrato}`;
  if (/^solicitacao-/i.test(origemRaw)) return `solicitacao:${origemRaw.toLowerCase()}`;
  return "";
}

export function deduplicarLancamentos(items: base.Lancamento[]): base.Lancamento[] {
  const ids = new Set<string>();
  const negocios = new Set<string>();
  const out: base.Lancamento[] = [];

  for (const item of items) {
    const id = String(item.id || "").trim();
    if (id && ids.has(id)) continue;

    const negocio = chaveNegocio(item);
    if (negocio && negocios.has(negocio)) continue;

    if (id) ids.add(id);
    if (negocio) negocios.add(negocio);
    out.push(item);
  }
  return out;
}

function idContratoOrigem(contratoId: string, origem: OrigemContratoCanonica) {
  return `fluxo-${contratoId}-${origem}`;
}

function lancamentoContrato(
  origem: OrigemContratoCanonica,
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
    id: idContratoOrigem(order.id, origem),
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

async function existeLancamento(l: Pick<base.Lancamento, "id" | "contratoId" | "origem">): Promise<boolean> {
  const atuais = await base.fetchLancamentos({ includeDeleted: true, force: true });
  const ativos = atuais.filter(ativo);
  const id = String(l.id || "").trim();
  if (id && ativos.some((x) => String(x.id || "").trim() === id)) return true;
  const negocio = chaveNegocio(l as base.Lancamento);
  return !!negocio && ativos.some((x) => chaveNegocio(x) === negocio);
}

// Serializa gravações feitas pela mesma sessão. Isso elimina a corrida em que
// dois cliques/prompts do contrato liam a planilha antes do primeiro append.
let filaGravacao: Promise<void> = Promise.resolve();

async function createLancamentoSerial(l: base.Lancamento): Promise<void> {
  const origemCanonica = origemContratoCanonica(l.origem);
  const payload: base.Lancamento = {
    ...l,
    id: l.contratoId && origemCanonica ? idContratoOrigem(String(l.contratoId), origemCanonica) : l.id,
    origem: origemCanonica || l.origem,
    tipo: base.normalizeTipo(l.tipo),
    valor: Math.abs(base.parseValor(l.valor)),
  };

  if (!(await existeLancamento(payload))) {
    await base.createLancamento(payload);
  }

  if (!payload.contratoId || !origemCanonica || !ORIGENS_RECEBIMENTO_CONTRATO.has(origemCanonica)) return;

  const orders = await fetchOrdersFromSheet({ includeDeleted: true, force: true });
  const order = orders.find((o) => o.id === payload.contratoId);
  if (!order) return;

  for (const origem of ["sinalRecebido", "pagamentoFinal", "caucaoRecebida", "caucaoDevolvida"] as const) {
    const pendente = lancamentoContrato(origem, order, payload);
    if (!pendente) continue;
    // Reconsulta imediatamente antes de cada append. Além da fila local, isso
    // reduz a janela de corrida com outra aba/dispositivo.
    if (await existeLancamento(pendente)) continue;
    await base.createLancamento(pendente);
  }
}

/**
 * Gravação idempotente do fluxo. A fila evita concorrência dentro da sessão e
 * as chaves de negócio impedem que contrato/origem ou solicitação sejam
 * contabilizados duas vezes na leitura do caixa.
 */
export async function createLancamento(l: base.Lancamento): Promise<void> {
  const exec = filaGravacao.then(() => createLancamentoSerial(l));
  filaGravacao = exec.catch(() => undefined);
  return exec;
}

/**
 * Camada soberana LHL para o Fluxo de Caixa.
 * Lançamento financeiro é caixa realizado: uma data futura nunca pode entrar
 * em saldo, entradas ou saídas atuais. Duplicidades técnicas permanecem na
 * planilha para auditoria, mas nunca entram duas vezes nos totais/telas.
 */
export async function fetchLancamentos(
  opts?: { includeDeleted?: boolean } & CachedReadOptions,
): Promise<base.Lancamento[]> {
  const items = await base.fetchLancamentos(opts);
  const hojeISO = hojeLocalISO();
  const normalizados = items
    .filter((l) => lancamentoEhRealizado(l.data, hojeISO))
    .map((l) => ({
      ...l,
      origem: origemContratoCanonica(l.origem) || l.origem,
      tipo: base.normalizeTipo(l.tipo),
      valor: Math.abs(base.parseValor(l.valor)),
    }));
  return deduplicarLancamentos(normalizados);
}

export function saldoCaixa(lancamentos: Array<Pick<base.Lancamento, "tipo" | "valor">>): number {
  return Math.round(lancamentos.reduce((saldo, l) => {
    const valor = Math.abs(base.parseValor(l.valor));
    return saldo + (base.normalizeTipo(l.tipo) === "Entrada" ? valor : -valor);
  }, 0) * 100) / 100;
}
