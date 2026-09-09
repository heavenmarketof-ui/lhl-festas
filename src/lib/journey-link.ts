import { toDateISO } from "./date-utils";

export type LastLeadContext = {
  leadId?: string;
  whatsapp?: string;
  dataFesta?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  fbclid?: string;
  origem?: string;
};

const MARKER_PREFIX = "Lead CRM vinculado:";

function digits(v: unknown) {
  let d = String(v ?? "").replace(/\D/g, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  return d;
}

export function getLastLeadContext(): LastLeadContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem("lhl_last_lead");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastLeadContext;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function matchingLeadId(
  ctx: LastLeadContext | null | undefined,
  telefone: unknown,
  dataEvento: unknown,
): string {
  if (!ctx?.leadId) return "";
  const phoneLead = digits(ctx.whatsapp);
  const phoneOrder = digits(telefone);
  const dateLead = toDateISO(ctx.dataFesta);
  const dateOrder = toDateISO(dataEvento);
  if (!phoneLead || !phoneOrder || phoneLead !== phoneOrder) return "";
  if (!dateLead || !dateOrder || dateLead !== dateOrder) return "";
  return String(ctx.leadId).trim();
}

export function leadMarker(leadId: string): string {
  const safe = String(leadId || "").trim().replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
  return safe ? `${MARKER_PREFIX} ${safe}` : "";
}

export function extractLinkedLeadId(observacoesInternas: unknown): string {
  const text = String(observacoesInternas ?? "");
  const line = text.split(/\r?\n/).find((l) => l.trim().startsWith(MARKER_PREFIX));
  if (!line) return "";
  return line.slice(line.indexOf(MARKER_PREFIX) + MARKER_PREFIX.length).trim().replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
}
