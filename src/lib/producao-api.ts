// ============================================================================
// MÓDULO ORDEM DE PRODUÇÃO — LHL FESTAS
// ----------------------------------------------------------------------------
// Coração operacional: compras, produção, separação, conferência, kit pronto.
// Persistência: cache local (localStorage) + sincronização best-effort com a
// aba "ORDENS_PRODUCAO" do Google Sheets (mesmo Apps Script já usado).
// Nada aqui altera contratos, financeiro, patrimônio ou agenda existentes —
// apenas adiciona novas leituras/escritas.
// ============================================================================

import { kitItemsFor } from "@/data/kits";
import type { StoredOrder } from "./orders-storage";
import { toDateISO } from "./date-utils";
import { parseItensComprar, parseItensProduzir } from "./materiais-catalogo";

import { sheetGet, sheetPost, rowsOf } from "./sheets-gateway";

const LS_KEY = "lhl_ordens_producao";

/* ============================ Tipos ============================ */

export const OP_STATUS = [
  "Aguardando Início",
  "Compras",
  "Produção",
  "Aguardando Confirmação",
  "Kit Pronto",
  "Finalizado",
] as const;
export type OPStatus = (typeof OP_STATUS)[number];

export const OP_STATUS_EMOJI: Record<OPStatus, string> = {
  "Aguardando Início": "🟡",
  Compras: "🟠",
  Produção: "🟠",
  "Aguardando Confirmação": "🔵",
  "Kit Pronto": "🟣",
  Finalizado: "🟢",
};

export const OP_STATUS_CLASS: Record<OPStatus, string> = {
  "Aguardando Início": "bg-yellow-400/15 text-yellow-600 border-yellow-400/40",
  Compras: "bg-orange-500/15 text-orange-600 border-orange-500/40",
  Produção: "bg-orange-500/15 text-orange-600 border-orange-500/40",
  "Aguardando Confirmação": "bg-blue-500/15 text-blue-600 border-blue-500/40",
  "Kit Pronto": "bg-purple-500/15 text-purple-600 border-purple-500/40",
  Finalizado: "bg-emerald-500/15 text-emerald-600 border-emerald-500/40",
};

export type TipoCompra = "Consumo" | "Patrimônio";

export const UNIDADES = ["un", "pct", "m", "kg", "cx", "rolo", "folha", "cento"] as const;

export const FORMAS_PAGAMENTO = [
  "PIX",
  "Dinheiro",
  "Cartão de Débito",
  "Cartão de Crédito",
  "Boleto",
  "Transferência",
] as const;

/* ---------- Fluxo operacional único do item de compra ----------
   Cadastrar item → Salvar item → Orçamento recebido → Enviar para aprovação
   (nasce a Solicitação Financeira) → Aprovação → Compra autorizada →
   Marcar compra realizada → Registrar pagamento → Fluxo de Caixa.
   Sem atalhos: cada etapa depende da anterior. */


export const COMPRA_STATUS = [
  "Aguardando orçamento",
  "Orçamento recebido",
  "Aguardando autorização",
  "Compra autorizada",
  "Compra realizada",
  "Pago",
] as const;
export type CompraStatus = (typeof COMPRA_STATUS)[number];

export const COMPRA_STATUS_EMOJI: Record<CompraStatus, string> = {
  "Aguardando orçamento": "⚪",
  "Orçamento recebido": "🟡",
  "Aguardando autorização": "🟠",
  "Compra autorizada": "🟣",
  "Compra realizada": "🔵",
  Pago: "🟢",
};

export const COMPRA_STATUS_CLASS: Record<CompraStatus, string> = {
  "Aguardando orçamento": "bg-muted text-muted-foreground border-border",
  "Orçamento recebido": "bg-yellow-500/15 text-yellow-600 border-yellow-500/40",
  "Aguardando autorização": "bg-orange-500/15 text-orange-600 border-orange-500/40",
  "Compra autorizada": "bg-purple-500/15 text-purple-600 border-purple-500/40",
  "Compra realizada": "bg-blue-500/15 text-blue-600 border-blue-500/40",
  Pago: "bg-emerald-500/15 text-emerald-600 border-emerald-500/40",
};

/** Rótulo do botão que avança o item para a próxima etapa. */
export const COMPRA_ACAO_LABEL: Record<CompraStatus, string> = {
  "Aguardando orçamento": "Registrar orçamento recebido",
  "Orçamento recebido": "Enviar para aprovação",
  "Aguardando autorização": "Aguardando autorização financeira",
  "Compra autorizada": "Marcar compra realizada",
  "Compra realizada": "Registrar pagamento",
  Pago: "",
};

/** Mensagem de situação exibida ao lado do item (sempre o status real). */
export const COMPRA_STATUS_MENSAGEM: Record<CompraStatus, string> = {
  "Aguardando orçamento": "Registre o orçamento recebido deste material.",
  "Orçamento recebido": "Envie este item para aprovação antes de realizar a compra.",
  "Aguardando autorização": "Aguardando autorização financeira.",
  "Compra autorizada": "Compra autorizada. O item já pode ser adquirido.",
  "Compra realizada": "Compra registrada com sucesso.",
  Pago: "Pagamento registrado e lançamento financeiro criado.",
};


/** Aviso exibido quando a compra ainda não foi autorizada financeiramente. */
export const COMPRA_BLOQUEIO_MENSAGEM =
  "Esta compra ainda aguarda autorização financeira.";


export type ItemCompra = {
  id: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  observacao: string;
  fornecedor: string;
  valorOrcado: number;
  valorReal: number;
  formaPagamento: string;
  pago: boolean;
  comprado: boolean;
  tipo: TipoCompra;
  /** Etapa operacional do material (fluxo oficial). */
  statusCompra?: CompraStatus;
  /** Marca que já gerou Solicitação Financeira / cadastro patrimonial. */
  integrado?: boolean;
  /** Solicitação Financeira vinculada (fonte única do status financeiro). */
  solicitacaoId?: string;
  /** Item nascido na seção "Itens a Comprar" do Contrato (evita duplicidade). */
  origemContratoItemId?: string;
  /** Item saiu do planejamento do Contrato, mas mantém histórico/financeiro. */
  removidoDoContrato?: boolean;
  /** Status terminal de histórico: item cancelado, nunca apagado. */
  cancelado?: boolean;
  dataCompra?: string;
  responsavel?: string;
};

/**
 * Item de compra que já saiu do estágio inicial: possui orçamento, fornecedor,
 * autorização, compra registrada, pagamento ou vínculo financeiro.
 * Itens assim NUNCA podem ser excluídos definitivamente — só cancelados.
 */
export function compraTemHistorico(c: ItemCompra): boolean {
  return (
    compraStatusOf(c) !== "Aguardando orçamento" ||
    !!c.solicitacaoId ||
    !!c.integrado ||
    !!c.cancelado ||
    (c.valorOrcado || 0) > 0 ||
    (c.valorReal || 0) > 0 ||
    !!String(c.fornecedor ?? "").trim() ||
    c.comprado ||
    c.pago
  );
}


/** Etapa atual do item — compatível com registros antigos. */
export function compraStatusOf(c: ItemCompra): CompraStatus {
  // EVIDÊNCIA FINANCEIRA: Se tem solicitação paga ou lançamento, o status é Pago
  if (c.pago || c.statusCompra === "Pago") return "Pago";
  
  const legado = String(c.statusCompra ?? "");
  if (legado === "Solicitação de compra") return "Aguardando autorização";
  if ((COMPRA_STATUS as readonly string[]).includes(legado)) return legado as CompraStatus;
  
  if (c.comprado || legado === "Compra realizada") return "Compra realizada";
  return "Aguardando orçamento";
}

/** Item já comprado (ou pago) — usado no progresso e nas listas. */
export function compraConcluida(c: ItemCompra): boolean {
  const s = compraStatusOf(c);
  return s === "Compra realizada" || s === "Pago";
}

/**
 * FILA OPERACIONAL ATIVA — fonte única.
 * Um item de compra só continua na fila enquanto NÃO estiver comprado.
 * Itens comprados/pagos/cancelados permanecem no banco (histórico completo),
 * apenas saem das listas ativas em todos os lugares.
 */
export function compraAtiva(c: ItemCompra): boolean {
  return !c.cancelado && !compraConcluida(c);
}


/** Aplica a etapa mantendo `pago`/`comprado` coerentes (compatibilidade). */
export function applyCompraStatus(c: ItemCompra, status: CompraStatus): ItemCompra {
  const comprado = status === "Compra realizada" || status === "Pago";
  const pago = status === "Pago";
  return {
    ...c,
    statusCompra: status,
    comprado,
    pago,
    dataCompra: comprado ? c.dataCompra || todayISO() : "",
  };
}

/** Próxima etapa do fluxo (ou null quando já está no fim). */
export function proximaEtapaCompra(c: ItemCompra): CompraStatus | null {
  const i = COMPRA_STATUS.indexOf(compraStatusOf(c));
  return i >= 0 && i < COMPRA_STATUS.length - 1 ? COMPRA_STATUS[i + 1] : null;
}

/** Etapa anterior (correção de erro operacional). */
export function etapaAnteriorCompra(c: ItemCompra): CompraStatus | null {
  const i = COMPRA_STATUS.indexOf(compraStatusOf(c));
  return i > 0 ? COMPRA_STATUS[i - 1] : null;
}

export const descricaoCompra = (c: ItemCompra) =>
  String(c?.descricao ?? "").trim() || "(item sem descrição)";

/** Normaliza um item de compra antigo/incompleto apenas para leitura segura. */
export function normalizeItemCompra(c: any): ItemCompra {
  return {
    id: String(c?.id ?? crypto.randomUUID()),
    descricao: String(c?.descricao ?? ""),
    quantidade: Number(c?.quantidade ?? 1) || 1,
    unidade: String(c?.unidade ?? "un"),
    observacao: String(c?.observacao ?? ""),
    fornecedor: String(c?.fornecedor ?? ""),
    valorOrcado: Number(c?.valorOrcado ?? 0) || 0,
    valorReal: Number(c?.valorReal ?? 0) || 0,
    formaPagamento: String(c?.formaPagamento ?? "PIX"),
    pago: Boolean(c?.pago),
    comprado: Boolean(c?.comprado),
    tipo: (c?.tipo ?? "Consumo") as TipoCompra,
    statusCompra: compraStatusOf((c ?? {}) as ItemCompra),
    integrado: Boolean(c?.integrado),
    solicitacaoId: c?.solicitacaoId ? String(c.solicitacaoId) : undefined,
    origemContratoItemId: c?.origemContratoItemId ? String(c.origemContratoItemId) : undefined,
    removidoDoContrato: c?.removidoDoContrato ? true : undefined,
    cancelado: c?.cancelado ? true : undefined,
    dataCompra: c?.dataCompra ? String(c.dataCompra) : "",
    responsavel: String(c?.responsavel ?? ""),
  };
}

export const valorPrevistoCompra = (c: ItemCompra) => (c.valorOrcado || 0) * (c.quantidade || 1);
export const valorRealCompra = (c: ItemCompra) => (c.valorReal || 0) * (c.quantidade || 1);



/** "Cancelado" é apenas status terminal de histórico — não altera o fluxo. */
export type StatusProducao = "Pendente" | "Em Produção" | "Concluído" | "Cancelado";

/** Rótulos oficiais do fluxo de produção (exibição). */
export const PRODUCAO_STATUS_LABEL: Record<StatusProducao, string> = {
  Pendente: "Produção pendente",
  "Em Produção": "Em produção",
  Concluído: "Produzido",
  Cancelado: "Cancelado",
};

export const PRODUCAO_STATUS_CLASS: Record<StatusProducao, string> = {
  Pendente: "bg-yellow-500/15 text-yellow-600 border-yellow-500/40",
  "Em Produção": "bg-orange-500/15 text-orange-600 border-orange-500/40",
  Concluído: "bg-emerald-500/15 text-emerald-600 border-emerald-500/40",
  Cancelado: "bg-muted text-muted-foreground border-border",
};

export type AnexoProducao = { nome: string; url: string };

export type ItemProducao = {
  id: string;
  descricao: string;
  quantidade?: number;
  responsavel: string;
  prazo: string;
  observacao: string;
  anexos: AnexoProducao[];
  status: StatusProducao;
  /** Item nascido na seção "Itens a Produzir" do Contrato (evita duplicidade). */
  origemContratoItemId?: string;
  /** Saiu do planejamento do Contrato, mas o histórico é preservado. */
  removidoDoContrato?: boolean;
};

/** Produção que já saiu de "Produção pendente" (ou já tem anexos/histórico). */
export function producaoTemHistorico(p: ItemProducao): boolean {
  return p.status !== "Pendente" || (p.anexos || []).length > 0;
}

/**
 * FILA OPERACIONAL ATIVA de produção — fonte única.
 * "Produzido" (Concluído) e "Cancelado" saem das filas ativas em todos os
 * lugares, mas continuam no banco com todo o histórico.
 */
export function producaoAtiva(p: ItemProducao): boolean {
  return p.status === "Pendente" || p.status === "Em Produção";
}



export type ItemSeparacao = {
  id: string;
  descricao: string;
  marcado: boolean;
  origem: "kit" | "manual";
};

export type Conferencia = {
  comprasOk: boolean;
  producaoOk: boolean;
  kitProntoOk: boolean;
  conferidoPor: string;
  data: string;
  observacoes: string;
};

export type LogEntry = {
  id: string;
  usuario: string;
  dataHora: string;
  acao: string;
};

export type OrdemProducao = {
  id: string;
  contratoId: string;
  numero: string;
  criadoEm: string;
  atualizadoEm: string;
  status: OPStatus;
  compras: ItemCompra[];
  producao: ItemProducao[];
  separacao: ItemSeparacao[];
  conferencia: Conferencia;
  historico: LogEntry[];
  patrimoniosReservados: string[];
  finalizadaEm?: string;
  /** Auditoria da confirmação humana de Kit Pronto. */
  kitProntoConfirmadoEm?: string;
  kitProntoConfirmadoPor?: string;
  kitProntoOrigem?: string;
  ativo?: string;
  normalizada?: boolean;
  /**
   * Lápides (tombstones) de exclusão explícita de itens de compra/produção.
   * A fusão anti-perda (mergeOrdens) NUNCA ressuscita um id listado aqui.
   */
  itensExcluidos?: string[];
};


/* ============================ Helpers ============================ */

export const emptyConferencia = (): Conferencia => ({
  comprasOk: false,
  producaoOk: false,
  kitProntoOk: false,
  conferidoPor: "",
  data: "",
  observacoes: "",
});

export function currentUser(): string {
  if (typeof window === "undefined") return "Sistema";
  return localStorage.getItem("lhl_user_name") || "Josi";
}

export function logAction(op: OrdemProducao, acao: string): OrdemProducao {
  const entry: LogEntry = {
    id: crypto.randomUUID(),
    usuario: currentUser(),
    dataHora: new Date().toISOString(),
    acao,
  };
  return { ...op, historico: [entry, ...(op.historico || [])] };
}

export function fmtDateTimeBR(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function fmtDateBR(iso?: string): string {
  const v = toDateISO(iso);
  if (!v) return "—";
  return new Date(`${v}T00:00:00`).toLocaleDateString("pt-BR");
}

export const todayISO = () => new Date().toISOString().slice(0, 10);

export function addDaysISO(days: number, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ============================ Separação automática ============================ */

/** Gera a lista de separação a partir do kit contratado. */
export function separacaoFromKit(order: StoredOrder): ItemSeparacao[] {
  const itens = kitItemsFor(order.modalidade, order.plano);
  const base = itens.length
    ? itens
    : ["Painel do tema", "Bandejas", "Displays", "Balões"];
  const extra: string[] = [];
  const d = order.details;
  if (d?.balaoTipo && String(d.balaoTipo) !== "Sem Balões") extra.push(`Balões — ${d.balaoTipo}`);
  if (d?.demaisPecas) {
    d.demaisPecas
      .split(/\r?\n|;/g)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => extra.push(s));
  }
  return [...base, ...extra].map((descricao) => ({
    id: crypto.randomUUID(),
    descricao,
    marcado: false,
    origem: "kit" as const,
  }));
}

/** Patrimônios reservados pela OP (derivados do kit contratado). */
export function patrimoniosDoKit(order: StoredOrder): string[] {
  return kitItemsFor(order.modalidade, order.plano);
}

/* ============================ Progresso e status ============================ */

export type StageKey = "compras" | "producao";

export type StageInfo = {
  key: StageKey;
  label: string;
  done: boolean;
  fraction: number;
  total: number;
  concluidos: number;
};

export function stages(op: OrdemProducao): StageInfo[] {
  // Itens cancelados são histórico: não contam como pendência nem como avanço.
  const compras = (op.compras || []).filter((c) => !c.cancelado);
  const producaoItens = (op.producao || []).filter((p) => p.status !== "Cancelado");
  const compTotal = compras.length;
  const compDone = compras.filter(compraConcluida).length;
  const prodTotal = producaoItens.length;
  const prodDone = producaoItens.filter((p) => p.status === "Concluído").length;

  const frac = (done: number, total: number) => (total === 0 ? 1 : done / total);

  return [
    {
      key: "compras",
      label: "Compras",
      total: compTotal,
      concluidos: compDone,
      fraction: frac(compDone, compTotal),
      done: compTotal === 0 || compDone === compTotal,
    },
    {
      key: "producao",
      label: "Produção",
      total: prodTotal,
      concluidos: prodDone,
      fraction: frac(prodDone, prodTotal),
      done: prodTotal === 0 || prodDone === prodTotal,
    },
  ];
}

export function progressPercent(op: OrdemProducao): number {
  const s = stages(op);
  // Progresso baseado apenas em Compras (índice 0) e Produção (índice 1).
  const relevant = [s[0], s[1]];
  const total = relevant.reduce((acc, x) => acc + x.fraction, 0) / relevant.length;
  return Math.round(total * 100);
}

export function conferenciaCompleta(op: OrdemProducao): boolean {
  // 1. FINALIZADO: Se o status explícito for finalizado.
  if (op.status === "Finalizado") return true;
  
  // 2. KIT PRONTO: Somente se houver a confirmação humana da Josi.
  // IMPORTANTE: Se houver pendências (compras/produção ativas), não pode ser roxo.
  const pend = pendenciasOperacionais(op);
  const temPendencias = pend.compras > 0 || pend.producao > 0;
  
  if (op.kitProntoConfirmadoEm && !temPendencias) return true;
  
  return false;
}


/**
 * Reconcilia o estado operacional com evidências externas (Solicitações/Financeiro).
 * Se um item de compra na OP está como 'Compra autorizada' mas a solicitação correspondente
 * está 'lancada', a OP deve refletir 'Compra realizada'.
 */
export function reconciliarItemComSolicitacao(item: ItemCompra, solicitacao?: any, lancamentos: any[] = []): ItemCompra {
  if (item.statusCompra === "Pago" || item.cancelado) return item;

  // 1. EVIDÊNCIA MÁXIMA: Lançamento financeiro vinculado por ID ou descrição específica
  const temLancamento = (lancamentos || []).some(l => 
    l.tipo === "Saída" && (
      (item.solicitacaoId && l.origem === `solicitacao-${item.solicitacaoId}`) ||
      (solicitacao?.id && l.origem === `solicitacao-${solicitacao.id}`) ||
      (l.descricao?.includes(item.descricao) && l.descricao?.includes(item.id.slice(0, 8)))
    )
  );

  if (temLancamento && (item.statusCompra as string) !== "Pago" && item.statusCompra !== "Compra realizada") {
     return {
      ...item,
      comprado: true,
      statusCompra: "Compra realizada",
      valorReal: item.valorReal || item.valorOrcado
    };
  }

  if (!solicitacao) return item;

  // 2. EVIDÊNCIA DA SOLICITAÇÃO: "lancada" significa que o pagamento foi registrado
  if (solicitacao.status === "lancada") {
    return {
      ...item,
      comprado: true,
      pago: true,
      statusCompra: "Pago",
      valorReal: Number(solicitacao.valor) || item.valorReal || item.valorOrcado
    };
  }
  
  // 3. EVIDÊNCIA DE AUTORIZAÇÃO: Avança para 'Compra autorizada' se a solicitação permitir
  if (solicitacao.status === "autorizada") {
    // Se a solicitação está autorizada MAS o item na OP já foi marcado como 'Compra realizada',
    // a OP é o estado mais avançado (evidência de que o comprador já agiu).
    if (item.statusCompra === "Compra realizada") return item;

    const statusAtualIdx = COMPRA_STATUS.indexOf(compraStatusOf(item));
    const statusNovoIdx = COMPRA_STATUS.indexOf("Compra autorizada");
    if (statusNovoIdx > statusAtualIdx) {
      return {
        ...item,
        statusCompra: "Compra autorizada"
      };
    }
  }

  return item;
}


/**
 * DETERMINAÇÃO DO STATUS OPERACIONAL (FONTE ÚNICA)
 * Define a cor e o status real para o calendário e dashboard.
 */
export type NivelOperacional = "finalizado" | "pendente" | "kit-pronto" | "normal";

export function determineNivelOperacional(op: OrdemProducao): NivelOperacional {
  if (op.status === "Finalizado") return "finalizado";
  
  const pend = pendenciasOperacionais(op);
  if (pend.compras > 0 || pend.producao > 0) return "pendente";
  
  if (op.kitProntoConfirmadoEm) return "kit-pronto";
  
  return "normal";
}


/**
 * Normaliza item de compra para evitar crash por dados nulos (versão 2)
 */
export function normalizeItemCompraV2(item: any): ItemCompra {
  const c = normalizeItemCompra(item);
  return {
    ...c,
    statusCompra: (item?.status || item?.statusCompra || "Aguardando orçamento") as CompraStatus,
  };
}



/** Status derivado automaticamente do avanço da OP. */
export function deriveStatus(op: OrdemProducao): OPStatus {
  if (op.status === "Finalizado") return "Finalizado";
  const s = stages(op);
  
  // Itens concluídos (Compras e Produção)
  if (s[0].done && s[1].done) {
     return "Aguardando Confirmação"; 
  }

  if (s[0].done) return "Produção";
  return "Compras";
}

/* ============================ Urgência e atraso ============================ */

export type Urgencia = "Muito Urgente" | "Urgente" | "Normal";

export function diasAte(dataISO?: string): number | null {
  const v = toDateISO(dataISO);
  if (!v) return null;
  const alvo = new Date(`${v}T00:00:00`).getTime();
  const hoje = new Date(`${todayISO()}T00:00:00`).getTime();
  return Math.round((alvo - hoje) / 86400000);
}

export function urgenciaFrom(dataRetirada?: string): Urgencia {
  const d = diasAte(dataRetirada);
  if (d == null) return "Normal";
  if (d <= 7) return "Muito Urgente";
  if (d <= 15) return "Urgente";
  return "Normal";
}

export const URGENCIA_EMOJI: Record<Urgencia, string> = {
  "Muito Urgente": "🔴",
  Urgente: "🟠",
  Normal: "🟢",
};

export function isAtrasada(op: OrdemProducao, order?: StoredOrder): boolean {
  if (op.status === "Kit Pronto" || op.status === "Finalizado") return false;
  const ret = toDateISO(order?.details?.dataRetirada);
  if (!ret) return false;
  return ret < todayISO();
}

/** Pendências textuais para alertas. */
export function pendenciasDaOP(op: OrdemProducao): { compras: string[]; producao: string[] } {
  return {
    compras: (op.compras || []).filter((c) => !c.cancelado && !compraConcluida(c)).map(descricaoCompra),
    producao: (op.producao || [])
      .filter((p) => p.status !== "Concluído" && p.status !== "Cancelado")
      .map((p) => p.descricao)
      .filter(Boolean),
  };
}

/* ================= Conclusão inteligente da OP (fonte única) =================
   Uma OP só é candidata a Kit Pronto quando NÃO existe mais nenhum item de
   compra na fila ativa (estado final = "Compra realizada" ou "Pago") e nenhum
   item de produção na fila ativa (estado final = "Produzido"/Concluído).
   Estados intermediários — aguardando orçamento, aguardando autorização,
   compra autorizada, produção pendente, em produção — continuam pendentes. */

export type PendenciasOperacionais = {
  compras: number;
  producao: number;
  totalCompras: number;
  totalProducao: number;
};

export function pendenciasOperacionais(op: OrdemProducao): PendenciasOperacionais {
  const compras = (op.compras || []).filter((c) => !c.cancelado);
  const producao = (op.producao || []).filter((p) => p.status !== "Cancelado");
  return {
    compras: compras.filter(compraAtiva).length,
    producao: producao.filter(producaoAtiva).length,
    totalCompras: compras.length,
    totalProducao: producao.length,
  };
}

/**
 * A OP tem 0 compras pendentes + 0 produções pendentes e ainda não foi
 * confirmada como Kit Pronto. Nunca vira Kit Pronto automaticamente: apenas
 * habilita a confirmação humana no Dashboard.
 */
export function aguardandoConfirmacaoKit(op: OrdemProducao): boolean {
  if (op.status === "Kit Pronto" || op.status === "Finalizado") return false;
  if (op.kitProntoConfirmadoEm) return false;
  const p = pendenciasOperacionais(op);
  if (p.totalCompras + p.totalProducao === 0) return false;
  return p.compras === 0 && p.producao === 0;
}

/**
 * Reabre o kit automaticamente quando um novo item de compra/produção entra
 * numa OP já confirmada como Kit Pronto. Registra no histórico.
 */
export function reabrirKitSePendente(op: OrdemProducao): OrdemProducao {
  if (!op.kitProntoConfirmadoEm) return op;
  if (op.status === "Finalizado") return op;
  const p = pendenciasOperacionais(op);
  if (p.compras === 0 && p.producao === 0) return op;
  const reaberta: OrdemProducao = {
    ...op,
    status: "Produção",
    finalizadaEm: "",
    kitProntoConfirmadoEm: undefined,
    kitProntoConfirmadoPor: undefined,
    kitProntoOrigem: undefined,
    conferencia: {
      ...(op.conferencia || emptyConferencia()),
      comprasOk: false,
      producaoOk: false,
      kitProntoOk: false,
    },
  };
  return logAction(reaberta, "Kit reaberto devido à inclusão de novo item.");
}

/**
 * Confirmação humana de Kit Pronto (compras + produção + separação/conferência).
 * Registra usuário, data/hora, origem da ação, OP e contrato no histórico.
 */
export async function confirmarKitPronto(
  op: OrdemProducao,
  origem: string,
): Promise<OrdemProducao> {
  const p = pendenciasOperacionais(op);
  if (p.compras > 0 || p.producao > 0) {
    throw new Error("Ainda existem itens de compra ou produção pendentes nesta OP.");
  }
  const agora = new Date().toISOString();
  const usuario = currentUser();
  let next: OrdemProducao = {
    ...op,
    separacao: (op.separacao || []).map((s) => ({ ...s, marcado: true })),
    conferencia: {
      ...(op.conferencia || emptyConferencia()),
      comprasOk: true,
      producaoOk: true,
      kitProntoOk: true,
      conferidoPor: (op.conferencia?.conferidoPor || "").trim() || usuario,
      data: (op.conferencia?.data || "").trim() || agora.slice(0, 10),
    },
    status: "Kit Pronto",
    finalizadaEm: op.finalizadaEm || agora,
    kitProntoConfirmadoEm: agora,
    kitProntoConfirmadoPor: usuario,
    kitProntoOrigem: origem,
  };
  next = logAction(
    next,
    `Kit Pronto confirmado por ${usuario} em ${fmtDateTimeBR(agora)} · origem: ${origem} · ${op.numero} · contrato ${op.contratoId} · separação e conferência confirmadas`,
  );
  return saveOrdem(next);
}



/* ============================ Autocompletar / histórico ============================ */

export type MaterialHistorico = {
  descricao: string;
  ultimoFornecedor: string;
  ultimoValor: number;
  ultimaCompra: string;
  tipo: TipoCompra;
  unidade: string;
};

export function buildMaterialHistory(ops: OrdemProducao[]): MaterialHistorico[] {
  const map = new Map<string, MaterialHistorico>();
  const sorted = [...ops].sort(
    (a, b) => new Date(a.atualizadoEm).getTime() - new Date(b.atualizadoEm).getTime(),
  );
  for (const op of sorted) {
    for (const c of op.compras || []) {
      const key = c.descricao.trim().toLowerCase();
      if (!key) continue;
      map.set(key, {
        descricao: c.descricao.trim(),
        ultimoFornecedor: c.fornecedor || map.get(key)?.ultimoFornecedor || "",
        ultimoValor: c.valorReal || c.valorOrcado || map.get(key)?.ultimoValor || 0,
        ultimaCompra: c.dataCompra || op.atualizadoEm.slice(0, 10),
        tipo: c.tipo,
        unidade: c.unidade || "un",
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.descricao.localeCompare(b.descricao, "pt-BR"));
}

export function suggestMaterials(history: MaterialHistorico[], term: string): MaterialHistorico[] {
  const t = term.trim().toLowerCase();
  if (t.length < 2) return [];
  return history.filter((h) => h.descricao.toLowerCase().includes(t)).slice(0, 8);
}

/* ============================ Persistência ============================ */
// FONTE OFICIAL: aba "ORDENS_PRODUCAO" da planilha (mesmo Apps Script).
// O localStorage é apenas um ESPELHO de leitura para modo offline — ele nunca
// sobrepõe o que veio da planilha. Assim, dois dispositivos com o mesmo login
// enxergam exatamente a mesma OP.

function readLocal(): OrdemProducao[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as OrdemProducao[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(list: OrdemProducao[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    /* cota cheia — o dado oficial já está na planilha */
  }
}

/** Estado da última sincronização com a planilha. */
export type SyncState = {
  online: boolean;
  /** o Apps Script respondeu, mas não conhece as ações opList/opUpsert */
  suportado: boolean;
  em?: string;
  erro?: string;
};

let lastSync: SyncState = { online: false, suportado: true };
export const getSyncState = (): SyncState => lastSync;

async function postPlain(body: Record<string, unknown>): Promise<void> {
  const json = await sheetPost(body);
  if (json && (json.error || json.ok === false)) {
    throw new Error(String(json.error || "ação não reconhecida pela planilha"));
  }
}

function normalize(raw: any): OrdemProducao | null {
  if (!raw) return null;
  try {
    const data = typeof raw.dataJson === "string" ? JSON.parse(raw.dataJson) : raw.dataJson ?? raw;
    if (!data || !data.contratoId) return null;
    return {
      id: String(data.id ?? raw.id ?? crypto.randomUUID()),
      contratoId: String(data.contratoId),
      numero: String(data.numero ?? ""),
      criadoEm: String(data.criadoEm ?? new Date().toISOString()),
      atualizadoEm: String(data.atualizadoEm ?? data.criadoEm ?? new Date().toISOString()),
      status: (OP_STATUS as readonly string[]).includes(data.status) ? data.status : "Aguardando Início",
      compras: (Array.isArray(data.compras) ? data.compras : [])
        .filter(Boolean)
        .map((c: any) => normalizeItemCompra(c)),
      producao: (Array.isArray(data.producao) ? data.producao : []).filter(Boolean).map((p: any) => ({
        id: String(p?.id ?? crypto.randomUUID()),
        descricao: String(p?.descricao ?? ""),
        quantidade: Number(p?.quantidade ?? 1) || 1,
        responsavel: String(p?.responsavel ?? ""),
        prazo: String(p?.prazo ?? ""),
        observacao: String(p?.observacao ?? ""),
        anexos: Array.isArray(p?.anexos) ? p.anexos.filter(Boolean) : [],
        status: (p?.status ?? "Pendente") as StatusProducao,
        origemContratoItemId: p?.origemContratoItemId ? String(p.origemContratoItemId) : undefined,
        removidoDoContrato: p?.removidoDoContrato ? true : undefined,
      })),

      separacao: (Array.isArray(data.separacao) ? data.separacao : []).filter(Boolean).map((s: any) => ({
        id: String(s?.id ?? crypto.randomUUID()),
        descricao: String(s?.descricao ?? ""),
        marcado: Boolean(s?.marcado),
        origem: (s?.origem ?? "manual") as any,
      })),
      conferencia: { ...emptyConferencia(), ...(data.conferencia || {}) },
      historico: Array.isArray(data.historico) ? data.historico : [],
      patrimoniosReservados: Array.isArray(data.patrimoniosReservados) ? data.patrimoniosReservados : [],
      finalizadaEm: data.finalizadaEm ?? "",
      kitProntoConfirmadoEm: data.kitProntoConfirmadoEm || undefined,
      kitProntoConfirmadoPor: data.kitProntoConfirmadoPor || undefined,
      kitProntoOrigem: data.kitProntoOrigem || undefined,
      ativo: String(data.ativo ?? raw.ativo ?? "Sim"),
      itensExcluidos: Array.isArray(data.itensExcluidos)
        ? data.itensExcluidos.map((x: unknown) => String(x)).filter(Boolean)
        : [],
    };
  } catch {
    return null;
  }
}

/**
 * Lê as Ordens de Produção da planilha (fonte oficial).
 * - Planilha respondeu → o retorno é exatamente o que está lá (espelho atualizado).
 * - Planilha indisponível → devolve o espelho local apenas para leitura offline.
 */
export async function fetchOrdens(): Promise<OrdemProducao[]> {
  try {
    const json = await sheetGet("action=opList");
    const rows: any[] = rowsOf(json);
    const remote = rows.map(normalize).filter(Boolean) as OrdemProducao[];

    // Se vieram linhas mas nenhuma é uma OP, o Apps Script ignorou "opList"
    // e devolveu outra aba — ou seja: a aba ORDENS_PRODUCAO ainda não existe.
    const suportado = rows.length === 0 || remote.length > 0;
    if (!suportado) {
      lastSync = {
        online: false,
        suportado: false,
        erro: "A planilha ainda não possui a aba ORDENS_PRODUCAO (ações opList/opUpsert).",
      };
      return readLocal().sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
    }

    const oficial = remote.filter((o) => (o.ativo || "Sim").toLowerCase() === "sim");
    writeLocal(oficial);
    lastSync = { online: true, suportado: true, em: new Date().toISOString() };
    return oficial.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
  } catch (e) {
    lastSync = {
      online: false,
      suportado: true,
      erro: e instanceof Error ? e.message : "Falha de conexão com a planilha",
    };
    return readLocal().sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
  }
}

/** Recarrega apenas uma OP a partir da fonte oficial. */
export async function fetchOrdemByContrato(contratoId: string): Promise<OrdemProducao | undefined> {
  const all = await fetchOrdens();
  return all.find((o) => o.contratoId === contratoId);
}


/** Executa a promise com limite de tempo — evita travar a tela se a planilha demorar. */
export async function withTimeout<T>(p: Promise<T>, ms = 10000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

export function getOrdensLocal(): OrdemProducao[] {
  return readLocal();
}

export function getOrdemByContrato(list: OrdemProducao[], contratoId: string): OrdemProducao | undefined {
  return list.find((o) => o.contratoId === contratoId);
}

/* ---------------- Fusão anti-perda (last-write-wins seguro) ----------------
   Várias telas (detalhe da OP, Central de Produção, Dashboard, Registrar
   Compra, autorização) carregam a OP inteira e regravam a OP inteira. Se uma
   delas estiver com uma versão antiga em memória, um item cadastrado depois em
   outra tela seria apagado na regravação. A fusão abaixo elimina esse risco:
   itens que existem na versão oficial e não estão no que a tela enviou são
   PRESERVADOS — exceto quando houve exclusão explícita (itensExcluidos). */

/** Posição do item de compra no fluxo (quanto maior, mais avançado). */
function rankCompra(c: ItemCompra): number {
  const i = COMPRA_STATUS.indexOf(compraStatusOf(c));
  return i < 0 ? 0 : i;
}

const RANK_PRODUCAO: Record<StatusProducao, number> = {
  Pendente: 0,
  "Em Produção": 1,
  Concluído: 2,
  Cancelado: 2,
};

/**
 * Fusão item-a-item de COMPRA: o estado mais AVANÇADO sempre vence.
 * Uma tela desatualizada nunca rebaixa "Compra realizada"/"Pago" de volta para
 * "Compra autorizada", e nunca perde fornecedor, valor real ou vínculo
 * financeiro já persistidos.
 */
function mergeCompraItem(remoto: ItemCompra, enviado: ItemCompra): ItemCompra {
  // Se já existe um vínculo financeiro real ou lançamento, a solicitação no remoto é soberana
  const solId = enviado.solicitacaoId || remoto.solicitacaoId;

  const base: ItemCompra = {
    ...enviado,
    solicitacaoId: solId,
    integrado: enviado.integrado || remoto.integrado,
    cancelado: enviado.cancelado || remoto.cancelado || undefined,
    fornecedor: String(enviado.fornecedor ?? "").trim() || remoto.fornecedor || "",
    valorReal: (enviado.valorReal || 0) || (remoto.valorReal || 0),
    valorOrcado: (enviado.valorOrcado || 0) || (remoto.valorOrcado || 0),
    dataCompra: enviado.dataCompra || remoto.dataCompra || "",
  };
  // O remoto está mais adiante no fluxo: preserva a etapa persistida.
  if (rankCompra(remoto) > rankCompra(enviado)) {
    const statusRemoto = compraStatusOf(remoto);
    return applyCompraStatus(
      { ...base, dataCompra: remoto.dataCompra || base.dataCompra },
      statusRemoto as any
    );
  }
  return base;
}

/** Fusão item-a-item de PRODUÇÃO: "Produzido" nunca volta para "Pendente". */
function mergeProducaoItem(remoto: ItemProducao, enviado: ItemProducao): ItemProducao {
  const base: ItemProducao = {
    ...enviado,
    anexos: (enviado.anexos || []).length ? enviado.anexos : remoto.anexos || [],
  };
  const rr = RANK_PRODUCAO[remoto.status] ?? 0;
  const re = RANK_PRODUCAO[enviado.status] ?? 0;
  return rr > re ? { ...base, status: remoto.status } : base;
}

function mergeItensPorId<T extends { id: string }>(
  remotos: T[],
  enviados: T[],
  tumulos: Set<string>,
  fundir: (remoto: T, enviado: T) => T,
): T[] {
  const enviadosById = new Map(enviados.map((i) => [i.id, i] as const));
  const out: T[] = [];
  const usados = new Set<string>();
  for (const r of remotos) {
    if (tumulos.has(r.id)) continue; // exclusão explícita: respeita
    const local = enviadosById.get(r.id);
    out.push(local ? fundir(r, local) : r); // item novo do servidor NUNCA é perdido
    usados.add(r.id);
  }
  // Itens que só existem na tela: entram, exceto se foram excluídos (lápide).
  for (const e of enviados) if (!usados.has(e.id) && !tumulos.has(e.id)) out.push(e);
  return out;
}

function mergeHistorico(remoto: LogEntry[], enviado: LogEntry[]): LogEntry[] {
  const map = new Map<string, LogEntry>();
  for (const h of [...(remoto || []), ...(enviado || [])]) if (h?.id) map.set(h.id, h);
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime(),
  );
}

/** Une a versão oficial (planilha) com a versão enviada pela tela. */
export function mergeOrdens(remota: OrdemProducao, enviada: OrdemProducao): OrdemProducao {
  const tumulos = new Set(
    [...(enviada.itensExcluidos || []), ...(remota.itensExcluidos || [])].filter(Boolean),
  );
  return {
    ...enviada,
    compras: mergeItensPorId(remota.compras || [], enviada.compras || [], tumulos, (r, e) => mergeCompraItem(r, e)),
    producao: mergeItensPorId(
      remota.producao || [],
      enviada.producao || [],
      tumulos,
      mergeProducaoItem,
    ),
    historico: mergeHistorico(remota.historico || [], enviada.historico || []),
    // Confirmação de Kit Pronto persistida não é apagada por tela antiga.
    kitProntoConfirmadoEm: enviada.kitProntoConfirmadoEm || remota.kitProntoConfirmadoEm,
    kitProntoConfirmadoPor: enviada.kitProntoConfirmadoPor || remota.kitProntoConfirmadoPor,
    kitProntoOrigem: enviada.kitProntoOrigem || remota.kitProntoOrigem,
    itensExcluidos: Array.from(tumulos),
  };
}


/** Lê a versão oficial de UMA OP direto da planilha (sem cache). */
async function fetchOrdemRemota(id: string): Promise<OrdemProducao | null> {
  try {
    const json = await withTimeout(sheetGet("action=opList"), 12000);
    const rows: any[] = rowsOf(json);
    const remote = rows.map(normalize).filter(Boolean) as OrdemProducao[];
    return remote.find((o) => o.id === id) ?? null;
  } catch {
    return null;
  }
}

/**
 * Salva a OP na fonte oficial (planilha) e, só depois, atualiza o espelho local.
 * Antes de gravar, faz a FUSÃO com a versão oficial: nenhum item de compra ou
 * produção é perdido por uma tela desatualizada.
 * Se a planilha falhar, lança erro — a tela avisa que a alteração NÃO foi
 * sincronizada, em vez de fingir que salvou apenas no aparelho.
 */
export async function saveOrdem(op: OrdemProducao): Promise<OrdemProducao> {
  const remota = await fetchOrdemRemota(op.id);
  const fundida = remota ? mergeOrdens(remota, op) : op;
  // Regra central: um pedido nunca fica "pronto" contendo pendências.
  const base = reabrirKitSePendente({ ...fundida, atualizadoEm: new Date().toISOString() });
  const updated: OrdemProducao = base;
  updated.status = updated.status === "Finalizado" ? "Finalizado" : deriveStatus(updated);

  const mirror = () => {
    const list = readLocal();
    const idx = list.findIndex((o) => o.id === updated.id);
    if (idx === -1) list.unshift(updated);
    else list[idx] = updated;
    writeLocal(list);
  };

  try {
    await postPlain({
      action: "opUpsert",
      id: updated.id,
      contratoId: updated.contratoId,
      numero: updated.numero,
      status: updated.status,
      atualizadoEm: updated.atualizadoEm,
      progresso: progressPercent(updated),
      ativo: updated.ativo || "Sim",
      dataJson: JSON.stringify(updated),
    });
    lastSync = { online: true, suportado: true, em: new Date().toISOString() };
    mirror();
    return updated;
  } catch (e) {
    // Guarda o rascunho local para não perder o trabalho, mas avisa a tela.
    mirror();
    lastSync = {
      online: false,
      suportado: lastSync.suportado,
      erro: e instanceof Error ? e.message : "Falha ao salvar na planilha",
    };
    throw e;
  }
}


/** Cria a OP de um contrato. Nunca duplica: se já existir, retorna a existente. */
export async function criarOrdem(order: StoredOrder, existentes: OrdemProducao[]): Promise<OrdemProducao> {
  const existing = getOrdemByContrato(existentes, order.id);
  if (existing) return existing;
  const numero = `OP-${String(existentes.length + 1).padStart(4, "0")}`;
  let op: OrdemProducao = {
    id: crypto.randomUUID(),
    contratoId: order.id,
    numero,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    status: "Aguardando Início",
    compras: [],
    producao: [],
    separacao: separacaoFromKit(order),
    conferencia: emptyConferencia(),
    historico: [],
    patrimoniosReservados: patrimoniosDoKit(order),
    ativo: "Sim",
  };
  op = logAction(op, `Ordem de Produção ${numero} criada para o contrato de ${order.nome}`);
  op = logAction(op, `Patrimônios do kit reservados (${op.patrimoniosReservados.length} itens)`);
  return saveOrdem(op);
}

/** Inativa uma OP e remove seus itens das filas operacionais. */
export async function inativarOP(opId: string, motivo = "Contrato Excluído"): Promise<void> {
  const op = await fetchOrdemRemota(opId);
  if (!op) return;
  const updated = logAction({
    ...op,
    ativo: "Não",
    status: "Finalizado",
    atualizadoEm: new Date().toISOString(),
  }, `OP Inativada: ${motivo}`);

  await postPlain({
    action: "opUpsert",
    id: updated.id,
    contratoId: updated.contratoId,
    numero: updated.numero,
    status: updated.status,
    atualizadoEm: updated.atualizadoEm,
    progresso: progressPercent(updated),
    ativo: updated.ativo,
    dataJson: JSON.stringify(updated),
  });
  
  // Atualiza cache local
  const list = readLocal();
  const idx = list.findIndex((o) => o.id === updated.id);
  if (idx !== -1) {
    list[idx] = updated;
    writeLocal(list);
  }
}


/** Conflito de reserva: mesmo patrimônio em outra OP aberta com retirada no mesmo dia. */
export function conflitosPatrimonio(
  op: OrdemProducao,
  todas: OrdemProducao[],
  orders: StoredOrder[],
): Array<{ item: string; contrato: string }> {
  const orderOf = (id: string) => orders.find((o) => o.id === id);
  const mine = orderOf(op.contratoId);
  const retirada = toDateISO(mine?.details?.dataRetirada);
  if (!retirada) return [];
  const out: Array<{ item: string; contrato: string }> = [];
  for (const other of todas) {
    if (other.id === op.id) continue;
    if (other.status === "Finalizado") continue;
    const o = orderOf(other.contratoId);
    const ret = toDateISO(o?.details?.dataRetirada);
    if (!ret || ret !== retirada) continue;
    for (const item of op.patrimoniosReservados) {
      if (other.patrimoniosReservados.includes(item)) {
        out.push({ item, contrato: o?.nome || other.numero });
      }
    }
  }
  return out;
}

/* ============ Lista Geral de Compras (tempo real, sem geração) ============
   A Central de Produção É a lista de compras: nada é "gerado", tudo é
   derivado das Ordens de Produção no momento da leitura. */

export type CompraGlobal = {
  key: string;
  op: OrdemProducao;
  item: ItemCompra;
  order?: StoredOrder;
  cliente: string;
  pedidoId: string;
  retirada: string;
  urgencia: Urgencia;
  status: CompraStatus;
  valorPrevisto: number;
  valorReal: number;
  responsavel: string;
};

export function comprasGlobais(ops: OrdemProducao[], orders: StoredOrder[]): CompraGlobal[] {
  const orderOf = (id: string) => orders.find((o) => o.id === id);
  const out: CompraGlobal[] = [];
  for (const op of ops) {
    if (op.status === "Finalizado") continue;
    const order = orderOf(op.contratoId);
    const retirada = toDateISO(order?.details?.dataRetirada) || toDateISO(order?.details?.dataEvento) || "";
    for (const item of op.compras || []) {
      if (item.cancelado) continue; // histórico: não entra nas filas operacionais
      out.push({
        key: `${op.id}:${item.id}`,
        op,
        item,
        order,
        cliente: order?.nome || "—",
        pedidoId: op.contratoId,
        retirada,
        urgencia: urgenciaFrom(retirada),
        status: compraStatusOf(item),
        valorPrevisto: valorPrevistoCompra(item),
        valorReal: valorRealCompra(item),
        responsavel: item.responsavel || currentUser(),
      });
    }
  }
  return out.sort((a, b) => {
    const ua = URGENCIA_PESO[a.urgencia]; const ub = URGENCIA_PESO[b.urgencia];
    if (ua !== ub) return ua - ub;
    return (a.retirada || "9999").localeCompare(b.retirada || "9999");
  });
}

const URGENCIA_PESO: Record<Urgencia, number> = { "Muito Urgente": 0, Urgente: 1, Normal: 2 };

/** Filtros rápidos da Central de Produção (uma única fonte de verdade). */
export const FILTROS_COMPRA = [
  { key: "todos", label: "Todos" },
  { key: "pendentes", label: "Compras pendentes" },
  { key: "sem-orcamento", label: "Aguardando orçamento" },
  { key: "orcamento-recebido", label: "Orçamento recebido" },
  { key: "aguardando-aprovacao", label: "Aguardando autorização" },
  { key: "autorizada", label: "Liberados para compra" },
  { key: "realizada", label: "Compra realizada" },
  { key: "aguardando-pagamento", label: "Aguardando pagamento" },
  { key: "pago", label: "Pago" },
  { key: "urgentes", label: "Urgentes" },
] as const;
export type FiltroCompraKey = (typeof FILTROS_COMPRA)[number]["key"];

export function aplicaFiltroCompra(l: CompraGlobal, filtro: FiltroCompraKey): boolean {
  switch (filtro) {
    // Fila ativa: item comprado sai da lista de pendentes (histórico preservado).
    case "pendentes": return compraAtiva(l.item);
    case "sem-orcamento": return l.status === "Aguardando orçamento";
    case "orcamento-recebido": return l.status === "Orçamento recebido";
    case "aguardando-aprovacao": return l.status === "Aguardando autorização";
    case "autorizada": return l.status === "Compra autorizada";
    case "realizada": return l.status === "Compra realizada";
    case "aguardando-pagamento": return l.status === "Compra realizada";
    case "pago": return l.status === "Pago";
    case "urgentes": return l.urgencia === "Muito Urgente";
    default: return true;
  }
}



/* ============================ Ordenação por prioridade ============================ */

export function prioridadeOrdem(op: OrdemProducao, order?: StoredOrder): number {
  const ret = toDateISO(order?.details?.dataRetirada);
  const dias = diasAte(ret);
  const pend = pendenciasDaOP(op);
  const temPendencia = pend.compras.length + pend.producao.length > 0 || !conferenciaCompleta(op);
  if (isAtrasada(op, order)) return 0;
  if (dias != null && dias <= 15 && temPendencia) return 1;
  if (dias != null && dias <= 15) return 2;
  return 3;
}

/* ============ Itens a Comprar do Contrato → Ordem de Produção ============
   A necessidade de compra nasce no Contrato. Ao salvar, os itens planejados
   descem automaticamente para a OP correspondente (criada se ainda não
   existir) já com o status "Aguardando orçamento". Nada financeiro é exigido
   nesta etapa e nada é duplicado: o vínculo é feito por origemContratoItemId. */

export type SincronizacaoContrato = {
  criados: number;
  atualizados: number;
  removidos: number;
  preservados: number;
  /** Itens a Produzir criados na aba Produção da OP. */
  producaoCriados: number;
  producaoRemovidos: number;
  /**
   * Itens de compra que o usuário mandou direto para aprovação no Contrato.
   * Quem chamou avança a etapa pelo fluxo único (nasce a Solicitação).
   */
  enviarAprovacao: string[];
  op?: OrdemProducao;
};

export async function sincronizarItensContrato(
  order: StoredOrder,
): Promise<SincronizacaoContrato | null> {
  const planejados = parseItensComprar(order.details?.itensComprar);
  const produzir = parseItensProduzir(order.details?.itensProduzir);
  const todas = await fetchOrdens();
  let op = getOrdemByContrato(todas, order.id);

  // Nada planejado e nenhuma OP: não cria OP só por causa disso.
  if (!planejados.length && !produzir.length && !op) return null;
  if (!op) op = await criarOrdem(order, todas);

  const compras = (op.compras || []).map((c) => normalizeItemCompra(c));

  /** Item já saiu do planejamento (tem orçamento/financeiro/compra/cancelamento)? */
  const avancou = compraTemHistorico;

  // LÁPIDES: itens excluídos explicitamente (na OP ou pelo vínculo do Contrato)
  // NUNCA podem ser recriados por esta sincronização.
  const tumulos = new Set((op.itensExcluidos || []).filter(Boolean));

  const byOrigem = new Map<string, number>();
  compras.forEach((c, i) => {
    if (c.origemContratoItemId) byOrigem.set(c.origemContratoItemId, i);
  });

  let criados = 0;
  let atualizados = 0;
  let removidos = 0;
  let preservados = 0;
  const enviarAprovacao: string[] = [];

  const vistos = new Set<string>();

  for (const p of planejados) {
    if (tumulos.has(p.id)) continue; // item excluído: não ressuscita
    vistos.add(p.id);
    let idx = byOrigem.get(p.id);


    // Adoção de item legado criado antes do vínculo (mesmo nome, sem origem).
    if (idx == null) {
      const legado = compras.findIndex(
        (c) =>
          !c.origemContratoItemId &&
          c.descricao.trim().toLowerCase() === p.nome.trim().toLowerCase(),
      );
      if (legado >= 0) {
        compras[legado] = { ...compras[legado], origemContratoItemId: p.id };
        byOrigem.set(p.id, legado);
        idx = legado;
        atualizados++;
      }
    }

    if (idx == null) {
      const novo = normalizeItemCompra({
        id: crypto.randomUUID(),
        descricao: p.nome,
        quantidade: p.quantidade,
        unidade: "un",
        observacao: p.observacao || "",
        fornecedor: p.fornecedor || "",
        valorOrcado: p.valorOrcado || 0,
        statusCompra: "Aguardando orçamento",
        origemContratoItemId: p.id,
        removidoDoContrato: false,
      });
      compras.push(novo);
      byOrigem.set(p.id, compras.length - 1);
      criados++;
      if (p.destino === "aprovacao" && (p.valorOrcado || 0) > 0) {
        enviarAprovacao.push(novo.id);
      }
      continue;
    }

    const atual = compras[idx];
    if (avancou(atual)) {
      // Preserva tudo (financeiro, fornecedor, histórico). Só reativa o vínculo.
      if (atual.removidoDoContrato) {
        compras[idx] = { ...atual, removidoDoContrato: false };
        atualizados++;
      } else {
        preservados++;
      }
      continue;
    }

    const novoValor = p.valorOrcado || atual.valorOrcado || 0;
    const novoFornecedor = p.fornecedor || atual.fornecedor || "";
    const mudou =
      atual.descricao !== p.nome ||
      atual.quantidade !== p.quantidade ||
      atual.observacao !== (p.observacao || "") ||
      atual.valorOrcado !== novoValor ||
      atual.fornecedor !== novoFornecedor ||
      !!atual.removidoDoContrato;
    if (mudou) {
      compras[idx] = {
        ...atual,
        descricao: p.nome,
        quantidade: p.quantidade,
        observacao: p.observacao || "",
        valorOrcado: novoValor,
        fornecedor: novoFornecedor,
        removidoDoContrato: false,
      };
      atualizados++;
    }
    if (p.destino === "aprovacao" && novoValor > 0) {
      enviarAprovacao.push(compras[idx].id);
    }
  }

  // Itens retirados do Contrato.
  const finais: ItemCompra[] = [];
  for (const c of compras) {
    const origem = c.origemContratoItemId;
    if (!origem || vistos.has(origem)) {
      finais.push(c);
      continue;
    }
    // NUNCA apaga item da OP por sincronização de planejamento: o registro
    // continua existindo (histórico) e apenas sai da lista do Contrato.
    if (!c.removidoDoContrato) {
      finais.push({ ...c, removidoDoContrato: true });
      if (avancou(c)) preservados++;
      else removidos++;
    } else {
      finais.push(c);
    }
  }

  /* ---------- Itens a Produzir → aba Produção (mesmas regras) ---------- */

  const producaoAtual = [...(op.producao || [])];
  const prodByOrigem = new Map<string, number>();
  producaoAtual.forEach((p, i) => {
    if (p.origemContratoItemId) prodByOrigem.set(p.origemContratoItemId, i);
  });

  let producaoCriados = 0;
  let producaoRemovidos = 0;
  const prodVistos = new Set<string>();

  for (const p of produzir) {
    if (tumulos.has(p.id)) continue; // item excluído: não ressuscita
    prodVistos.add(p.id);
    let idx = prodByOrigem.get(p.id);

    if (idx == null) {
      const legado = producaoAtual.findIndex(
        (x) =>
          !x.origemContratoItemId &&
          x.descricao.trim().toLowerCase() === p.nome.trim().toLowerCase(),
      );
      if (legado >= 0) {
        producaoAtual[legado] = { ...producaoAtual[legado], origemContratoItemId: p.id };
        prodByOrigem.set(p.id, legado);
        idx = legado;
        atualizados++;
      }
    }
    if (idx == null) {
      producaoAtual.push({
        id: crypto.randomUUID(),
        descricao: p.nome,
        quantidade: p.quantidade,
        responsavel: "",
        prazo: "",
        observacao: p.observacao || "",
        anexos: [],
        status: "Pendente",
        origemContratoItemId: p.id,
        removidoDoContrato: false,
      });
      producaoCriados++;
      continue;
    }
    const atual = producaoAtual[idx];
    // Só atualiza enquanto a produção não começou — nunca perde trabalho feito.
    if (atual.status !== "Pendente") continue;
    const mudou =
      atual.descricao !== p.nome ||
      (atual.quantidade || 1) !== p.quantidade ||
      atual.observacao !== (p.observacao || "") ||
      !!atual.removidoDoContrato;
    if (mudou) {
      producaoAtual[idx] = {
        ...atual,
        descricao: p.nome,
        quantidade: p.quantidade,
        observacao: p.observacao || "",
        removidoDoContrato: false,
      };
      atualizados++;
    }
  }

  const producaoFinal: ItemProducao[] = [];
  for (const p of producaoAtual) {
    const origem = p.origemContratoItemId;
    if (!origem || prodVistos.has(origem)) {
      producaoFinal.push(p);
      continue;
    }
    // Também na produção: nada é apagado por sincronização.
    if (!p.removidoDoContrato) {
      producaoFinal.push({ ...p, removidoDoContrato: true });
      if (producaoTemHistorico(p)) preservados++;
      else producaoRemovidos++;
    } else {
      producaoFinal.push(p);
    }
  }

  const nada =
    !criados && !atualizados && !removidos && !producaoCriados && !producaoRemovidos;
  if (nada) {
    return {
      criados: 0,
      atualizados: 0,
      removidos: 0,
      preservados,
      producaoCriados: 0,
      producaoRemovidos: 0,
      enviarAprovacao,
      op,
    };
  }

  let atualizada: OrdemProducao = { ...op, compras: finais, producao: producaoFinal };
  const partes: string[] = [];
  if (criados) partes.push(`${criados} compra(s) incluída(s)`);
  if (atualizados) partes.push(`${atualizados} atualizado(s)`);
  if (removidos) partes.push(`${removidos} compra(s) removida(s)`);
  if (producaoCriados) partes.push(`${producaoCriados} produção(ões) incluída(s)`);
  if (producaoRemovidos) partes.push(`${producaoRemovidos} produção(ões) removida(s)`);
  atualizada = logAction(
    atualizada,
    `Planejamento do Contrato sincronizado — ${partes.join(", ")}`,
  );
  const salva = await saveOrdem(atualizada);
  return {
    criados,
    atualizados,
    removidos,
    preservados,
    producaoCriados,
    producaoRemovidos,
    enviarAprovacao,
    op: salva,
  };
}

/**
 * Ação humana explícita sobre um item de produção (ex.: "Marcar produzido").
 * Lê a versão oficial mais recente, aplica SOMENTE esse item e persiste.
 * O merge de saveOrdem garante que nada mais seja sobrescrito.
 */
export async function updateItemProducaoStatus(
  opId: string,
  itemId: string,
  status: StatusProducao,
): Promise<OrdemProducao> {
  // 1) versão oficial da OP (sem depender do espelho local)
  let op = await fetchOrdemRemota(opId);
  // 2) fallbacks: lista sincronizada e espelho local
  if (!op) op = (await fetchOrdens()).find((x) => x.id === opId) ?? null;
  if (!op) op = getOrdensLocal().find((x) => x.id === opId) ?? null;
  if (!op) throw new Error("Ordem de Produção não encontrada para este item.");

  const item = (op.producao || []).find((p) => p.id === itemId);
  if (!item) throw new Error("Item de produção não encontrado nesta Ordem de Produção.");
  if (item.status === status) return op;

  const producao = (op.producao || []).map((p) => (p.id === itemId ? { ...p, status } : p));
  const marcado: OrdemProducao = logAction(
    { ...op, producao },
    `Produção "${item.descricao || "(item)"}" → ${PRODUCAO_STATUS_LABEL[status]}`,
  );
  return saveOrdem(marcado);
}



