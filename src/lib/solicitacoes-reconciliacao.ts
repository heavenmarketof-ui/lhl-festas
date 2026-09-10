import type { StoredOrder } from "./orders-storage";
import { normalizeMaterialName, parseItensComprar } from "./materiais-catalogo";
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

function reparavel(item: ItemCompra) {
  if (item.cancelado || item.removidoDoContrato || item.solicitacaoId) return false;
  if (!STATUS_REPARAVEIS.has(compraStatusOf(item))) return false;
  return valorPrevistoCompra(item) > 0;
}

/**
 * Localiza itens que o Contrato marcou explicitamente como "enviar para aprovação",
 * mas que ficaram sem Solicitação Financeira vinculada na OP.
 *
 * Registros novos usam `origemContratoItemId`. Para contratos/OPs antigos que
 * não possuíam esse vínculo, há fallback seguro por descrição normalizada e,
 * quando disponível, valor compatível. O fallback só é usado quando a
 * correspondência é inequívoca dentro daquela OP.
 */
export function itensAprovacaoSemSolicitacao(
  order: StoredOrder,
  op: OrdemProducao,
): ItemCompra[] {
  const planejados = parseItensComprar(order.details?.itensComprar)
    .filter((item) => item.destino === "aprovacao" && (item.valorOrcado || 0) > 0);

  if (planejados.length === 0) return [];

  const planejadosById = new Map(planejados.map((item) => [item.id, item]));
  const usados = new Set<string>();
  const faltantes: ItemCompra[] = [];

  // Caminho preferencial: vínculo explícito do item da OP com o item do contrato.
  for (const item of op.compras || []) {
    if (!reparavel(item) || !item.origemContratoItemId) continue;
    const planejado = planejadosById.get(item.origemContratoItemId);
    if (!planejado) continue;
    usados.add(planejado.id);
    faltantes.push(item);
  }

  // Compatibilidade histórica: OPs antigas podem não ter origemContratoItemId.
  // Só reconciliamos quando existe uma única correspondência possível.
  for (const item of op.compras || []) {
    if (!reparavel(item) || item.origemContratoItemId) continue;

    const nome = normalizeMaterialName(item.descricao);
    if (!nome) continue;
    const valor = valorPrevistoCompra(item);

    const candidatosPorNome = planejados.filter((p) =>
      !usados.has(p.id) && normalizeMaterialName(p.nome) === nome,
    );
    if (candidatosPorNome.length === 0) continue;

    const candidatosPorValor = candidatosPorNome.filter((p) =>
      Math.abs(Number(p.valorOrcado || 0) - valor) < 0.01,
    );

    const candidatos = candidatosPorValor.length > 0 ? candidatosPorValor : candidatosPorNome;
    if (candidatos.length !== 1) continue;

    usados.add(candidatos[0].id);
    faltantes.push(item);
  }

  return faltantes;
}
