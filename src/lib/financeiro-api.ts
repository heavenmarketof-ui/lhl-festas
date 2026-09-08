// Persistência do módulo Gestão Financeira em novas abas do Google Sheets.
// Usa o mesmo endpoint do Apps Script já configurado.
// Actions esperadas: fluxoList/Create/Update/Delete, contasPagarList/Create/Update/Delete,
//                    categoriasList/Create/Delete.

import { sheetGet, sheetPost, rowsOf } from "./sheets-gateway";
import { cachedRead, invalidate, type CachedReadOptions } from "./gas-cache";

/** Chaves de cache/logs por rota lógica (uma por aba). */
export const FIN_KEYS = {
  fluxo: "fluxoList",
  contas: "contasPagarList",
  categorias: "categoriasList",
  orders: "ordersList",
  patrimonio: "patrimonioList",
} as const;

async function postPlain(body: Record<string, unknown>): Promise<void> {
  await sheetPost(body);
}

async function getAction(action: string): Promise<any[]> {
  return rowsOf(await sheetGet(`action=${action}`));
}


// ---------- Constantes ----------

export const CONTAS_PADRAO = ["Caixa", "PIX", "Nubank PJ", "BTG PJ", "Dinheiro", "Outro"] as const;

export const FORMAS_PAGAMENTO = [
  "PIX", "Dinheiro", "Cartão de Débito", "Cartão de Crédito",
  "Transferência", "Boleto", "Outro",
] as const;

export const CATEGORIAS_RECEITA_PADRAO = [
  "Saldo Inicial", "Sinal", "Pagamento Final", "Caução Recebida",
  "Aporte", "Venda", "Multa", "Reembolso Recebido", "Outros",
] as const;

export const CATEGORIAS_DESPESA_PADRAO = [
  "Patrimônio", "Balões", "Impressão", "Equipamentos", "Marketing",
  "Fornecedor", "Combustível", "Transporte", "Alimentação",
  "Distribuição de Lucros", "Caução Devolvida", "Reembolso", "Outros",
] as const;

// ---------- Tipos ----------

export type LancamentoTipo = "Entrada" | "Saída";

export type Lancamento = {
  id: string;
  data: string;                // yyyy-mm-dd
  tipo: LancamentoTipo;
  categoria: string;
  descricao: string;
  valor: number | string;
  formaPagamento?: string;
  conta: string;
  beneficiario?: string;
  observacoes?: string;
  contratoId?: string;         // vínculo com contrato (evita duplicatas)
  origem?: string;             // "sinal" | "pagamento_final" | "manual" | ...
  createdAt: string;
  ativo?: string;              // "Sim" | "Não"
};

export type ContaPagar = {
  id: string;
  descricao: string;
  categoria: string;
  fornecedor?: string;
  valor: number | string;
  vencimento: string;          // yyyy-mm-dd
  pago: "Sim" | "Não";
  dataPagamento?: string;
  observacoes?: string;
  createdAt: string;
  ativo?: string;
};

export type CategoriaFinanceira = {
  id: string;
  tipo: "Receita" | "Despesa";
  nome: string;
  createdAt: string;
  ativo?: string;
};

// ---------- Fluxo de Caixa ----------

/**
 * Normaliza o campo Tipo. A planilha pode devolver "Saida" (sem acento),
 * "SAÍDA", "Despesa", "-" etc. — sem isso a coluna Tipo exibia o texto errado
 * (tudo virava "Entrada").
 */
export function normalizeTipo(v: unknown): LancamentoTipo {
  const s = String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  if (
    s === "saida" || s === "saidas" || s === "despesa" || s === "despesas" ||
    s === "debito" || s === "pagamento" || s === "-" || s === "s"
  ) {
    return "Saída";
  }
  return "Entrada";
}

function parseLancamento(r: any): Lancamento {
  return {
    id: String(r.id ?? crypto.randomUUID()),
    data: String(r.data ?? "").slice(0, 10),
    tipo: normalizeTipo(r.tipo),
    categoria: String(r.categoria ?? ""),
    descricao: String(r.descricao ?? ""),
    valor: r.valor ?? "",
    formaPagamento: r.formaPagamento != null ? String(r.formaPagamento) : "",
    conta: String(r.conta ?? ""),
    beneficiario: r.beneficiario != null ? String(r.beneficiario) : "",
    observacoes: r.observacoes != null ? String(r.observacoes) : "",
    contratoId: r.contratoId != null ? String(r.contratoId) : "",
    origem: r.origem != null ? String(r.origem) : "",
    createdAt: String(r.createdAt ?? new Date().toISOString()),
    ativo: String(r.ativo ?? "Sim"),
  };
}

export async function fetchLancamentos(
  opts?: { includeDeleted?: boolean } & CachedReadOptions,
): Promise<Lancamento[]> {
  const items = await cachedRead(
    FIN_KEYS.fluxo,
    async () => (await getAction("fluxoList")).map(parseLancamento),
    opts,
  );
  return opts?.includeDeleted ? items : items.filter((i) => (i.ativo || "Sim").toLowerCase() === "sim");
}

export async function createLancamento(l: Lancamento): Promise<void> {
  await postPlain({ action: "fluxoCreate", ...l });
  invalidate(FIN_KEYS.fluxo);
}

export async function updateLancamento(l: Lancamento): Promise<void> {
  await postPlain({ action: "fluxoUpdate", ...l });
  invalidate(FIN_KEYS.fluxo);
}

export async function deleteLancamento(id: string): Promise<void> {
  await postPlain({ action: "fluxoUpdate", id, ativo: "Não" });
  invalidate(FIN_KEYS.fluxo);
}


// ---------- Contas a Pagar ----------

function parseContaPagar(r: any): ContaPagar {
  return {
    id: String(r.id ?? crypto.randomUUID()),
    descricao: String(r.descricao ?? ""),
    categoria: String(r.categoria ?? ""),
    fornecedor: r.fornecedor != null ? String(r.fornecedor) : "",
    valor: r.valor ?? "",
    vencimento: String(r.vencimento ?? "").slice(0, 10),
    pago: r.pago === "Sim" ? "Sim" : "Não",
    dataPagamento: r.dataPagamento != null ? String(r.dataPagamento).slice(0, 10) : "",
    observacoes: r.observacoes != null ? String(r.observacoes) : "",
    createdAt: String(r.createdAt ?? new Date().toISOString()),
    ativo: String(r.ativo ?? "Sim"),
  };
}

export async function fetchContasPagar(
  opts?: { includeDeleted?: boolean } & CachedReadOptions,
): Promise<ContaPagar[]> {
  const items = await cachedRead(
    FIN_KEYS.contas,
    async () => (await getAction("contasPagarList")).map(parseContaPagar),
    opts,
  );
  return opts?.includeDeleted ? items : items.filter((i) => (i.ativo || "Sim").toLowerCase() === "sim");
}

export async function createContaPagar(c: ContaPagar): Promise<void> {
  await postPlain({ action: "contasPagarCreate", ...c });
  invalidate(FIN_KEYS.contas);
}

export async function updateContaPagar(c: ContaPagar): Promise<void> {
  await postPlain({ action: "contasPagarUpdate", ...c });
  invalidate(FIN_KEYS.contas);
}

export async function deleteContaPagar(id: string): Promise<void> {
  await postPlain({ action: "contasPagarUpdate", id, ativo: "Não" });
  invalidate(FIN_KEYS.contas);
}

// ---------- Categorias ----------

function parseCategoria(r: any): CategoriaFinanceira {
  return {
    id: String(r.id ?? crypto.randomUUID()),
    tipo: String(r.tipo ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase() === "despesa" ? "Despesa" : "Receita",
    nome: String(r.nome ?? ""),
    createdAt: String(r.createdAt ?? new Date().toISOString()),
    ativo: String(r.ativo ?? "Sim"),
  };
}

export async function fetchCategorias(opts?: CachedReadOptions): Promise<CategoriaFinanceira[]> {
  const items = await cachedRead(
    FIN_KEYS.categorias,
    async () => (await getAction("categoriasList")).map(parseCategoria),
    opts,
  );
  return items.filter((i) => (i.ativo || "Sim").toLowerCase() === "sim");
}

export async function createCategoria(c: CategoriaFinanceira): Promise<void> {
  await postPlain({ action: "categoriasCreate", ...c });
  invalidate(FIN_KEYS.categorias);
}

export async function deleteCategoria(id: string): Promise<void> {
  await postPlain({ action: "categoriasUpdate", id, ativo: "Não" });
  invalidate(FIN_KEYS.categorias);
}


// ---------- Utilitários ----------

export function parseValor(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function fmtBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function toCSV(rows: Record<string, unknown>[], columns: { key: string; label: string }[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const head = columns.map((c) => esc(c.label)).join(";");
  const body = rows.map((r) => columns.map((c) => esc(r[c.key])).join(";")).join("\n");
  return `${head}\n${body}`;
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
