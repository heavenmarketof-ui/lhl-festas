// ============================================================================
// FONTE ÚNICA DA VERDADE DO STATUS FINANCEIRO DO CONTRATO — LHL FESTAS
// ----------------------------------------------------------------------------
// Regra oficial:
//   Saldo Real a Receber = Valor Total do Contrato − Recebimentos Confirmados
//   saldoReceber <= 0  →  PAGAMENTO CONCLUÍDO (isPago = true)
//
// Recebimentos confirmados = lançamentos de ENTRADA do Fluxo de Caixa
// vinculados ao contrato (contratoId), EXCLUINDO caução (caução não é receita
// operacional e nunca quita o contrato).
//
// Somente se o contrato ainda não possui NENHUM lançamento de entrada usamos o
// legado (sinalRecebido / pagamentoFinalRecebido) como aproximação, para não
// perder o histórico de contratos anteriores ao Fluxo de Caixa.
// ============================================================================

import type { StoredOrder } from "./orders-storage";
import type { Lancamento } from "./financeiro-api";
import { parseValor } from "./financeiro-api";

export type PaymentStatusLabel = "Quitado" | "Parcial" | "Pendente" | "Sem valor";

export type ContractPaymentStatus = {
  valorTotal: number;
  totalRecebido: number;
  saldoReceber: number;
  isPago: boolean;
  status: PaymentStatusLabel;
  /** Total de caução recebida (informativo — nunca entra em totalRecebido). */
  caucaoRecebida: number;
  /** true quando o cálculo veio dos campos legados (sem lançamentos). */
  origemLegado: boolean;
};

/** Arredondamento monetário seguro (2 casas) — evita 0.000001 gerando alerta. */
export function money(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

/** Tolerância de 1 centavo para considerar saldo zerado. */
export function isZero(n: number): boolean {
  return Math.abs(money(n)) < 0.005;
}

function ehCaucao(l: Lancamento): boolean {
  const norm = (v: unknown) =>
    String(v ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  return norm(l.categoria).includes("caucao") || norm(l.origem).includes("caucao");
}

/** Índice contratoId → recebimentos (evita varrer a lista por contrato). */
export function indexRecebimentos(lancamentos: Lancamento[]) {
  const receitas = new Map<string, number>();
  const caucoes = new Map<string, number>();
  let saldoAcumulado = 0;
  for (const l of lancamentos || []) {
    const v = parseValor(l.valor);
    if (l.tipo === "Entrada") saldoAcumulado += v; else saldoAcumulado -= v;

    const cid = String(l.contratoId || "");
    if (!cid || l.tipo !== "Entrada") continue;
    const alvo = ehCaucao(l) ? caucoes : receitas;
    alvo.set(cid, money((alvo.get(cid) || 0) + v));
  }
  return { receitas, caucoes, saldoAcumulado };
}

/**
 * Função central de status financeiro do contrato.
 * Todas as telas (Dashboard, Financeiro, Gestão Financeira, Contrato) devem
 * usar esta função — nunca recalcular de forma própria.
 */
export function getContractPaymentStatus(
  order: StoredOrder | null | undefined,
  lancamentos: Lancamento[] | { receitas: Map<string, number>; caucoes: Map<string, number> },
): ContractPaymentStatus {
  const d = order?.details;
  const valorTotal = money(parseValor(d?.valorTotal));
  const idx = Array.isArray(lancamentos) ? indexRecebimentos(lancamentos) : lancamentos;
  const id = String(order?.id || "");

  const recebidoLanc = money(idx.receitas.get(id) || 0);
  const caucao = money(idx.caucoes.get(id) || 0);

  // REGRA LHL: O saldo a receber ignora a caução para fins de quitação do contrato.
  // A caução é um valor de garantia que circula no caixa mas não abate o valor do serviço.
  let totalRecebido = recebidoLanc;
  let origemLegado = false;

  if (recebidoLanc <= 0) {
    // Nenhum recebimento registrado no Fluxo de Caixa: usa o legado.
    const sinal = money(parseValor(d?.valorSinal));
    if ((d?.pagamentoFinalRecebido || "Não") === "Sim") {
      totalRecebido = valorTotal;
      origemLegado = true;
    } else if ((d?.sinalRecebido || "Não") === "Sim") {
      totalRecebido = sinal;
      origemLegado = true;
    }
  }

  // REGRA DE LEGADO: Se não há lançamentos e existem evidências de encerramento,
  // ou se os dados históricos indicam quitação, tratamos como quitado.
  const evidenciasEncerramento =
    (d?.pagamentoFinalRecebido || "Não") === "Sim" ||
    (d?.pagamentoFinalizado || "Não") === "Sim";

  if (recebidoLanc <= 0 && evidenciasEncerramento) {
    totalRecebido = valorTotal;
    origemLegado = true;
  }


  totalRecebido = money(Math.min(totalRecebido, Math.max(valorTotal, totalRecebido)));
  const saldoBruto = money(valorTotal - totalRecebido);
  const saldoReceber = isZero(saldoBruto) || saldoBruto < 0 ? 0 : saldoBruto;
  const isPago = valorTotal > 0 ? saldoReceber === 0 : totalRecebido > 0;

  const status: PaymentStatusLabel =
    valorTotal <= 0 && totalRecebido <= 0
      ? "Sem valor"
      : isPago
        ? "Quitado"
        : totalRecebido > 0
          ? "Parcial"
          : "Pendente";

  return {
    valorTotal,
    totalRecebido,
    saldoReceber,
    isPago,
    status,
    caucaoRecebida: caucao,
    origemLegado,
  };
}

/** Atalho: o contrato possui saldo real a receber? */
export function temPagamentoPendente(
  order: StoredOrder | null | undefined,
  lancamentos: Parameters<typeof getContractPaymentStatus>[1],
): boolean {
  return getContractPaymentStatus(order, lancamentos).saldoReceber > 0;
}
