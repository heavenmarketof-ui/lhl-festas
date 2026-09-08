// Geração da mensagem final e envio ao WhatsApp oficial da LHL,
// preservando UTMs / gclid / fbclid via campaign-params.ts.
//
// Kits, preços e itens vêm SEMPRE da fonte única oficial: src/data/kits.ts.

import { WHATSAPP_NUMBER } from "@/lib/orders-storage";
import { appendCampaignParams, getCampaignParams } from "@/lib/campaign-params";
import { MODALITY_LABELS, type ConsultorState } from "./types";
import { getKitById } from "./kits";
import { createLeadOnSheet, detectOrigem, type LeadInput } from "@/lib/leads-api";

function detectDevice(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function detectBrowser(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "Edge";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return "Safari";
  if (/Firefox\//.test(ua)) return "Firefox";
  return "Other";
}

function formatDate(iso?: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso || "-");
}

export function buildWhatsappMessage(state: ConsultorState): string {
  const a = state.answers;
  const kit = getKitById(a.chosenKitId);
  const choices = a.kitChoices || {};

  const lines: string[] = [
    "🎉 Novo atendimento pelo Consultor LHL",
    "",
    `Nome: ${a.name || "-"}`,
    `Data da festa: ${a.dateSkipped ? "Ainda a definir" : formatDate(a.date)}`,
    `Cidade: ${a.city || "-"}`,
  ];
  if (a.age) lines.push(`Idade: ${a.age}`);
  if (a.venue) lines.push(`Local: ${a.venue}`);

  lines.push("", `Modalidade: ${a.modality ? MODALITY_LABELS[a.modality] : "-"}`);

  if (kit) {
    lines.push(`Kit: ${kit.nome}`);
  } else {
    lines.push("Kit: Ainda não definido", "", "Cliente deseja ajuda para escolher o kit.");
  }

  lines.push("", `Tema: ${a.theme || "-"}${a.themeIsCustom ? " (personalizado)" : ""}`);
  if (a.themeModality) lines.push(`Modalidade da arte: ${a.themeModality}`);
  if (a.themeId && !a.themeIsCustom) lines.push(`Arte (id): ${a.themeId}`);
  if (a.themeImageUrl) lines.push(`Imagem escolhida: ${a.themeImageUrl}`);

  if (kit?.escolhas?.length) {
    const picked = kit.escolhas
      .map((e) => choices[e.id])
      .filter(Boolean) as string[];
    if (picked.length) {
      lines.push("", "Escolhas do kit:", ...picked.map((p) => `• ${p}`));
    }
  }

  if (kit) {
    lines.push("", "Itens do kit:", ...kit.itens.map((i) => `• ${i}`));
  }

  lines.push(
    "",
    `Possuo foto de referência: ${a.hasReferencePhoto ? "Sim" : "Não"}`,
    "",
    "Origem: Consultor de Festas LHL",
  );
  return lines.join("\n");
}

export function buildWhatsappUrl(state: ConsultorState): string {
  const text = buildWhatsappMessage(state);
  const base = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  return appendCampaignParams(base);
}

// Registra o lead no mesmo backend usado pelo restante do site.
// Deduplica por sessão: uma vez enviado, não envia de novo até fechar a aba.
const SESSION_LEAD_KEY = "lhl_consultor_lead_sent";

export async function submitConsultorLead(state: ConsultorState): Promise<{ ok: boolean; id?: string }> {
  const a = state.answers;
  if (typeof window !== "undefined") {
    try {
      const already = sessionStorage.getItem(SESSION_LEAD_KEY);
      if (already) return { ok: true, id: already };
    } catch { /* noop */ }
  }

  const params = getCampaignParams();
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const kit = getKitById(a.chosenKitId);
  const qualified = Boolean(a.chosenKitId || (a.themeId && !a.themeIsCustom));
  const choices = a.kitChoices || {};

  const input: LeadInput = {
    nome: a.name || "",
    whatsapp: "", // Consultor não coleta telefone — cliente segue no WhatsApp
    dataFesta: a.dateSkipped ? "" : (a.date || ""),
    tema: a.theme || "",
    submittedAt: new Date().toISOString(),
    pageUrl,
    userAgent,
    device: detectDevice(),
    browser: detectBrowser(),
    utm_source: params.utm_source,
    utm_medium: params.utm_medium,
    utm_campaign: params.utm_campaign,
    utm_content: params.utm_content,
    utm_term: params.utm_term,
    gclid: params.gclid,
    fbclid: params.fbclid,
    modalidade: a.modality ? MODALITY_LABELS[a.modality] : "",
    modelo: kit?.nome || "Ainda não definido",
    imagemReferencia: a.themeImageUrl || undefined,
    origem: detectOrigem({ ...params, pageUrl }),
    tipoSolicitacao: "consultor-festas-lhl",
    themeId: a.themeId || "",
    descricao: [
      a.city ? `Cidade: ${a.city}` : "",
      a.venue ? `Local: ${a.venue}` : "",
      a.age ? `Idade: ${a.age}` : "",
      kit ? `Kit: ${kit.nome} (valor-base interno: R$ ${kit.preco.toFixed(2)})` : "Cliente deseja ajuda para escolher o kit",
      kit?.escolhas?.length
        ? `Escolhas do kit: ${kit.escolhas.map((e) => choices[e.id]).filter(Boolean).join(" | ")}`
        : "",
      a.hasReferencePhoto ? "Possui foto de referência" : "",
    ].filter(Boolean).join(" | "),
    qualified,
    qualificationReason: qualified
      ? (a.chosenKitId ? "kit_chosen" : "catalog_theme")
      : "",
    leadStage: qualified ? "QUALIFIED" : "NEW",
  };

  try {
    const res = await createLeadOnSheet(input);
    if (res?.ok && typeof window !== "undefined") {
      try { sessionStorage.setItem(SESSION_LEAD_KEY, res.id || "1"); } catch { /* noop */ }
    }
    return { ok: !!res?.ok, id: res?.id };
  } catch {
    // Falha silenciosa: nunca bloquear o cliente de seguir para o WhatsApp.
    return { ok: false };
  }
}
