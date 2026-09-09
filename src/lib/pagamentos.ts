// ============================================================================
// FONTE ÚNICA DA VERDADE DO STATUS FINANCEIRO DO CONTRATO — LHL FESTAS
// ----------------------------------------------------------------------------
// Regras oficiais:
//   • Pré-contrato sem recebimento confirmado NÃO é venda e NÃO gera A Receber.
//   • A venda nasce no primeiro recebimento real não-caução (normalmente o sinal).
//   • Depois da venda, Saldo a Receber = Valor Total − Recebimentos Confirmados.
//   • Caução nunca compõe receita nem quita o contrato.
//   • Contratos encerrados/finalizados deixam de aparecer como pendência ativa,
//     preservando o histórico financeiro efetivamente recebido.
//
// Para registros legados sem Fluxo de Caixa, sinalRecebido continua sendo aceito
// como evidência histórica. Flags de quitação só podem fechar o contrato quando
// não contradizem um valorRestante positivo gravado no próprio contrato.
// ============================================================================

import type { StoredOrder } from "./orders-storage";
import type { Lancamento } from "./financeiro-api";
import { parseValor } from "./financeiro-api";

export type PaymentStatusLabel = "Quitado" | "Parcial" | "Pendente" | "Sem valor";

export type ContractPaymentStatus = {
  valorTotal: number;
  totalRecebido: number;
  /** Saldo reconhecido como conta a receber. Antes da venda confirmada é zero. */
  saldoReceber: number;
  /** Diferença matemática entre valor negociado e recebido, mesmo em pré-contrato. */
  saldoNegociado: number;
  isPago: boolean;
  status: PaymentStatusLabel;
  /** true quando houve o primeiro recebimento não-caução (ou evidência legada equivalente). */
  vendaConfirmada: boolean;
  /** true quando o contrato já saiu das pendências operacionais/financeiras ativas. */
  encerrado: boolean;
  /** Total de caução recebida (informativo — nunca entra em totalRecebido). */
  caucaoRecebida: number;
  /** true quando o cálculo veio dos campos legados (sem lançamentos). */
  origemLegado: boolean;
};

export function money(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

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

function contratoEncerrado(order: StoredOrder | null | undefined): boolean {
  if (!order) return false;
  if (order.status === "Finalizado" || order.status === "Cancelado" || order.status === "Excluído") return true;
  const d = order.details;
  return (
    (d?.devolucaoConfirmada || "Não") === "Sim" ||
    (d?.caucaoDevolvida || "Não") === "Sim"
  );
}

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
  const sinal = money(parseValor(d?.valorSinal));
  const restanteDeclarado = money(parseValor(d?.valorRestante));

  let totalRecebido = recebidoLanc;
  let origemLegado = false;

  // Compatibilidade histórica: sinal marcado como recebido pode confirmar uma
  // venda antiga sem lançamento financeiro. Nunca presume pagamento além do sinal.
  if (recebidoLanc <= 0 && (d?.sinalRecebido || "Não") === "Sim" && sinal > 0) {
    totalRecebido = Math.min(sinal, valorTotal || sinal);
    origemLegado = true;
  }

  // Flags legadas de quitação só são confiáveis quando o próprio contrato NÃO
  // declara saldo restante positivo. Isso evita falsos "QUITADO" em contratos
  // novos/migrados que ainda possuem saldo negociado.
  const flagQuitacaoLegada =
    (d?.pagamentoFinalRecebido || "Não") === "Sim" ||
    (d?.pagamentoFinalizado || "Não") === "Sim";
  const podeUsarQuitacaoLegada = recebidoLanc <= 0 && flagQuitacaoLegada && isZero(restanteDeclarado);

  if (podeUsarQuitacaoLegada && valorTotal > 0) {
    totalRecebido = valorTotal;
    origemLegado = true;
  }

  totalRecebido = money(Math.min(totalRecebido, Math.max(valorTotal, totalRecebido)));
  const saldoBruto = money(valorTotal - totalRecebido);
  const saldoNegociado = isZero(saldoBruto) || saldoBruto < 0 ? 0 : saldoBruto;

  const vendaConfirmada = totalRecebido > 0;
  const encerrado = contratoEncerrado(order);

  const saldoReceber = !vendaConfirmada || encerrado ? 0 : saldoNegociado;

  const quitadoFinanceiramente = valorTotal > 0 ? saldoNegociado === 0 && vendaConfirmada : vendaConfirmada;
  const isPago = encerrado || quitadoFinanceiramente;

  const status: PaymentStatusLabel =
    valorTotal <= 0 && totalRecebido <= 0
      ? "Sem valor"
      : isPago
        ? "Quitado"
        : vendaConfirmada
          ? "Parcial"
          : "Pendente";

  return {
    valorTotal,
    totalRecebido,
    saldoReceber,
    saldoNegociado,
    isPago,
    status,
    vendaConfirmada,
    encerrado,
    caucaoRecebida: caucao,
    origemLegado,
  };
}

export function temPagamentoPendente(
  order: StoredOrder | null | undefined,
  lancamentos: Parameters<typeof getContractPaymentStatus>[1],
): boolean {
  return getContractPaymentStatus(order, lancamentos).saldoReceber > 0;
}
