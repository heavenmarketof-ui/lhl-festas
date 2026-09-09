import * as base from "./sheets-api";
import type { SheetOrderPayload } from "./sheets-api";
import { getCampaignParams } from "./campaign-params";
import { deriveCampaignAttribution } from "./campaign-attribution";
import { getLastLeadContext, leadMarker, matchingLeadId } from "./journey-link";

export * from "./sheets-api";

/**
 * Criação pública soberana da LHL.
 * Preserva a origem de marketing no próprio pré-contrato sem alterar valores,
 * status comercial ou qualquer regra financeira.
 *
 * Quando a reserva é continuação do mesmo atendimento iniciado no formulário
 * de orçamento, grava também o ID do lead no histórico interno. O vínculo só é
 * aceito quando telefone e data da festa coincidem exatamente.
 */
export async function postOrderToSheet(payload: SheetOrderPayload): Promise<void> {
  const attribution = deriveCampaignAttribution(getCampaignParams());
  const lastLead = getLastLeadContext();
  const linkedLeadId = matchingLeadId(lastLead, payload.telefone, payload.dataEvento);
  const marker = leadMarker(linkedLeadId);

  const observacoes = [payload.observacoesInternas, marker, attribution.observacao]
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .join("\n");

  await base.postOrderToSheet({
    ...payload,
    origemCliente: payload.origemCliente || attribution.origemCliente,
    veioAnuncio: payload.veioAnuncio || attribution.veioAnuncio,
    observacoesInternas: observacoes,
  });
}
