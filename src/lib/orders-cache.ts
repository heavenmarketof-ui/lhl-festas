import type { StoredOrder } from "./orders-storage";
import { fetchOrderByIdPublic } from "./sheets-api";

const KEY = "lhl_sheet_orders_cache";

export function setCachedSheetOrders(orders: StoredOrder[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(orders));
  } catch {
    /* ignore */
  }
}

export function getCachedSheetOrders(): StoredOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredOrder[]) : [];
  } catch {
    return [];
  }
}

/** Busca um pedido por id: tenta cache de sessão; se não achar, refaz fetch. */
export async function getOrderFromSheet(
  id: string,
  opts?: { includeDeleted?: boolean },
): Promise<StoredOrder | undefined> {
  const cached = getCachedSheetOrders().find((o) => o.id === id);
  if (cached) return cached;
  // Busca de UM contrato via Server Function pública (link do cliente):
  // evita expor a listagem completa da planilha ao navegador.
  const found = await fetchOrderByIdPublic(id);
  if (!found) return undefined;
  if (!opts?.includeDeleted && String(found.status) === "Excluído") return undefined;
  return found;
}
