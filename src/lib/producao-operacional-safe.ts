import {
  confirmarKitPronto,
  updateItemProducaoStatus,
  type OrdemProducao,
  type StatusProducao,
} from "./producao-api";
import { assertOperacaoLiberada } from "./operacao-gate";

/**
 * Porta segura para confirmar Kit Pronto.
 * A checagem financeira acontece na mesma função que dispara a mutation,
 * reduzindo o risco de uma tela futura esquecer de aplicar a trava do sinal.
 */
export async function confirmarKitProntoSeguro(
  op: OrdemProducao,
  origem: string,
): Promise<OrdemProducao> {
  await assertOperacaoLiberada(op.contratoId);
  return confirmarKitPronto(op, origem);
}

/**
 * Porta segura para qualquer avanço manual de item de produção.
 * Contrato sem recebimento confirmado não pode iniciar, avançar ou concluir
 * produção operacional.
 */
export async function atualizarStatusProducaoSeguro(
  op: OrdemProducao,
  itemId: string,
  status: StatusProducao,
): Promise<OrdemProducao> {
  await assertOperacaoLiberada(op.contratoId);
  return updateItemProducaoStatus(op.id, itemId, status);
}
