// Helper isolado para envio de eventos ao dataLayer (GTM).
// Nenhum disparo direto a GA4/gtag/fbq — apenas push no dataLayer, seguindo
// o mesmo padrão já usado pelo restante do site. Nunca remove nem altera
// eventos existentes.

type DataLayerPayload = Record<string, unknown>;

export type ConsultorEvent =
  | "consultor_festas_opened"
  | "consultor_festas_started"
  | "consultor_festas_theme_selected"
  | "consultor_festas_catalog_match"
  | "consultor_festas_custom_theme"
  | "consultor_festas_kit_recommended"
  | "consultor_festas_kit_selected"
  | "consultor_festas_kit_undecided"
  | "consultor_festas_completed"
  | "consultor_festas_whatsapp_clicked"
  | "consultor_festas_catalog_loaded"
  | "consultor_festas_lead";

export function pushConsultorEvent(event: ConsultorEvent, payload: DataLayerPayload = {}): void {
  if (typeof window === "undefined") return;
  try {
    const w = window as unknown as { dataLayer?: unknown[] };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event, ...payload });
  } catch { /* noop */ }
}
