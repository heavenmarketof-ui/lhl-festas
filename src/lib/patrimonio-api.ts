// Persistência do módulo Patrimônio em uma nova aba "Patrimônio" do Google Sheets.
// Usa o mesmo endpoint do Apps Script já configurado para contratos, com actions dedicadas.
// O Apps Script deve tratar as actions: patrimonioList, patrimonioCreate, patrimonioUpdate, patrimonioDelete.

import { sheetGet, sheetPost, rowsOf } from "./sheets-gateway";
import { cachedRead, invalidate, type CachedReadOptions } from "./gas-cache";

/** Chave de cache da aba Patrimônio. */
export const PATRIMONIO_CACHE_KEY = "patrimonioList";

export type PatrimonioStatus = "Ativo" | "Em Manutenção" | "Inativo";

export const PATRIMONIO_CATEGORIAS = [
  "Painéis",
  "Painéis Personalizados",
  "Arcos",
  "Arcos Romanos",
  "Arcos Redondos",
  "Mini Arcos",
  "Cilindros",
  "Estruturas",
  "Mesas",
  "Capas",
  "Tapetes",
  "Bandejas",
  "Boleiras",
  "Displays",
  "Bolos Fake",
  "Vasos",
  "Buchinhos",
  "Flores",
  "Número em LED",
  "Iluminação",
  "Bubble Personalizado",
  "Decoração",
  "Equipamentos",
  "Organização",
  "Outros",
] as const;

export type PatrimonioItem = {
  id: string;
  nome: string;
  categoria: string;
  quantidade: number;
  valorAquisicao?: string;
  dataCompra?: string;
  observacoes?: string;
  status: PatrimonioStatus;
  fotoUrl?: string;
  createdAt: string;
  updatedAt?: string;
  ativo?: string; // "Sim" | "Não" — exclusão lógica
};

async function postPlain(body: Record<string, unknown>): Promise<void> {
  await sheetPost(body);
}

export async function fetchPatrimonioFromSheet(
  opts?: { includeDeleted?: boolean } & CachedReadOptions,
): Promise<PatrimonioItem[]> {
  const items = await cachedRead(PATRIMONIO_CACHE_KEY, async () => {
  const json = await sheetGet("action=patrimonioList");
  const rows: any[] = rowsOf(json);
  return rows.map((r): PatrimonioItem => ({
    id: String(r.id ?? crypto.randomUUID()),
    nome: String(r.nome ?? ""),
    categoria: String(r.categoria ?? "Outros"),
    quantidade: Number(r.quantidade ?? 0) || 0,
    valorAquisicao: r.valorAquisicao != null ? String(r.valorAquisicao) : "",
    dataCompra: r.dataCompra != null ? String(r.dataCompra) : "",
    observacoes: r.observacoes != null ? String(r.observacoes) : "",
    status: (["Ativo", "Em Manutenção", "Inativo"].includes(String(r.status))
      ? (r.status as PatrimonioStatus)
      : "Ativo"),
    fotoUrl: r.fotoUrl != null ? String(r.fotoUrl) : "",
    createdAt: String(r.createdAt ?? new Date().toISOString()),
    updatedAt: r.updatedAt != null ? String(r.updatedAt) : "",
    ativo: String(r.ativo ?? "Sim"),
  }));
  }, opts);
  if (opts?.includeDeleted) return items;
  return items.filter((i) => (i.ativo || "Sim").toLowerCase() === "sim");
}


export async function createPatrimonioOnSheet(item: PatrimonioItem): Promise<void> {
  await postPlain({ action: "patrimonioCreate", ...item });
  invalidate(PATRIMONIO_CACHE_KEY);
}

export async function updatePatrimonioOnSheet(item: PatrimonioItem): Promise<void> {
  await postPlain({ action: "patrimonioUpdate", ...item });
  invalidate(PATRIMONIO_CACHE_KEY);
}

export async function deletePatrimonioOnSheet(id: string): Promise<void> {
  // Exclusão lógica: marca ativo=Não
  await postPlain({ action: "patrimonioUpdate", id, ativo: "Não" });
  invalidate(PATRIMONIO_CACHE_KEY);
}
