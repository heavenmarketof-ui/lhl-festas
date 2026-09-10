// ============================================================================
// CENTRAL DE SOLICITAÇÕES — GOOGLE SHEETS / OP OCULTA
// ----------------------------------------------------------------------------
// Fonte oficial das solicitações de compra: itens da Ordem de Produção, que já
// são persistidos na aba ORDENS_PRODUCAO do Google Sheets.
//
// Proteção anti-perda: itens marcados no Contrato como destino="aprovacao"
// aparecem na Central mesmo que a sincronização da OP ainda não tenha ocorrido.
// Ao executar uma ação, a OP é criada/reparada automaticamente.
//
// O Supabase continua sendo usado para autenticação do Admin, mas NÃO é mais
// banco/persistência da Central de Solicitações.
// ============================================================================

import type { StoredOrder } from "./orders-storage";
import { fetchOrdersFromSheet } from "./sheets-api";
import { parseItensComprar, type ItemComprar } from "./materiais-catalogo";
import {
  applyCompraStatus,
  compraStatusOf,
  currentUser,
  emptyConferencia,
  fetchOrdens,
  logAction,
  saveOrdem,
  sincronizarItensContrato,
  valorPrevistoCompra,
  valorRealCompra,
  type ItemCompra,
  type OrdemProducao,
} from "./producao-api";
import {
  createLancamento,
  fetchLancamentos,
  type Lancamento,
} from "./financeiro-api";
import {
  origemLancamento,
  type Solicitacao,
  type SolicitacaoEvento,
  type SolicitacaoItem,
  type SolicitacaoOrigem,
  type SolicitacaoStatus,
  type SolicitacaoTipo,
} from "./solicitacoes-types";

const LOG_PREFIX = "__LHL_SOL__|";
const MANUAL_PREFIX = "__SOLMAN__:";

type SolLogKind =
  | "CRIADA"
  | "EDITADA"
  | "AUTORIZADA"
  | "REVOGADA"
  | "RECUSADA"
  | "CANCELADA"
  | "COMPRA_REALIZADA"
  | "PAGAMENTO_RESERVADO"
  | "PAGAMENTO_REGISTRADO";

type SolLogPayload = Record<string, unknown>;

type ParsedSolLog = {
  id: string;
  kind: SolLogKind;
  payload: SolLogPayload;
  usuario: string;
  dataHora: string;
  logId: string;
};

type SolMeta = {
  origem?: SolicitacaoOrigem;
  tipo?: SolicitacaoTipo;
  pedidoId?: string;
  pedidoCliente?: string;
  descricao?: string;
  categoria?: string;
  conta?: string;
  observacoes?: string;
  dataPrevista?: string;
  criadoPorEmail?: string;
  criadoEm?: string;
  editadoPorEmail?: string;
  editadoEm?: string;
  autorizadoPorEmail?: string;
  autorizadoEm?: string;
  recusadoPorEmail?: string;
  recusadoEm?: string;
  recusaMotivo?: string;
  canceladoPorEmail?: string;
  canceladoEm?: string;
  terminal?: "recusada" | "cancelada";
  lancamentoId?: string;
  lancadoEm?: string;
  updatedAt?: string;
};

export type NovaSolicitacao = {
  tipo?: SolicitacaoTipo;
  origem?: SolicitacaoOrigem;
  pedidoId?: string;
  pedidoCliente?: string;
  ordemProducao?: string;
  origemItemId?: string;
  itens?: SolicitacaoItem[];
  fornecedor?: string;
  categoria?: string;
  conta?: string;
  formaPagamento?: string;
  valor?: number | string;
  descricao?: string;
  observacoes?: string;
  dataPrevista?: string;
};

export type PagamentoSolicitacao = {
  id: string;
  valor?: number | string;
  fornecedor?: string;
  formaPagamento?: string;
  conta?: string;
  dataPagamento?: string;
  observacoes?: string;
};

export type ResultadoLote = {
  concluidas: { id: string; descricao: string }[];
  falhas: { id: string; descricao: string; erro: string }[];
};

function text(v: unknown): string {
  return String(v ?? "").trim();
}

function numero(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v ?? "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function payloadEncode(payload: SolLogPayload): string {
  return encodeURIComponent(JSON.stringify(payload || {}));
}

function payloadDecode(raw: string): SolLogPayload {
  try {
    const parsed = JSON.parse(decodeURIComponent(raw || ""));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseSolLogEntry(entry: any): ParsedSolLog | null {
  const acao = String(entry?.acao ?? "");
  if (!acao.startsWith(LOG_PREFIX)) return null;
  const partes = acao.split("|");
  if (partes.length < 4) return null;
  const id = text(partes[1]);
  const kind = text(partes[2]) as SolLogKind;
  if (!id || !kind) return null;
  return {
    id,
    kind,
    payload: payloadDecode(partes.slice(3).join("|")),
    usuario: text(entry?.usuario) || "Sistema",
    dataHora: text(entry?.dataHora),
    logId: text(entry?.id) || crypto.randomUUID(),
  };
}

function logsDaSolicitacao(op: OrdemProducao, id: string): ParsedSolLog[] {
  return (op.historico || [])
    .map(parseSolLogEntry)
    .filter((x): x is ParsedSolLog => !!x && x.id === id)
    .sort((a, b) => (a.dataHora || "").localeCompare(b.dataHora || ""));
}

function metaDaSolicitacao(op: OrdemProducao, id: string): SolMeta {
  const meta: SolMeta = {};
  for (const ev of logsDaSolicitacao(op, id)) {
    const p = ev.payload;
    const mergeCampos = () => {
      const campos: (keyof SolMeta)[] = [
        "origem", "tipo", "pedidoId", "pedidoCliente", "descricao", "categoria",
        "conta", "observacoes", "dataPrevista",
      ];
      for (const k of campos) {
        if (p[k] != null && String(p[k]).trim() !== "") (meta as any)[k] = p[k];
      }
    };
    if (ev.kind === "CRIADA") {
      mergeCampos();
      meta.criadoPorEmail = ev.usuario;
      meta.criadoEm = ev.dataHora;
      meta.terminal = undefined;
    } else if (ev.kind === "EDITADA") {
      mergeCampos();
      meta.editadoPorEmail = ev.usuario;
      meta.editadoEm = ev.dataHora;
    } else if (ev.kind === "AUTORIZADA") {
      meta.autorizadoPorEmail = ev.usuario;
      meta.autorizadoEm = ev.dataHora;
      meta.terminal = undefined;
    } else if (ev.kind === "REVOGADA") {
      meta.autorizadoPorEmail = undefined;
      meta.autorizadoEm = undefined;
      meta.terminal = undefined;
    } else if (ev.kind === "RECUSADA") {
      meta.recusadoPorEmail = ev.usuario;
      meta.recusadoEm = ev.dataHora;
      meta.recusaMotivo = text(p.motivo);
      meta.terminal = "recusada";
    } else if (ev.kind === "CANCELADA") {
      meta.canceladoPorEmail = ev.usuario;
      meta.canceladoEm = ev.dataHora;
      meta.terminal = "cancelada";
    } else if (ev.kind === "PAGAMENTO_RESERVADO" || ev.kind === "PAGAMENTO_REGISTRADO") {
      if (text(p.lancamentoId)) meta.lancamentoId = text(p.lancamentoId);
      if (ev.kind === "PAGAMENTO_REGISTRADO") meta.lancadoEm = ev.dataHora;
    }
    meta.updatedAt = ev.dataHora || meta.updatedAt;
  }
  return meta;
}

function withSolLog(op: OrdemProducao, id: string, kind: SolLogKind, payload: SolLogPayload = {}): OrdemProducao {
  return logAction(op, `${LOG_PREFIX}${id}|${kind}|${payloadEncode(payload)}`);
}

function statusDoItem(item: ItemCompra, meta: SolMeta, forcarPendente = false): SolicitacaoStatus {
  const compra = compraStatusOf(item);
  if (compra === "Pago") return "lancada";
  if (meta.terminal) return meta.terminal;
  if (compra === "Compra realizada") return "comprada";
  if (compra === "Compra autorizada") return "autorizada";
  if (compra === "Aguardando autorização" || forcarPendente || item.solicitacaoId) return "pendente";
  return "pendente";
}

function valorTotalItem(item: ItemCompra): number {
  return valorRealCompra(item) || valorPrevistoCompra(item);
}

function solicitacaoDeItem(
  op: OrdemProducao,
  item: ItemCompra,
  order?: StoredOrder,
  opts?: { forcarPendente?: boolean; idPreferido?: string },
): Solicitacao {
  const id = text(item.solicitacaoId) || text(opts?.idPreferido) || text(item.origemContratoItemId) || item.id;
  const meta = metaDaSolicitacao(op, id);
  const valor = valorTotalItem(item);
  const origem = meta.origem || (op.contratoId.startsWith(MANUAL_PREFIX) ? "compra_manual" : "ordem_producao");
  const pedidoId = meta.pedidoId ?? (origem === "compra_manual" ? "" : op.contratoId);
  const pedidoCliente = meta.pedidoCliente ?? order?.nome ?? "";
  const descricao = meta.descricao || `${item.descricao}${pedidoCliente ? ` — ${pedidoCliente}` : ""}${op.numero ? ` (${op.numero})` : ""}`;
  const createdAt = meta.criadoEm || op.criadoEm || op.atualizadoEm || new Date().toISOString();
  const updatedAt = meta.updatedAt || op.atualizadoEm || createdAt;

  return {
    id,
    tipo: meta.tipo || (item.tipo === "Patrimônio" ? "compra_patrimonio" : "compra_materiais"),
    origem,
    status: statusDoItem(item, meta, !!opts?.forcarPendente),
    pedidoId,
    pedidoCliente,
    ordemProducao: origem === "compra_manual" ? "" : op.numero,
    origemItemId: item.id,
    itens: [{
      descricao: item.descricao,
      quantidade: item.quantidade || 1,
      unidade: item.unidade || "un",
      valor,
    }],
    fornecedor: item.fornecedor || "",
    categoria: meta.categoria || "Fornecedor",
    conta: meta.conta || "Caixa",
    formaPagamento: item.formaPagamento || "PIX",
    valor,
    descricao,
    observacoes: meta.observacoes ?? item.observacao ?? "",
    dataPrevista: meta.dataPrevista || "",
    criadoPorEmail: meta.criadoPorEmail || "Sistema",
    editadoPorEmail: meta.editadoPorEmail || "",
    editadoEm: meta.editadoEm || "",
    autorizadoPorEmail: meta.autorizadoPorEmail || "",
    autorizadoEm: meta.autorizadoEm || "",
    recusadoPorEmail: meta.recusadoPorEmail || "",
    recusadoEm: meta.recusadoEm || "",
    recusaMotivo: meta.recusaMotivo || "",
    canceladoPorEmail: meta.canceladoPorEmail || "",
    canceladoEm: meta.canceladoEm || "",
    lancamentoId: meta.lancamentoId || "",
    lancadoEm: meta.lancadoEm || "",
    createdAt,
    updatedAt,
  };
}

function solicitacaoPlanejada(order: StoredOrder, p: ItemComprar): Solicitacao {
  const quantidade = p.quantidade || 1;
  const valor = (p.valorOrcado || 0) * quantidade;
  return {
    id: p.id,
    tipo: "compra_materiais",
    origem: "ordem_producao",
    status: "pendente",
    pedidoId: order.id,
    pedidoCliente: order.nome || "",
    ordemProducao: "",
    origemItemId: p.id,
    itens: [{ descricao: p.nome, quantidade, unidade: "un", valor }],
    fornecedor: p.fornecedor || "",
    categoria: "Fornecedor",
    conta: "Caixa",
    formaPagamento: "PIX",
    valor,
    descricao: `${p.nome}${order.nome ? ` — ${order.nome}` : ""}`,
    observacoes: p.observacao || "",
    dataPrevista: "",
    criadoPorEmail: "Sistema",
    editadoPorEmail: "",
    editadoEm: "",
    autorizadoPorEmail: "",
    autorizadoEm: "",
    recusadoPorEmail: "",
    recusadoEm: "",
    recusaMotivo: "",
    canceladoPorEmail: "",
    canceladoEm: "",
    lancamentoId: "",
    lancadoEm: "",
    createdAt: p.criadoEm || order.createdAt || new Date().toISOString(),
    updatedAt: p.criadoEm || order.createdAt || new Date().toISOString(),
  };
}

function itemPlanejadoEmAprovacao(order: StoredOrder): ItemComprar[] {
  return parseItensComprar(order.details?.itensComprar)
    .filter((p) => p.destino === "aprovacao" && (p.valorOrcado || 0) > 0);
}

export async function fetchSolicitacoes(): Promise<Solicitacao[]> {
  const [ops, orders] = await Promise.all([
    fetchOrdens(),
    fetchOrdersFromSheet().catch(() => [] as StoredOrder[]),
  ]);
  const orderById = new Map(orders.map((o) => [o.id, o] as const));
  const list: Solicitacao[] = [];
  const coveredPlan = new Set<string>();
  const ids = new Set<string>();

  for (const op of ops) {
    const order = orderById.get(op.contratoId);
    const planejados = order ? itemPlanejadoEmAprovacao(order) : [];
    const planejadosById = new Map(planejados.map((p) => [p.id, p] as const));

    for (const item of op.compras || []) {
      if (item.removidoDoContrato && !item.solicitacaoId) continue;
      const planejado = item.origemContratoItemId ? planejadosById.get(item.origemContratoItemId) : undefined;
      const status = compraStatusOf(item);
      const deveAparecer = !!item.solicitacaoId || !!planejado || [
        "Aguardando autorização", "Compra autorizada", "Compra realizada", "Pago",
      ].includes(status);
      if (!deveAparecer) continue;

      if (planejado) coveredPlan.add(`${op.contratoId}:${planejado.id}`);
      const s = solicitacaoDeItem(op, item, order, {
        forcarPendente: !!planejado && (status === "Aguardando orçamento" || status === "Orçamento recebido"),
        idPreferido: planejado?.id,
      });
      if (!ids.has(s.id)) {
        ids.add(s.id);
        list.push(s);
      }
    }
  }

  // Última rede de proteção: o Contrato é soberano sobre a intenção de enviar
  // para aprovação. Mesmo que a OP ainda não exista, a solicitação aparece.
  for (const order of orders) {
    for (const p of itemPlanejadoEmAprovacao(order)) {
      const key = `${order.id}:${p.id}`;
      if (coveredPlan.has(key) || ids.has(p.id)) continue;
      const s = solicitacaoPlanejada(order, p);
      ids.add(s.id);
      list.push(s);
    }
  }

  return list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

async function localizarSolicitacao(id: string): Promise<{ op: OrdemProducao; item: ItemCompra; order?: StoredOrder }> {
  const normalized = text(id);
  if (!normalized) throw new Error("Solicitação inválida.");

  let ops = await fetchOrdens();
  let foundOp: OrdemProducao | undefined;
  let foundItem: ItemCompra | undefined;
  for (const op of ops) {
    const item = (op.compras || []).find((c) =>
      c.solicitacaoId === normalized || c.id === normalized || c.origemContratoItemId === normalized,
    );
    if (item) { foundOp = op; foundItem = item; break; }
  }

  const orders = await fetchOrdersFromSheet().catch(() => [] as StoredOrder[]);
  const orderById = new Map(orders.map((o) => [o.id, o] as const));
  if (foundOp && foundItem) return { op: foundOp, item: foundItem, order: orderById.get(foundOp.contratoId) };

  // Solicitação pode estar apenas no Contrato (OP ainda não sincronizada).
  const order = orders.find((o) => itemPlanejadoEmAprovacao(o).some((p) => p.id === normalized));
  if (order) {
    const sync = await sincronizarItensContrato(order);
    const op = sync?.op || (await fetchOrdens()).find((x) => x.contratoId === order.id);
    const item = op?.compras?.find((c) => c.origemContratoItemId === normalized || c.id === normalized);
    if (op && item) return { op, item, order };
  }

  throw new Error("Solicitação não encontrada na operação/contrato.");
}

async function salvarItem(
  op: OrdemProducao,
  itemId: string,
  transform: (item: ItemCompra) => ItemCompra,
  log?: { id: string; kind: SolLogKind; payload?: SolLogPayload },
): Promise<OrdemProducao> {
  let next: OrdemProducao = {
    ...op,
    compras: (op.compras || []).map((c) => c.id === itemId ? transform(c) : c),
  };
  if (log) next = withSolLog(next, log.id, log.kind, log.payload || {});
  return saveOrdem(next);
}

export async function fetchSolicitacao(id: string): Promise<Solicitacao | null> {
  const list = await fetchSolicitacoes();
  return list.find((s) => s.id === id) || null;
}

function eventoLabel(kind: SolLogKind): string {
  const labels: Record<SolLogKind, string> = {
    CRIADA: "Solicitação criada",
    EDITADA: "Solicitação editada",
    AUTORIZADA: "Compra autorizada",
    REVOGADA: "Autorização revogada",
    RECUSADA: "Solicitação recusada",
    CANCELADA: "Solicitação cancelada",
    COMPRA_REALIZADA: "Compra realizada",
    PAGAMENTO_RESERVADO: "Pagamento preparado",
    PAGAMENTO_REGISTRADO: "Pagamento registrado — lançamento criado no Fluxo de Caixa",
  };
  return labels[kind];
}

function eventoDetalhe(ev: ParsedSolLog): string {
  const p = ev.payload;
  if (ev.kind === "RECUSADA") return text(p.motivo);
  if (ev.kind === "PAGAMENTO_REGISTRADO" && text(p.lancamentoId)) return `Lançamento ${text(p.lancamentoId)}`;
  if (ev.kind === "AUTORIZADA") return "Compra liberada, sem lançamento financeiro.";
  return text(p.detalhe || p.descricao || "");
}

export async function fetchEventos(id: string): Promise<SolicitacaoEvento[]> {
  try {
    const { op } = await localizarSolicitacao(id);
    const logs = logsDaSolicitacao(op, id);
    if (logs.length) {
      return logs.map((ev) => ({
        id: ev.logId,
        acao: eventoLabel(ev.kind),
        detalhe: eventoDetalhe(ev),
        atorEmail: ev.usuario,
        createdAt: ev.dataHora,
      }));
    }
    return [{
      id: `${id}-importado`,
      acao: "Solicitação importada da operação",
      detalhe: "Registro derivado do item de compra da OP/Contrato.",
      atorEmail: "Sistema",
      createdAt: op.atualizadoEm || op.criadoEm,
    }];
  } catch {
    return [];
  }
}

export async function fetchSolicitacoesPorItem(): Promise<Record<string, Solicitacao>> {
  const list = await fetchSolicitacoes();
  const map: Record<string, Solicitacao> = {};
  for (const s of list) if (s.origemItemId && !map[s.origemItemId]) map[s.origemItemId] = s;
  return map;
}

export async function criarSolicitacao(input: NovaSolicitacao) {
  const origemItemId = text(input.origemItemId);
  const valor = numero(input.valor);
  const agora = new Date().toISOString();

  if (origemItemId) {
    const ops = await fetchOrdens();
    for (const op of ops) {
      const item = (op.compras || []).find((c) => c.id === origemItemId || c.origemContratoItemId === origemItemId || c.solicitacaoId === origemItemId);
      if (!item) continue;
      const id = item.solicitacaoId || item.origemContratoItemId || item.id;
      const jaCriada = logsDaSolicitacao(op, id).some((x) => x.kind === "CRIADA");
      const qtd = item.quantidade || 1;
      let nextItem: ItemCompra = {
        ...item,
        solicitacaoId: id,
        fornecedor: text(input.fornecedor) || item.fornecedor,
        formaPagamento: text(input.formaPagamento) || item.formaPagamento || "PIX",
        valorOrcado: valor > 0 ? valor / qtd : item.valorOrcado,
        observacao: input.observacoes != null ? text(input.observacoes) : item.observacao,
      };
      const status = compraStatusOf(nextItem);
      if (status === "Aguardando orçamento" || status === "Orçamento recebido") {
        nextItem = applyCompraStatus(nextItem, "Aguardando autorização");
      }
      let next: OrdemProducao = { ...op, compras: op.compras.map((c) => c.id === item.id ? nextItem : c) };
      if (!jaCriada) {
        next = withSolLog(next, id, "CRIADA", {
          origem: input.origem || "ordem_producao",
          tipo: input.tipo || "compra_materiais",
          pedidoId: input.pedidoId || op.contratoId,
          pedidoCliente: input.pedidoCliente || "",
          descricao: input.descricao || item.descricao,
          categoria: input.categoria || "Fornecedor",
          conta: input.conta || "Caixa",
          observacoes: input.observacoes || item.observacao || "",
          dataPrevista: input.dataPrevista || "",
          detalhe: `Item enviado para aprovação em ${agora.slice(0, 10)}.`,
        });
      }
      await saveOrdem(next);
      return { id, duplicada: jaCriada };
    }
  }

  // Solicitação manual: fica numa OP técnica finalizada, invisível para o fluxo
  // operacional normal, mas persistida na mesma aba ORDENS_PRODUCAO.
  const id = crypto.randomUUID();
  const itemId = crypto.randomUUID();
  const item: ItemCompra = {
    id: itemId,
    descricao: text(input.itens?.[0]?.descricao) || text(input.descricao) || "Solicitação manual",
    quantidade: Number(input.itens?.[0]?.quantidade || 1) || 1,
    unidade: text(input.itens?.[0]?.unidade) || "un",
    observacao: text(input.observacoes),
    fornecedor: text(input.fornecedor),
    valorOrcado: valor,
    valorReal: 0,
    formaPagamento: text(input.formaPagamento) || "PIX",
    pago: false,
    comprado: false,
    tipo: input.tipo === "compra_patrimonio" ? "Patrimônio" : "Consumo",
    statusCompra: "Aguardando autorização",
    integrado: false,
    solicitacaoId: id,
    dataCompra: "",
    responsavel: currentUser(),
  };
  let op: OrdemProducao = {
    id: crypto.randomUUID(),
    contratoId: `${MANUAL_PREFIX}${id}`,
    numero: "",
    criadoEm: agora,
    atualizadoEm: agora,
    status: "Finalizado",
    compras: [item],
    producao: [],
    separacao: [],
    conferencia: emptyConferencia(),
    historico: [],
    patrimoniosReservados: [],
    ativo: "Sim",
  };
  op = withSolLog(op, id, "CRIADA", {
    origem: input.origem || "compra_manual",
    tipo: input.tipo || "compra_materiais",
    pedidoId: input.pedidoId || "",
    pedidoCliente: input.pedidoCliente || "",
    descricao: input.descricao || item.descricao,
    categoria: input.categoria || "Fornecedor",
    conta: input.conta || "Caixa",
    observacoes: input.observacoes || "",
    dataPrevista: input.dataPrevista || "",
  });
  await saveOrdem(op);
  return { id, duplicada: false };
}

export async function editarSolicitacao(input: NovaSolicitacao & { id: string }) {
  const { op, item } = await localizarSolicitacao(input.id);
  const s = solicitacaoDeItem(op, item);
  if (s.status !== "pendente") throw new Error("Somente solicitações pendentes podem ser editadas.");
  const total = numero(input.valor);
  const qtd = item.quantidade || 1;
  await salvarItem(op, item.id, (c) => ({
    ...c,
    descricao: text(input.itens?.[0]?.descricao) || text(input.descricao) || c.descricao,
    fornecedor: input.fornecedor != null ? text(input.fornecedor) : c.fornecedor,
    formaPagamento: text(input.formaPagamento) || c.formaPagamento || "PIX",
    valorOrcado: total > 0 ? total / qtd : c.valorOrcado,
    observacao: input.observacoes != null ? text(input.observacoes) : c.observacao,
    solicitacaoId: input.id,
  }), {
    id: input.id,
    kind: "EDITADA",
    payload: {
      descricao: input.descricao || "",
      categoria: input.categoria || s.categoria,
      conta: input.conta || s.conta,
      observacoes: input.observacoes || "",
      dataPrevista: input.dataPrevista || "",
      detalhe: "Dados/valor da solicitação atualizados.",
    },
  });
  return { ok: true };
}

export async function autorizarSolicitacao(id: string) {
  const { op, item } = await localizarSolicitacao(id);
  const s = solicitacaoDeItem(op, item, undefined, { idPreferido: id, forcarPendente: true });
  if (s.status === "autorizada" || s.status === "comprada" || s.status === "lancada") return { ok: true, jaAutorizada: true };
  if (s.status !== "pendente") throw new Error("Solicitações recusadas ou canceladas não podem ser autorizadas.");
  await salvarItem(op, item.id, (c) => ({
    ...applyCompraStatus(c, "Compra autorizada"),
    solicitacaoId: id,
  }), { id, kind: "AUTORIZADA", payload: { detalhe: "Compra liberada, sem lançamento financeiro." } });
  return { ok: true, jaAutorizada: false };
}

export async function revogarAutorizacao(id: string) {
  const { op, item } = await localizarSolicitacao(id);
  const s = solicitacaoDeItem(op, item, undefined, { idPreferido: id });
  if (s.status !== "autorizada") throw new Error("Somente solicitações autorizadas podem ter a autorização revogada.");
  if (compraStatusOf(item) === "Compra realizada" || compraStatusOf(item) === "Pago") throw new Error("Não é possível revogar: a compra já foi realizada ou paga.");
  await salvarItem(op, item.id, (c) => ({ ...applyCompraStatus(c, "Aguardando autorização"), solicitacaoId: id }), {
    id, kind: "REVOGADA", payload: { detalhe: "Autorização financeira revogada; item mantido na operação." },
  });
  return { ok: true };
}

export async function recusarSolicitacao(id: string, motivo: string) {
  if (!text(motivo)) throw new Error("O motivo da recusa é obrigatório.");
  const { op, item } = await localizarSolicitacao(id);
  const s = solicitacaoDeItem(op, item, undefined, { idPreferido: id, forcarPendente: true });
  if (s.status !== "pendente") throw new Error("Somente solicitações pendentes podem ser recusadas.");
  await salvarItem(op, item.id, (c) => ({ ...c, solicitacaoId: id }), {
    id, kind: "RECUSADA", payload: { motivo: text(motivo) },
  });
  return { ok: true };
}

export async function cancelarSolicitacao(id: string, motivo?: string) {
  const { op, item } = await localizarSolicitacao(id);
  const s = solicitacaoDeItem(op, item, undefined, { idPreferido: id, forcarPendente: true });
  if (s.status !== "pendente") throw new Error("Somente solicitações pendentes podem ser canceladas.");
  await salvarItem(op, item.id, (c) => ({ ...c, solicitacaoId: id }), {
    id, kind: "CANCELADA", payload: { detalhe: text(motivo) },
  });
  return { ok: true };
}

export async function marcarCompradaSemFinanceiro(input: { id: string; valorReal?: number | string; fornecedor?: string; dataCompra?: string }) {
  const { op, item } = await localizarSolicitacao(input.id);
  if (compraStatusOf(item) === "Pago" || compraStatusOf(item) === "Compra realizada") return { ok: true, jaComprada: true };
  const total = numero(input.valorReal) || valorTotalItem(item);
  const qtd = item.quantidade || 1;
  await salvarItem(op, item.id, (c) => ({
    ...applyCompraStatus(c, "Compra realizada"),
    solicitacaoId: input.id,
    fornecedor: text(input.fornecedor) || c.fornecedor,
    valorReal: total > 0 ? total / qtd : c.valorReal,
    dataCompra: text(input.dataCompra) || new Date().toISOString().slice(0, 10),
  }), { id: input.id, kind: "COMPRA_REALIZADA", payload: { detalhe: "Compra realizada; pagamento ainda não lançado no caixa." } });
  return { ok: true, jaComprada: false };
}

function lancamentoDaSolicitacao(list: Lancamento[], id: string, lancamentoId: string) {
  const origem = origemLancamento(id);
  return list.find((l) => l.id === lancamentoId || l.origem === origem);
}

export async function registrarPagamentoSolicitacao(input: PagamentoSolicitacao) {
  let ctx = await localizarSolicitacao(input.id);
  let { op, item } = ctx;
  const s = solicitacaoDeItem(op, item, ctx.order, { idPreferido: input.id });
  if (s.status === "lancada") return { ok: true, lancamentoId: s.lancamentoId, jaLancada: true };
  if (s.status !== "autorizada" && s.status !== "comprada") {
    throw new Error("Somente compras autorizadas ou realizadas podem ter o pagamento registrado.");
  }

  const valorFinal = numero(input.valor) || valorTotalItem(item);
  if (valorFinal <= 0) throw new Error("Informe o valor real pago antes de lançar no Fluxo de Caixa.");
  const meta = metaDaSolicitacao(op, input.id);
  const fornecedor = text(input.fornecedor) || item.fornecedor || "";
  const forma = text(input.formaPagamento) || item.formaPagamento || "PIX";
  const conta = text(input.conta) || meta.conta || "Caixa";
  const data = text(input.dataPagamento) || new Date().toISOString().slice(0, 10);
  const observacoes = text(input.observacoes) || item.observacao || "";
  const lancamentoId = meta.lancamentoId || crypto.randomUUID();

  if (!meta.lancamentoId) {
    op = await salvarItem(op, item.id, (c) => ({ ...c, solicitacaoId: input.id }), {
      id: input.id,
      kind: "PAGAMENTO_RESERVADO",
      payload: { lancamentoId },
    });
    item = op.compras.find((c) => c.id === item.id) || item;
  }

  let lancamentos = await fetchLancamentos({ includeDeleted: true, force: true }).catch(() => [] as Lancamento[]);
  let existe = lancamentoDaSolicitacao(lancamentos, input.id, lancamentoId);
  if (!existe) {
    const lancamento: Lancamento = {
      id: lancamentoId,
      data,
      tipo: "Saída",
      categoria: meta.categoria || "Fornecedor",
      descricao: item.descricao || "Solicitação financeira",
      valor: valorFinal,
      formaPagamento: forma,
      conta,
      beneficiario: fornecedor,
      observacoes: [
        observacoes,
        `Solicitação Financeira: ${input.id}`,
        op.numero ? `Ordem de Produção: ${op.numero}` : "",
        s.pedidoId ? `Contrato: ${s.pedidoId}` : "",
      ].filter(Boolean).join(" · "),
      contratoId: s.pedidoId || "",
      origem: origemLancamento(input.id),
      createdAt: new Date().toISOString(),
      ativo: "Sim",
    };
    try {
      await createLancamento(lancamento);
    } catch (e) {
      // Timeout não prova falha: confirma na planilha antes de devolver erro.
      lancamentos = await fetchLancamentos({ includeDeleted: true, force: true }).catch(() => [] as Lancamento[]);
      existe = lancamentoDaSolicitacao(lancamentos, input.id, lancamentoId);
      if (!existe) throw e;
    }
  }

  if (!existe) {
    lancamentos = await fetchLancamentos({ includeDeleted: true, force: true });
    existe = lancamentoDaSolicitacao(lancamentos, input.id, lancamentoId);
  }
  if (!existe) throw new Error("O lançamento financeiro ainda não foi confirmado. A solicitação foi mantida para nova tentativa.");

  const qtd = item.quantidade || 1;
  await salvarItem(op, item.id, (c) => ({
    ...applyCompraStatus(c, "Pago"),
    solicitacaoId: input.id,
    fornecedor: fornecedor || c.fornecedor,
    formaPagamento: forma,
    valorReal: valorFinal / qtd,
    dataCompra: c.dataCompra || data,
  }), {
    id: input.id,
    kind: "PAGAMENTO_REGISTRADO",
    payload: { lancamentoId, detalhe: `Saída confirmada no Fluxo de Caixa por ${valorFinal.toFixed(2)}.` },
  });

  return { ok: true, lancamentoId, jaLancada: false };
}

export async function executarEmLote(itens: Solicitacao[], acao: (s: Solicitacao) => Promise<unknown>): Promise<ResultadoLote> {
  const out: ResultadoLote = { concluidas: [], falhas: [] };
  for (const s of itens) {
    try {
      await acao(s);
      out.concluidas.push({ id: s.id, descricao: s.descricao });
    } catch (e) {
      out.falhas.push({ id: s.id, descricao: s.descricao, erro: e instanceof Error ? e.message : "Erro desconhecido" });
    }
  }
  return out;
}
