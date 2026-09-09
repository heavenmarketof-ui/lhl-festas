import type { StoredOrder } from "./orders-storage";
import { toDateISO } from "./date-utils";

function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

/**
 * Regra soberana para filas/alertas operacionais da LHL.
 *
 * Contratos históricos continuam armazenados e acessíveis, mas não devem
 * reaparecer no trabalho diário da Josi.
 */
export function contratoEncerradoOperacionalmente(
  order: StoredOrder | null | undefined,
  hojeISO?: string,
): boolean {
  if (!order) return true;

  const status = norm(order.status);
  const d = order.details;

  if (
    status.includes("finaliz") ||
    status === "cancelado" ||
    status === "excluído" ||
    status === "excluido"
  ) return true;

  // Quitação financeira não encerra a operação. Uma festa futura totalmente
  // paga continua exigindo preparação, produção, calendário e execução.
  if (
    d?.devolucaoConfirmada === "Sim" ||
    d?.caucaoDevolvida === "Sim"
  ) return true;

  // Migração/limpeza histórica: festas que já aconteceram antes de hoje não
  // devem continuar produzindo compras, produção, alertas ou tarefas ativas.
  if (hojeISO) {
    const evento = toDateISO(d?.dataEvento);
    if (evento && evento < hojeISO) return true;
  }

  return false;
}

export function contratoOperacionalmenteAtivo(
  order: StoredOrder | null | undefined,
  hojeISO?: string,
): boolean {
  return !contratoEncerradoOperacionalmente(order, hojeISO);
}

export function idsContratosOperacionaisAtivos(
  orders: StoredOrder[],
  hojeISO?: string,
): Set<string> {
  return new Set(
    (orders || [])
      .filter((o) => contratoOperacionalmenteAtivo(o, hojeISO))
      .map((o) => String(o.id)),
  );
}
