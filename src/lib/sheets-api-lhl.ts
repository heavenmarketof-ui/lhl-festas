import * as base from "./sheets-api";
import type { SheetOrderPayload } from "./sheets-api";
import { getCampaignParams } from "./campaign-params";
import { deriveCampaignAttribution } from "./campaign-attribution";

export * from "./sheets-api";

/**
 * Criação pública soberana da LHL.
 * Preserva a origem de marketing no próprio pré-contrato sem alterar valores,
 * status comercial ou qualquer regra financeira.
 */
export async function postOrderToSheet(payload: SheetOrderPayload): Promise<void> {
  const attribution = deriveCampaignAttribution(getCampaignParams());
  const observacoes = [payload.observacoesInternas, attribution.observacao]
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
