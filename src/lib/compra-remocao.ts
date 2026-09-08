import type { ItemCompra } from "./producao-api";
import { compraStatusOf, compraTemHistorico } from "./producao-api";

export type DecisaoRemocaoCompra =
  | { acao: "excluir"; motivo: string }
  | { acao: "cancelar"; motivo: string }
  | { acao: "bloquear"; motivo: string };

/**
 * Regra oficial de remoção de item operacional.
 * - Item ainda totalmente inicial pode ser excluído.
 * - Item com qualquer histórico comercial/financeiro nunca é apagado: cancela.
 * - Item já comprado/pago não pode ser removido como se nunca tivesse existido.
 */
export function decidirRemocaoCompra(item: ItemCompra): DecisaoRemocaoCompra {
  const status = compraStatusOf(item);

  if (status === "Pago") {
    return {
      acao: "bloquear",
      motivo: "Item já pago. Preserve o histórico e faça qualquer correção pelo Financeiro.",
    };
  }

  if (status === "Compra realizada") {
    return {
      acao: "cancelar",
      motivo: "A compra já foi realizada. O item deve sair da fila ativa, mas permanecer no histórico.",
    };
  }

  if (compraTemHistorico(item)) {
    return {
      acao: "cancelar",
      motivo: "Este item já possui orçamento, solicitação ou autorização. Cancele sem apagar o histórico.",
    };
  }

  return {
    acao: "excluir",
    motivo: "Item ainda sem histórico operacional ou financeiro.",
  };
}

/**
 * Revogar autorização é diferente de remover o item.
 * Só faz sentido enquanto a compra está autorizada e ainda não foi realizada/paga.
 */
export function podeRevogarAutorizacaoCompra(item: ItemCompra): boolean {
  return compraStatusOf(item) === "Compra autorizada" && !item.comprado && !item.pago;
}

export const TEXTO_REVOGAR_AUTORIZACAO =
  "Revogar autorização devolve a compra para análise financeira, sem apagar o item nem o histórico.";

export const TEXTO_REMOVER_ITEM =
  "Remover item tira a necessidade da operação. Se já houver histórico, o sistema cancela e preserva os registros.";
