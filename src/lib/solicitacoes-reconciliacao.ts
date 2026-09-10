import type { StoredOrder } from "./orders-storage";
import { parseItensComprar } from "./materiais-catalogo";
import {
  compraStatusOf,
  valorPrevistoCompra,
  type ItemCompra,
  type OrdemProducao,
} from "./producao-api";

const STATUS_REPARAVEIS = new Set([
  "Aguardando orçamento",
  "Orçamento recebido",
  "Aguardando autorização",
]);

/**
 * Localiza itens que o Contrato marcou explicitamente como "enviar para aprovação",
 * mas que ficaram sem Solicitação Financeira vinculada na OP.
 *
 * Esse estado pode acontecer quando a gravação da OP conclui e a criação da
 * solicitação falha logo em seguida. O Contrato continua mostrando o destino
 * correto, por isso ele é a fonte de verdade para a intenção da Josi.
 */
export function itensAprovacaoSemSolicitacao(
  order: StoredOrder,
  op: OrdemProducao,
): ItemCompra[] {
  const planejados = parseItensComprar(order.details?.itensComprar);
  const idsAprovacao = new Set(
    planejados
      .filter((item) => item.destino === "aprovacao" && (item.valorOrcado || 0) > 0)
      .map((item) => item.id),
  );

  if (idsAprovacao.size === 0) return [];

  return (op.compras || []).filter((item) => {
    if (!item.origemContratoItemId || !idsAprovacao.has(item.origemContratoItemId)) return false;
    if (item.cancelado || item.removidoDoContrato || item.solicitacaoId) return false;
    if (!STATUS_REPARAVEIS.has(compraStatusOf(item))) return false;
    return valorPrevistoCompra(item) > 0;
  });
}
