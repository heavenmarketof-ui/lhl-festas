import type { CampaignParams } from "./campaign-params";

const PAID_MEDIA = /(^|[-_\s])(cpc|ppc|paid|ads?|social[-_\s]?paid)([-_\s]|$)/i;

export type CampaignAttribution = {
  origemCliente: string;
  veioAnuncio: "Sim" | "Não";
  observacao: string;
};

/**
 * Converte os parâmetros técnicos de campanha em campos operacionais do contrato.
 * Não altera a regra comercial: isso serve apenas para saber de onde veio o cliente.
 */
export function deriveCampaignAttribution(params: CampaignParams): CampaignAttribution {
  const source = String(params.utm_source || "").trim();
  const medium = String(params.utm_medium || "").trim();
  const campaign = String(params.utm_campaign || "").trim();
  const content = String(params.utm_content || "").trim();
  const term = String(params.utm_term || "").trim();
  const gclid = String(params.gclid || "").trim();
  const fbclid = String(params.fbclid || "").trim();

  const pago = Boolean(gclid || fbclid || PAID_MEDIA.test(medium));
  const origemCliente = source || (gclid ? "Google Ads" : fbclid ? "Meta Ads" : "Site");

  const partes = [
    source && `utm_source=${source}`,
    medium && `utm_medium=${medium}`,
    campaign && `utm_campaign=${campaign}`,
    content && `utm_content=${content}`,
    term && `utm_term=${term}`,
    gclid && "gclid=presente",
    fbclid && "fbclid=presente",
  ].filter(Boolean);

  return {
    origemCliente,
    veioAnuncio: pago ? "Sim" : "Não",
    observacao: partes.length ? `Campanha: ${partes.join(" | ")}` : "",
  };
}
