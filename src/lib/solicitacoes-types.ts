// ============================================================================
// Central de Solicitações Financeiras — tipos, rótulos e regras compartilhadas.
// Arquivo client-safe (sem segredos, sem acesso ao banco).
// ============================================================================

export const SOLICITACAO_STATUS = [
  "pendente",
  "autorizada",
  "comprada",
  "lancada",
  "recusada",
  "cancelada",
] as const;
export type SolicitacaoStatus = (typeof SOLICITACAO_STATUS)[number];

export const STATUS_LABEL: Record<SolicitacaoStatus, string> = {
  pendente: "Pendente de autorização",
  autorizada: "Compra autorizada",
  comprada: "Compra realizada (sem financeiro)",
  lancada: "Pago e lançado no Fluxo de Caixa",
  recusada: "Recusada",
  cancelada: "Cancelada",
};


export const STATUS_EMOJI: Record<SolicitacaoStatus, string> = {
  pendente: "🟡",
  autorizada: "🟢",
  comprada: "🟣",
  lancada: "🔵",
  recusada: "🔴",
  cancelada: "⚫",
};

/** Badge curto usado na Central de Operações e nas listas. */
export const STATUS_BADGE_LABEL: Record<SolicitacaoStatus, string> = {
  pendente: "Pendente",
  autorizada: "Autorizada",
  comprada: "Comprada",
  lancada: "Pago",
  recusada: "Recusada",
  cancelada: "Cancelada",
};


export const STATUS_CLASS: Record<SolicitacaoStatus, string> = {
  pendente: "bg-yellow-500/15 text-yellow-600 border-yellow-500/40",
  autorizada: "bg-emerald-500/15 text-emerald-600 border-emerald-500/40",
  comprada: "bg-purple-500/15 text-purple-600 border-purple-500/40",
  lancada: "bg-blue-500/15 text-blue-600 border-blue-500/40",
  recusada: "bg-red-500/15 text-red-600 border-red-500/40",
  cancelada: "bg-muted text-muted-foreground border-border",
};

// ---------------------------------------------------------------------------

export const SOLICITACAO_TIPOS = [
  "compra_materiais",
  "compra_patrimonio",
  "pagamento_fornecedor",
  "despesa_operacional",
  "reembolso",
  "investimento",
  "outros",
] as const;
export type SolicitacaoTipo = (typeof SOLICITACAO_TIPOS)[number];

export const TIPO_LABEL: Record<SolicitacaoTipo, string> = {
  compra_materiais: "Compra de materiais",
  compra_patrimonio: "Compra de patrimônio",
  pagamento_fornecedor: "Pagamento de fornecedor",
  despesa_operacional: "Despesa operacional",
  reembolso: "Reembolso",
  investimento: "Investimento",
  outros: "Outros",
};

/** Nesta sprint apenas "Compra de materiais" está ativa. */
export const TIPOS_ATIVOS: SolicitacaoTipo[] = ["compra_materiais"];

// ---------------------------------------------------------------------------

export const SOLICITACAO_ORIGENS = [
  "central_operacoes",
  "ordem_producao",
  "compra_manual",
  "patrimonio",
  "estoque",
] as const;
export type SolicitacaoOrigem = (typeof SOLICITACAO_ORIGENS)[number];

export const ORIGEM_LABEL: Record<SolicitacaoOrigem, string> = {
  central_operacoes: "Central de Operações",
  ordem_producao: "Ordem de Produção",
  compra_manual: "Compra Manual",
  patrimonio: "Patrimônio",
  estoque: "Estoque",
};

/** Origens já em uso (Estoque fica reservada para o futuro). */
export const ORIGENS_ATIVAS: SolicitacaoOrigem[] = [
  "central_operacoes",
  "ordem_producao",
  "compra_manual",
  "patrimonio",
];

// ---------------------------------------------------------------------------

export type SolicitacaoItem = {
  descricao: string;
  quantidade?: number;
  unidade?: string;
  valor?: number;
};

export type Solicitacao = {
  id: string;
  tipo: SolicitacaoTipo;
  origem: SolicitacaoOrigem;
  status: SolicitacaoStatus;

  pedidoId: string;
  pedidoCliente: string;
  ordemProducao: string;
  origemItemId: string;
  itens: SolicitacaoItem[];

  fornecedor: string;
  categoria: string;
  conta: string;
  formaPagamento: string;
  valor: number;
  descricao: string;
  observacoes: string;
  dataPrevista: string;

  criadoPorEmail: string;
  editadoPorEmail: string;
  editadoEm: string;
  autorizadoPorEmail: string;
  autorizadoEm: string;
  recusadoPorEmail: string;
  recusadoEm: string;
  recusaMotivo: string;
  canceladoPorEmail: string;
  canceladoEm: string;

  lancamentoId: string;
  lancadoEm: string;

  createdAt: string;
  updatedAt: string;
};

export type SolicitacaoEvento = {
  id: string;
  acao: string;
  detalhe: string;
  atorEmail: string;
  createdAt: string;
};

/** Responsável exibido na fila (quem autorizou/recusou/cancelou ou quem criou). */
export function responsavelDe(s: Solicitacao): string {
  return (
    s.autorizadoPorEmail ||
    s.recusadoPorEmail ||
    s.canceladoPorEmail ||
    s.criadoPorEmail ||
    "—"
  );
}

export function podeEditar(s: Solicitacao): boolean {
  return s.status === "pendente";
}
/** Autorizar libera a compra — não cria lançamento financeiro. */
export function podeAutorizar(s: Solicitacao): boolean {
  return s.status === "pendente";
}
/** O pagamento (lançamento no Fluxo de Caixa) só existe após a autorização. */
export function podeRegistrarPagamento(s: Solicitacao): boolean {
  return s.status === "autorizada" || s.status === "comprada";
}
export function podeRecusar(s: Solicitacao): boolean {
  return s.status === "pendente";
}
export function podeCancelar(s: Solicitacao): boolean {
  return s.status === "pendente";
}


/** Marca gravada no campo `origem` do lançamento — permite o link de volta. */
export function origemLancamento(solicitacaoId: string): string {
  return `solicitacao-${solicitacaoId}`;
}

/** Extrai o id da solicitação a partir do campo `origem` de um lançamento. */
export function solicitacaoIdDeLancamento(origem?: string | null): string | null {
  const m = /^solicitacao-([0-9a-f-]{36})$/i.exec(String(origem ?? "").trim());
  return m ? m[1] : null;
}

export function fmtDataHoraBR(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function fmtDataBR(iso?: string | null): string {
  if (!iso) return "—";
  const s = String(iso).slice(0, 10);
  const [y, m, d] = s.split("-");
  return y && m && d ? `${d}/${m}/${y}` : "—";
}
