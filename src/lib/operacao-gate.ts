// ============================================================================
// REGRA SOBERANA DE LIBERAÇÃO OPERACIONAL — LHL FESTAS
// ----------------------------------------------------------------------------
// Pré-contrato NÃO libera operação.
// Somente contrato com recebimento confirmado pode liberar compras, produção,
// separação, preparação operacional e integrações de agenda comercial.
//
// Fonte da verdade: recebimentos reais vinculados ao contrato no Fluxo de Caixa,
// excluindo caução. Para contratos legados sem lançamento financeiro, mantemos a
// compatibilidade com os flags históricos já consolidados no sistema.
// ============================================================================

import type { StoredOrder } from "./orders-storage";
import type { Lancamento } from "./financeiro-api";
import { fetchLancamentos } from "./financeiro-api";
import { fetchOrdersFromSheet } from "./sheets-api";
import { getContractPaymentStatus } from "./pagamentos";

export const OPERACAO_BLOQUEADA_SEM_RECEBIMENTO =
  "Contrato ainda sem recebimento confirmado. A operação só é liberada após a confirmação real do sinal/pagamento.";

export type OperacaoGateStatus = {
  liberada: boolean;
  totalRecebido: number;
  origemLegado: boolean;
  motivo: string;
};

/**
 * Decide se um contrato pode entrar na operação.
 * Caução nunca libera a festa porque getContractPaymentStatus a exclui do recebido.
 */
export function getOperacaoGateStatus(
  order: StoredOrder | null | undefined,
  lancamentos: Lancamento[],
): OperacaoGateStatus {
  if (!order || order.status === "Cancelado") {
    return {
      liberada: false,
      totalRecebido: 0,
      origemLegado: false,
      motivo: order?.status === "Cancelado" ? "Contrato cancelado." : "Contrato não encontrado.",
    };
  }

  const pagamento = getContractPaymentStatus(order, lancamentos);
  const liberada = pagamento.totalRecebido > 0;

  return {
    liberada,
    totalRecebido: pagamento.totalRecebido,
    origemLegado: pagamento.origemLegado,
    motivo: liberada ? "Recebimento confirmado — operação liberada." : OPERACAO_BLOQUEADA_SEM_RECEBIMENTO,
  };
}

/** Resolve contrato + financeiro atuais e devolve o gate operacional. */
export async function resolveOperacaoGate(
  contratoId: string,
  orderHint?: StoredOrder | null,
): Promise<{ order: StoredOrder | null; lancamentos: Lancamento[]; status: OperacaoGateStatus }> {
  const [orders, lancamentos] = await Promise.all([
    orderHint ? Promise.resolve([orderHint]) : fetchOrdersFromSheet({ force: true }),
    fetchLancamentos({ force: true }),
  ]);

  const order = orderHint ?? orders.find((o) => o.id === contratoId) ?? null;
  return { order, lancamentos, status: getOperacaoGateStatus(order, lancamentos) };
}

/**
 * Barreira arquitetural para qualquer mutation operacional.
 * Use antes de avançar compra, produção, separação ou preparação.
 */
export async function assertOperacaoLiberada(
  contratoId: string,
  orderHint?: StoredOrder | null,
): Promise<StoredOrder> {
  const { order, status } = await resolveOperacaoGate(contratoId, orderHint);
  if (!order || !status.liberada) throw new Error(status.motivo);
  return order;
}
