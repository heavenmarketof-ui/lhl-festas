import type { StoredOrder } from "./orders-storage";
import { fetchOrderByIdAdmin } from "./sheets-api";

/**
 * Compatibilidade com chamadas antigas do admin.
 * Contratos contêm CPF, telefone, endereço e dados financeiros, portanto não
 * persistimos mais a listagem em localStorage/sessionStorage do navegador.
 */
export function setCachedSheetOrders(_orders: StoredOrder[]) {
  // Intencionalmente vazio: dados sensíveis permanecem apenas na fonte oficial.
}

export function getCachedSheetOrders(): StoredOrder[] {
  return [];
}

/** Busca somente o pedido solicitado atrás da sessão administrativa. */
export async function getOrderFromSheet(
  id: string,
  opts?: { includeDeleted?: boolean },
): Promise<StoredOrder | undefined> {
  const normalizedId = String(id || "").trim();
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(normalizedId)) return undefined;

  const found = await fetchOrderByIdAdmin(normalizedId);
  if (!found) return undefined;
  if (!opts?.includeDeleted && String(found.status) === "Excluído") return undefined;
  return found;
}
