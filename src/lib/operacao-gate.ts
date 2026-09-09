// ============================================================================
// GATES FINANCEIROS DA OPERAÇÃO — LHL FESTAS
// ----------------------------------------------------------------------------
// 1) PREPARAÇÃO: começa após qualquer recebimento real confirmado (sinal).
// 2) ENTREGA/MONTAGEM: somente com o contrato 100% quitado.
// Caução não compõe pagamento do contrato e nunca libera a operação.
// ============================================================================

import type { StoredOrder } from "./orders-storage";
import type { Lancamento } from "./financeiro-api";
import { fetchLancamentos } from "./financeiro-api";
import { fetchOrdersFromSheet } from "./sheets-api";
import { getContractPaymentStatus } from "./pagamentos";

export const OPERACAO_BLOQUEADA_SEM_RECEBIMENTO =
  "Contrato ainda sem recebimento confirmado. A preparação só é liberada após a confirmação real do sinal/pagamento.";

export const ENTREGA_BLOQUEADA_SALDO_PENDENTE =
  "Contrato ainda possui saldo pendente. A LHL Festas não libera retirada, entrega ou montagem antes da quitação integral.";

export type OperacaoGateStatus = {
  /** Compatibilidade: liberada significa preparação liberada. */
  liberada: boolean;
  preparacaoLiberada: boolean;
  entregaLiberada: boolean;
  totalRecebido: number;
  saldoReceber: number;
  quitado: boolean;
  origemLegado: boolean;
  motivo: string;
  motivoEntrega: string;
};

export function getOperacaoGateStatus(
  order: StoredOrder | null | undefined,
  lancamentos: Lancamento[],
): OperacaoGateStatus {
  if (!order || order.status === "Cancelado" || order.status === "Excluído") {
    const motivo = !order
      ? "Contrato não encontrado."
      : order.status === "Excluído"
        ? "Contrato excluído."
        : "Contrato cancelado.";
    return {
      liberada: false,
      preparacaoLiberada: false,
      entregaLiberada: false,
      totalRecebido: 0,
      saldoReceber: 0,
      quitado: false,
      origemLegado: false,
      motivo,
      motivoEntrega: motivo,
    };
  }

  const pagamento = getContractPaymentStatus(order, lancamentos);
  const preparacaoLiberada = pagamento.totalRecebido > 0;
  const quitado = pagamento.saldoReceber <= 0.009 && pagamento.totalContratado > 0;
  const entregaLiberada = preparacaoLiberada && quitado;

  return {
    liberada: preparacaoLiberada,
    preparacaoLiberada,
    entregaLiberada,
    totalRecebido: pagamento.totalRecebido,
    saldoReceber: pagamento.saldoReceber,
    quitado,
    origemLegado: pagamento.origemLegado,
    motivo: preparacaoLiberada
      ? "Recebimento confirmado — preparação liberada."
      : OPERACAO_BLOQUEADA_SEM_RECEBIMENTO,
    motivoEntrega: entregaLiberada
      ? "Pagamento quitado — retirada, entrega ou montagem liberada."
      : ENTREGA_BLOQUEADA_SALDO_PENDENTE,
  };
}

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

/** Compra, produção, separação e preparação podem começar após o sinal. */
export async function assertOperacaoLiberada(
  contratoId: string,
  orderHint?: StoredOrder | null,
): Promise<StoredOrder> {
  const { order, status } = await resolveOperacaoGate(contratoId, orderHint);
  if (!order || !status.preparacaoLiberada) throw new Error(status.motivo);
  return order;
}

/** Retirada pelo cliente, entrega e montagem exigem quitação integral. */
export async function assertEntregaLiberada(
  contratoId: string,
  orderHint?: StoredOrder | null,
): Promise<StoredOrder> {
  const { order, status } = await resolveOperacaoGate(contratoId, orderHint);
  if (!order || !status.entregaLiberada) throw new Error(status.motivoEntrega);
  return order;
}
