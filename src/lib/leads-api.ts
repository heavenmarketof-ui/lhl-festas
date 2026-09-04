// Módulo de Leads — persistência em uma nova aba "LEADS" do Google Sheets,
// via o mesmo endpoint Apps Script já usado por contratos/patrimônio.
//
// Contrato com o backend (Apps Script):
// - O Apps Script GERA: id (LEAD-AAAA-NNNN), status inicial, createdAt,
//   dataCadastro, horaCadastro e ultimaInteracao.
// - O frontend NÃO envia esses campos na criação.
// - As ações administrativas (leadsList / leadsUpdateStatus) exigem
//   o header/campo `adminToken` (validado por PropertiesService no servidor).
//   Isso é uma MITIGAÇÃO — se o token vazar por engenharia reversa do bundle,
//   um atacante consegue acessar. Para proteção real seria necessário mover
//   essas ações para um backend com sessão (ex.: função protegida no Cloud).

import { sheetPost, sheetPublicPost } from "./sheets-gateway";

export type LeadStatus = "Novo Lead" | "Em Atendimento" | "Convertido" | "Perdido";
export const LEAD_STATUSES: LeadStatus[] = [
  "Novo Lead",
  "Em Atendimento",
  "Convertido",
  "Perdido",
];

// Estágio comercial do lead — coexiste com `status` (legado) sem substituí-lo.
export type LeadStage =
  | "NEW"
  | "QUALIFIED"
  | "CONTACTING"
  | "NEGOTIATION"
  | "CLOSED"
  | "LOST";

export const LEAD_STAGES: LeadStage[] = [
  "NEW",
  "QUALIFIED",
  "CONTACTING",
  "NEGOTIATION",
  "CLOSED",
  "LOST",
];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  NEW: "Novo",
  QUALIFIED: "Qualificado",
  CONTACTING: "Em atendimento",
  NEGOTIATION: "Em negociação",
  CLOSED: "Fechado",
  LOST: "Perdido",
};

export type LeadOrigem =
  | "Google Ads"
  | "Meta Ads"
  | "QR Code"
  | "Site Orgânico"
  | "Outro";

export const LEAD_ORIGENS: LeadOrigem[] = [
  "Google Ads",
  "Meta Ads",
  "QR Code",
  "Site Orgânico",
  "Outro",
];

export type LeadInput = {
  nome: string;
  whatsapp: string;
  dataFesta: string;
  tema: string;
  submittedAt: string;
  pageUrl: string;
  userAgent: string;
  device: "mobile" | "tablet" | "desktop";
  browser: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  fbclid?: string;
  // Dados vindos do catálogo / orçamento
  modalidade?: string;
  /** Kit oficial escolhido (src/data/kits.ts), ex.: "Kit Premium". */
  kit?: string;
  modelo?: string;
  imagemReferencia?: string;
  origem?: string;
  tipoSolicitacao?: string;
  themeId?: string;
  imageId?: string;
  categoryId?: string;
  descricao?: string;
  // Qualificação
  qualified?: boolean;
  qualificationReason?: string; // "catalog_theme", "catalog_image", "uploaded_reference" (csv)
  leadStage?: LeadStage;
};

export type LeadRecord = {
  id: string;
  nome: string;
  whatsapp: string;
  whatsappNormalizado: string;
  dataFesta: string;
  tema: string;
  status: LeadStatus;
  leadStage: LeadStage;
  createdAt: string;      // ISO
  dataCadastro: string;   // dd/mm/aaaa
  horaCadastro: string;   // HH:mm
  ultimaInteracao: string; // ISO
  origem: LeadOrigem;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  pageUrl: string;
  device: string;
  browser: string;
  // Escolha do cliente
  modalidade: string;
  kit: string;
  modelo: string;
  tipoSolicitacao: string;
  themeId: string;
  imageId: string;
  categoryId: string;
  imagemReferencia: string;
  descricao: string;
  // Qualificação
  qualified: boolean;
  qualificationReason: string;
  // Telemetria WhatsApp (opcional)
  waAberto: boolean;
  waOpenedAt: string;
  waOpenMethod: string; // "automatic" | "manual" | ""
};


export type LeadCreateResult = {
  ok: boolean;
  created?: boolean;
  updated?: boolean;
  id: string;
  status: LeadStatus;
};

// Normaliza qualquer formato aceito para "DDDNNNNNNNNN" (10 ou 11 dígitos), sem o 55.
export function normalizePhone(v: string): string {
  let d = (v || "").replace(/\D/g, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) {
    d = d.slice(2);
  }
  return d;
}

export function detectOrigem(input: {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  pageUrl?: string;
}): LeadOrigem {
  const src = (input.utm_source || "").toLowerCase();
  const med = (input.utm_medium || "").toLowerCase();
  const url = (input.pageUrl || "").toLowerCase();

  if (src.includes("google") || med.includes("cpc") || med.includes("ppc") || url.includes("gclid=")) return "Google Ads";
  if (src.includes("facebook") || src.includes("meta") || src.includes("instagram") || src.includes("ig") || url.includes("fbclid=")) return "Meta Ads";
  if (src.includes("qr") || (input.utm_campaign || "").toLowerCase().includes("qr")) return "QR Code";
  if (!src && !med) return "Site Orgânico";
  return "Outro";
}

/** Ações administrativas — Server Function valida sessão + papel admin. */
async function postAdmin(body: Record<string, unknown>): Promise<any> {
  return sheetPost(body);
}

/** Ações públicas (criação de lead) — lista branca no servidor. */
async function postPublic(body: Record<string, unknown>): Promise<any> {
  return sheetPublicPost(body);
}

export async function createLeadOnSheet(lead: LeadInput): Promise<LeadCreateResult> {
  const origem = lead.origem ? (lead.origem as LeadOrigem) : detectOrigem(lead);
  const whatsappNormalizado = normalizePhone(lead.whatsapp);
  // NÃO enviamos id, status, createdAt, dataCadastro, horaCadastro — servidor gera.
  const json = await postPublic({
    action: "leadsCreate",
    nome: lead.nome,
    whatsapp: lead.whatsapp,
    whatsappNormalizado,
    dataFesta: lead.dataFesta,
    tema: lead.tema,
    origem,
    utm_source: lead.utm_source || "",
    utm_medium: lead.utm_medium || "",
    utm_campaign: lead.utm_campaign || "",
    utm_content: lead.utm_content || "",
    utm_term: lead.utm_term || "",
    gclid: lead.gclid || "",
    fbclid: lead.fbclid || "",
    modalidade: lead.modalidade || "",
    kit: lead.kit || "",
    modelo: lead.modelo || "",
    imagemReferencia: lead.imagemReferencia || "",
    tipoSolicitacao: lead.tipoSolicitacao || "",
    themeId: lead.themeId || "",
    imageId: lead.imageId || "",
    categoryId: lead.categoryId || "",
    descricao: lead.descricao || "",
    qualified: lead.qualified ? true : false,
    qualificationReason: lead.qualificationReason || "",
    leadStage: lead.leadStage || (lead.qualified ? "QUALIFIED" : "NEW"),
    pageUrl: lead.pageUrl,
    device: lead.device,
    browser: lead.browser,
  });
  return {
    ok: Boolean((json as { ok?: boolean }).ok),
    created: Boolean((json as { created?: boolean }).created),
    updated: Boolean((json as { updated?: boolean }).updated),
    id: String((json as { id?: string }).id ?? ""),
    status: (((json as { status?: string }).status ?? "Novo Lead") as LeadStatus),
  };
}

export async function updateLeadStatusOnSheet(id: string, status: LeadStatus): Promise<void> {
  await postAdmin({ action: "leadsUpdateStatus", id, status });
}

export async function updateLeadStageOnSheet(id: string, leadStage: LeadStage): Promise<void> {
  await postAdmin({ action: "leadsUpdateStage", id, leadStage });
}


// Telemetria opcional: registra que o WhatsApp foi aberto para o lead.
// Falha silenciosa: nunca deve interromper o fluxo do usuário.
export async function markLeadWaOpened(
  id: string,
  method: "automatic" | "manual",
): Promise<void> {
  if (!id) return;
  try {
    await postPublic({
      action: "leadsMarkWaOpened",
      id,
      waOpenMethod: method,
      waOpenedAt: new Date().toISOString(),
    });
  } catch {
    /* telemetria — não interromper o fluxo */
  }
}

export async function deleteLeadOnSheet(id: string): Promise<void> {

  const json = (await postAdmin({ action: "leadsDelete", id })) as {
    ok?: boolean;
    deleted?: boolean;
    error?: string;
  };
  if (!json.ok || !json.deleted) {
    throw new Error(String(json.error || "Falha ao excluir lead"));
  }
}

export async function fetchLeadsFromSheet(): Promise<LeadRecord[]> {
  // POST autenticado — evita expor a listagem por simples GET público.
  const json = await postAdmin({ action: "leadsList" });
  const rows: unknown[] = Array.isArray(json)
    ? (json as unknown[])
    : Array.isArray((json as { data?: unknown[] })?.data)
      ? ((json as { data: unknown[] }).data)
      : [];
  return rows.map((raw): LeadRecord => {
    const r = raw as Record<string, unknown>;
    const createdIso = String(r.createdAt ?? new Date().toISOString());
    const d = new Date(createdIso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    const statusRaw = String(r.status ?? "Novo Lead");
    const status: LeadStatus = LEAD_STATUSES.includes(statusRaw as LeadStatus)
      ? (statusRaw as LeadStatus)
      : "Novo Lead";
    const origemRaw = String(r.origem ?? "Outro");
    const origem: LeadOrigem = LEAD_ORIGENS.includes(origemRaw as LeadOrigem)
      ? (origemRaw as LeadOrigem)
      : "Outro";
    const qualifiedVal = r.qualified === true || String(r.qualified ?? "").toLowerCase() === "true" || r.qualified === 1 || String(r.qualified ?? "") === "1";
    const stageRaw = String(r.leadStage ?? "").toUpperCase();
    const leadStage: LeadStage = LEAD_STAGES.includes(stageRaw as LeadStage)
      ? (stageRaw as LeadStage)
      : (qualifiedVal ? "QUALIFIED" : "NEW");
    return {
      id: String(r.id ?? ""),
      nome: String(r.nome ?? ""),
      whatsapp: String(r.whatsapp ?? ""),
      whatsappNormalizado: String(r.whatsappNormalizado ?? normalizePhone(String(r.whatsapp ?? ""))),
      dataFesta: String(r.dataFesta ?? ""),
      tema: String(r.tema ?? ""),
      status,
      leadStage,
      createdAt: createdIso,
      dataCadastro: String(r.dataCadastro ?? `${dd}/${mm}/${yy}`),
      horaCadastro: String(r.horaCadastro ?? `${hh}:${mi}`),
      ultimaInteracao: String(r.ultimaInteracao ?? createdIso),
      origem,
      utm_source: String(r.utm_source ?? ""),
      utm_medium: String(r.utm_medium ?? ""),
      utm_campaign: String(r.utm_campaign ?? ""),
      utm_content: String(r.utm_content ?? ""),
      utm_term: String(r.utm_term ?? ""),
      pageUrl: String(r.pageUrl ?? ""),
      device: String(r.device ?? ""),
      browser: String(r.browser ?? ""),
      modalidade: String(r.modalidade ?? ""),
      kit: String(r.kit ?? ""),
      modelo: String(r.modelo ?? ""),
      tipoSolicitacao: String(r.tipoSolicitacao ?? ""),
      themeId: String(r.themeId ?? ""),
      imageId: String(r.imageId ?? ""),
      categoryId: String(r.categoryId ?? ""),
      imagemReferencia: String(r.imagemReferencia ?? ""),
      descricao: String(r.descricao ?? ""),
      qualified: qualifiedVal,
      qualificationReason: String(r.qualificationReason ?? ""),
      waAberto: r.waAberto === true || String(r.waAberto ?? "").toLowerCase() === "true" || r.waAberto === 1 || String(r.waAberto ?? "") === "1",
      waOpenedAt: String(r.waOpenedAt ?? ""),
      waOpenMethod: String(r.waOpenMethod ?? ""),
    };

  });
}
