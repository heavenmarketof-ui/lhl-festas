import type { StoredOrder } from "./orders-storage";
import type { Lancamento } from "./financeiro-api";
import { parseValor } from "./financeiro-api";
import { getContractPaymentStatus, indexRecebimentos, money } from "./pagamentos";

export type ContratoFinanceiroView = {
  valorTotal: number;
  valorSinal: number;
  recebido: number;
  saldo: number;
  caucao: number;
  status: "Sem valor" | "Aguardando sinal" | "Parcial" | "Quitado";
  sinalConfirmado: boolean;
  quitado: boolean;
  origemLegado: boolean;
};

export function resumoFinanceiroContrato(
  order: StoredOrder,
  lancamentos: Lancamento[] | ReturnType<typeof indexRecebimentos>,
): ContratoFinanceiroView {
  const status = getContractPaymentStatus(order, lancamentos);
  const valorSinal = money(parseValor(order.details?.valorSinal));
  const sinalConfirmado = status.totalRecebido > 0;

  let label: ContratoFinanceiroView["status"];
  if (status.valorTotal <= 0 && status.totalRecebido <= 0) label = "Sem valor";
  else if (status.isPago) label = "Quitado";
  else if (!sinalConfirmado) label = "Aguardando sinal";
  else label = "Parcial";

  return {
    valorTotal: status.valorTotal,
    valorSinal,
    recebido: status.totalRecebido,
    saldo: status.saldoReceber,
    caucao: status.caucaoRecebida,
    status: label,
    sinalConfirmado,
    quitado: status.isPago,
    origemLegado: status.origemLegado,
  };
}

export function classeStatusFinanceiro(status: ContratoFinanceiroView["status"]): string {
  if (status === "Quitado") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "Parcial") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "Aguardando sinal") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}
