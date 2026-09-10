// ============================================================================
// REGRAS LHL — CENTRAL DE SOLICITAÇÕES
// ----------------------------------------------------------------------------
// A persistência oficial da Central é a OP oculta no Google Sheets.
// Este wrapper aplica duas regras de operação:
// 1) contratos encerrados/passados não poluem a fila diária;
// 2) ações em lote alteram todos os itens de uma mesma OP em memória e salvam
//    a OP apenas uma vez, evitando dezenas de leituras/escritas repetidas.
// ============================================================================

import * as base from "./solicitacoes-api";
import { fetchOrdersFromSheet } from "./sheets-api";
import { contratoOperacionalmenteAtivo } from "./contrato-operacional";
import { parseItensComprar } from "./materiais-catalogo";
import {
  applyCompraStatus,
  compraStatusOf,
  fetchOrdens,
  getOrdensLocal,
  logAction,
  saveOrdem,
  sincronizarItensContrato,
  type ItemCompra,
  type OrdemProducao,
} from "./producao-api";
import type { StoredOrder } from "./orders-storage";
import type { ResultadoLote } from "./solicitacoes-api";
import type { Solicitacao } from "./solicitacoes-types";

export * from "./solicitacoes-api";

type AcaoLote = "autorizar" | "recusar" | "cancelar";

type BatchContext = {
  ops: Map<string, OrdemProducao>;
  orders: Map<string, StoredOrder>;
  modificadas: Map<string, OrdemProducao>;
  itemParaOp: Map<string, string>;
  imediatas: Set<string>;
};

let batchContext: BatchContext | null = null;

function hojeISO(): string {
  const agora = new Date();
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function localizarItemEmOps(
  ops: Iterable<OrdemProducao>,
  id: string,
): { op: OrdemProducao; item: ItemCompra } | null {
  for (const op of ops) {
    const item = (op.compras || []).find((c) =>
      c.solicitacaoId === id || c.id === id || c.origemContratoItemId === id,
    );
    if (item) return { op, item };
  }
  return null;
}

function itemOperacionalDaSolicitacao(s: Solicitacao, ops: OrdemProducao[]): boolean {
  if (!ops.length) return true;
  const found = localizarItemEmOps(ops, s.id)
    || (s.origemItemId ? localizarItemEmOps(ops, s.origemItemId) : null);
  if (!found) return true; // pode ser item ainda apenas no Contrato
  return !found.item.cancelado && !found.item.removidoDoContrato;
}

/**
 * A Central é uma fila operacional, não um arquivo histórico.
 * Histórico continua preservado nos contratos/OP/Fluxo de Caixa.
 */
export function filtrarSolicitacoesOperacionais(
  list: Solicitacao[],
  orders: StoredOrder[],
  hoje = hojeISO(),
  ops: OrdemProducao[] = [],
): Solicitacao[] {
  const byId = new Map((orders || []).map((o) => [String(o.id), o] as const));
  return (list || []).filter((s) => {
    // Solicitação vinculada a item cancelado/removido é histórico, nunca tarefa.
    if (!itemOperacionalDaSolicitacao(s, ops)) return false;

    const pedidoId = String(s.pedidoId || "").trim();
    if (!pedidoId) return true; // solicitação manual sem contrato
    const order = byId.get(pedidoId);
    if (!order) return false; // OP órfã/histórica não entra na fila diária
    return contratoOperacionalmenteAtivo(order, hoje);
  });
}

export async function fetchSolicitacoes(): Promise<Solicitacao[]> {
  const atuais = await base.fetchSolicitacoes();
  // base.fetchSolicitacoes acabou de ler as OPs oficiais e atualizar o espelho
  // local; reaproveitamos esse espelho para não fazer outra chamada à planilha.
  const ops = getOrdensLocal();
  try {
    // fetchOrdersFromSheet usa cache compartilhado; normalmente esta leitura já
    // foi preenchida pela própria montagem da Central.
    const orders = await fetchOrdersFromSheet();
    return filtrarSolicitacoesOperacionais(atuais, orders, hojeISO(), ops);
  } catch {
    // Se contratos falharem temporariamente, ainda removemos itens já
    // cancelados/retirados do planejamento sem esconder os demais por engano.
    return (atuais || []).filter((s) => itemOperacionalDaSolicitacao(s, ops));
  }
}

export async function fetchSolicitacoesPorItem(): Promise<Record<string, Solicitacao>> {
  const list = await fetchSolicitacoes();
  const map: Record<string, Solicitacao> = {};
  for (const s of list) if (s.origemItemId && !map[s.origemItemId]) map[s.origemItemId] = s;
  return map;
}

function encodePayload(payload: Record<string, unknown>): string {
  return encodeURIComponent(JSON.stringify(payload || {}));
}

function registrarLogLote(
  op: OrdemProducao,
  id: string,
  kind: "AUTORIZADA" | "RECUSADA" | "CANCELADA",
  payload: Record<string, unknown>,
): OrdemProducao {
  return logAction(op, `__LHL_SOL__|${id}|${kind}|${encodePayload(payload)}`);
}

async function localizarNoBatch(id: string): Promise<{ op: OrdemProducao; item: ItemCompra }> {
  const ctx = batchContext;
  if (!ctx) throw new Error("Lote não inicializado.");

  let found = localizarItemEmOps(ctx.ops.values(), id);
  if (found) return found;

  // Rede de proteção para item que ainda esteja apenas no Contrato.
  const order = Array.from(ctx.orders.values()).find((o) =>
    parseItensComprar(o.details?.itensComprar).some((p) =>
      p.id === id && p.destino === "aprovacao" && (p.valorOrcado || 0) > 0,
    ),
  );
  if (order) {
    const sync = await sincronizarItensContrato(order);
    if (sync?.op) ctx.ops.set(sync.op.id, sync.op);
    found = localizarItemEmOps(ctx.ops.values(), id);
    if (found) return found;
  }

  throw new Error("Solicitação não encontrada na operação/contrato.");
}

function guardarAlteracao(id: string, op: OrdemProducao) {
  if (!batchContext) return;
  batchContext.ops.set(op.id, op);
  batchContext.modificadas.set(op.id, op);
  batchContext.itemParaOp.set(id, op.id);
}

async function aplicarNoBatch(id: string, acao: AcaoLote, motivo = "") {
  const ctx = batchContext;
  if (!ctx) throw new Error("Lote não inicializado.");
  const { op, item } = await localizarNoBatch(id);

  if (item.cancelado || item.removidoDoContrato) {
    throw new Error("Item cancelado ou removido do contrato não pode ser processado novamente.");
  }

  const status = compraStatusOf(item);

  if (acao === "autorizar") {
    if (status === "Compra autorizada" || status === "Compra realizada" || status === "Pago") {
      ctx.imediatas.add(id);
      return { ok: true, jaAutorizada: true };
    }
    let next: OrdemProducao = {
      ...op,
      compras: op.compras.map((c) => c.id === item.id
        ? { ...applyCompraStatus(c, "Compra autorizada"), solicitacaoId: id }
        : c),
    };
    next = registrarLogLote(next, id, "AUTORIZADA", {
      detalhe: "Compra liberada, sem lançamento financeiro.",
    });
    guardarAlteracao(id, next);
    return { ok: true, jaAutorizada: false };
  }

  if (status === "Compra autorizada" || status === "Compra realizada" || status === "Pago") {
    throw new Error("A solicitação já avançou e não pode ser recusada/cancelada como pendente.");
  }
  if (acao === "recusar" && !motivo.trim()) throw new Error("O motivo da recusa é obrigatório.");

  let next: OrdemProducao = {
    ...op,
    compras: op.compras.map((c) => c.id === item.id ? { ...c, solicitacaoId: id } : c),
  };
  next = registrarLogLote(
    next,
    id,
    acao === "recusar" ? "RECUSADA" : "CANCELADA",
    acao === "recusar" ? { motivo: motivo.trim() } : { detalhe: motivo.trim() },
  );
  guardarAlteracao(id, next);
  return { ok: true };
}

export async function autorizarSolicitacao(id: string) {
  return batchContext ? aplicarNoBatch(id, "autorizar") : base.autorizarSolicitacao(id);
}

export async function recusarSolicitacao(id: string, motivo: string) {
  return batchContext ? aplicarNoBatch(id, "recusar", motivo) : base.recusarSolicitacao(id, motivo);
}

export async function cancelarSolicitacao(id: string, motivo?: string) {
  return batchContext ? aplicarNoBatch(id, "cancelar", motivo || "") : base.cancelarSolicitacao(id, motivo);
}

async function salvarOpsEmBlocos(ops: Array<[string, OrdemProducao]>) {
  const resultados = new Map<string, { ok: true } | { ok: false; erro: string }>();
  const TAMANHO = 4;
  for (let i = 0; i < ops.length; i += TAMANHO) {
    const bloco = ops.slice(i, i + TAMANHO);
    const settled = await Promise.allSettled(bloco.map(([, op]) => saveOrdem(op)));
    settled.forEach((r, idx) => {
      const opId = bloco[idx][0];
      resultados.set(opId, r.status === "fulfilled"
        ? { ok: true }
        : { ok: false, erro: r.reason instanceof Error ? r.reason.message : "Falha ao salvar a OP." });
    });
  }
  return resultados;
}

/**
 * O componente atual chama esta função com callbacks de autorizar/recusar/
 * cancelar. Durante o lote, esses callbacks são interceptados acima: nenhuma
 * gravação acontece item a item. No final salvamos uma única vez por OP.
 */
export async function executarEmLote(
  itens: Solicitacao[],
  acao: (s: Solicitacao) => Promise<unknown>,
): Promise<ResultadoLote> {
  const out: ResultadoLote = { concluidas: [], falhas: [] };
  if (!itens.length) return out;

  const [ops, orders] = await Promise.all([
    fetchOrdens(),
    fetchOrdersFromSheet().catch(() => [] as StoredOrder[]),
  ]);
  batchContext = {
    ops: new Map(ops.map((op) => [op.id, op] as const)),
    orders: new Map(orders.map((o) => [o.id, o] as const)),
    modificadas: new Map(),
    itemParaOp: new Map(),
    imediatas: new Set(),
  };

  const falhasIniciais = new Map<string, string>();
  try {
    for (const s of itens) {
      try {
        await acao(s);
      } catch (e) {
        falhasIniciais.set(s.id, e instanceof Error ? e.message : "Erro desconhecido");
      }
    }

    const ctx = batchContext;
    const salvos = await salvarOpsEmBlocos(Array.from(ctx.modificadas.entries()));

    for (const s of itens) {
      const erroInicial = falhasIniciais.get(s.id);
      if (erroInicial) {
        out.falhas.push({ id: s.id, descricao: s.descricao, erro: erroInicial });
        continue;
      }
      if (ctx.imediatas.has(s.id)) {
        out.concluidas.push({ id: s.id, descricao: s.descricao });
        continue;
      }
      const opId = ctx.itemParaOp.get(s.id);
      const resultado = opId ? salvos.get(opId) : undefined;
      if (!resultado) {
        out.falhas.push({ id: s.id, descricao: s.descricao, erro: "A alteração não foi associada a uma OP." });
      } else if (!resultado.ok) {
        out.falhas.push({ id: s.id, descricao: s.descricao, erro: resultado.erro });
      } else {
        out.concluidas.push({ id: s.id, descricao: s.descricao });
      }
    }
  } finally {
    batchContext = null;
  }

  return out;
}
