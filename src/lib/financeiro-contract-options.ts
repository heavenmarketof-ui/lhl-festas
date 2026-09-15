import { toDateISO } from "@/lib/date-utils";
import type { StoredOrder } from "@/lib/orders-storage";

const STATUS_FORA_DO_SELETOR = new Set(["cancelado", "excluido"]);

function normalizarStatus(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Contratos oferecidos ao relacionar um lançamento financeiro.
 *
 * Novos vínculos mostram somente festas do mês atual em diante. Ao editar um
 * lançamento, o contrato já vinculado continua disponível mesmo se a festa
 * for de um mês anterior, evitando apagar ou esconder o vínculo histórico.
 */
export function contratosDisponiveisNoFluxo(
  orders: StoredOrder[],
  contratoVinculadoId = "",
  hoje = new Date(),
): StoredOrder[] {
  const inicioMesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
  const vinculadoId = String(contratoVinculadoId).trim();

  return orders
    .filter((order) => {
      if (STATUS_FORA_DO_SELETOR.has(normalizarStatus(order.status))) return false;
      if (order.id === vinculadoId) return true;

      const dataEvento = toDateISO(order.details?.dataEvento);
      return !!dataEvento && dataEvento >= inicioMesAtual;
    })
    .sort((a, b) =>
      toDateISO(a.details?.dataEvento).localeCompare(toDateISO(b.details?.dataEvento)),
    );
}
