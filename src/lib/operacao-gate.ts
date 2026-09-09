// ============================================================================
// REGRA SOBERANA DE LIBERAÇÃO OPERACIONAL — LHL FESTAS
// ----------------------------------------------------------------------------
// Pré-contrato sem recebimento permanece fora da preparação operacional.
// Após qualquer recebimento real confirmado (normalmente o sinal), compras,
// produção, separação e preparação podem começar.
//
// IMPORTANTE: saldo pendente NÃO cria bloqueio técnico de retirada, entrega ou
// montagem. A situação financeira deve ficar visível para controle humano de
// Vitor/Josi, que decidem operacionalmente a entrega.
// Caução não compõe pagamento do contrato.
// ============================================================================

import type { StoredOrder } from "./orders-storage";
import type { Lancamento } from "./financeiro-api";
import { fetchLancamentos } from "./financeiro-api";
import { fetchOrdersFromSheet } from "./sheets-api";
import { getContractPaymentStatus } from "./pagamentos";

export const OPERACAO_BLOQUEADA_SEM_RECEBIMENTO =
  "Contrato ainda sem recebimento confirmado. A preparação só é liberada após a confirmação real do sinal/pagamento.";

export type OperacaoGateStatus = {
  /** Compatibilidade: liberada significa preparação liberada. */
  liberada: boolean;
  preparacaoLiberada: boolean;
  /** Informativo apenas: indica quitação, nunca deve ser usado como bloqueio de entrega. */
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

  return {
    liberada: preparacaoLiberada,
    preparacaoLiberada,
    // Mantido por compatibilidade com telas existentes; é somente um indicador financeiro.
    entregaLiberada: quitado,
    totalRecebido: pagamento.totalRecebido,
    saldoReceber: pagamento.saldoReceber,
    quitado,
    origemLegado: pagamento.origemLegado,
    motivo: preparacaoLiberada
      ? "Recebimento confirmado — preparação liberada."
      : OPERACAO_BLOQUEADA_SEM_RECEBIMENTO,
    motivoEntrega: quitado
      ? "Pagamento quitado."
      : "Há saldo pendente — informação para controle da equipe; a entrega é decidida manualmente.",
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
