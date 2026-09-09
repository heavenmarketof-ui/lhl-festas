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
import { fetchOrdersFromSheet } from "./sheets-api";
import { fetchLancamentos } from "./financeiro-api";
import { resolveLeadVenda } from "./lead-venda";

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

// A ordem abaixo representa o fluxo comercial oficial exibido no CRM.
// Os valores internos permanecem compatíveis com o Apps Script existente.
export const LEAD_STAGES: LeadStage[] = [
  "NEW",
  "CONTACTING",
  "QUALIFIED",
  "NEGOTIATION",
  "CLOSED",
  "LOST",
];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  NEW: "Novo lead",
  CONTACTING: "Em atendimento",
  QUALIFIED: "Orçamento enviado",
  NEGOTIATION: "Negociação",
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
  modalidade?: string;
  kit?: string;
  modelo?: string;
  imagemReferencia?: string;
  origem?: string;
  tipoSolicitacao?: string;
  themeId?: string;
  imageId?: string;
  categoryId?: string;
  descricao?: string;
  qualified?: boolean;
  qualificationReason?: string;
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
  createdAt: string;
  dataCadastro: string;
  horaCadastro: string;
  ultimaInteracao: string;
  origem: LeadOrigem;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  pageUrl: string;
  device: string;
  browser: string;
  modalidade: string;
  kit: string;
  modelo: string;
  tipoSolicitacao: string;
  themeId: string;
  imageId: string;
  categoryId: string;
  imagemReferencia: string;
  descricao: string;
  qualified: boolean;
  qualificationReason: string;
  waAberto: boolean;
  waOpenedAt: string;
  waOpenMethod: string;
};

export type LeadCreateResult = {
  ok: boolean;
  created?: boolean;
  updated?: boolean;
  id: string;
  status: LeadStatus;
};

export function normalizePhone(v: string): string {
  let d = (v || "").replace(/\D/g, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
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

async function postAdmin(body: Record<string, unknown>): Promise<any> {
  return sheetPost(body);
}

async function postPublic(body: Record<string, unknown>): Promise<any> {
  return sheetPublicPost(body);
}

export async function createLeadOnSheet(lead: LeadInput): Promise<LeadCreateResult> {
  const origem = lead.origem ? (lead.origem as LeadOrigem) : detectOrigem(lead);
  const whatsappNormalizado = normalizePhone(lead.whatsapp);
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

async function rawLeadById(id: string): Promise<LeadRecord | null> {
  const json = await postAdmin({ action: "leadsList" });
  const rows = Array.isArray(json) ? json : Array.isArray((json as any)?.data) ? (json as any).data : [];
  const row = rows.find((r: any) => String(r?.id ?? "") === String(id));
  return row ? mapLead(row) : null;
}

async function assertVendaConfirmada(id: string): Promise<void> {
  const [lead, orders, lancamentos] = await Promise.all([
    rawLeadById(id),
    fetchOrdersFromSheet({ force: true }),
    fetchLancamentos({ force: true }),
  ]);
  if (!lead) throw new Error("Lead não encontrado.");
  const venda = resolveLeadVenda(lead, orders, lancamentos);
  if (!venda.confirmada) {
    throw new Error("Este lead só pode ser marcado como Convertido/Fechado após um recebimento real do contrato, normalmente o sinal.");
  }
}

export async function updateLeadStatusOnSheet(id: string, status: LeadStatus): Promise<void> {
  if (status === "Convertido") await assertVendaConfirmada(id);
  await postAdmin({ action: "leadsUpdateStatus", id, status });
}

export async function updateLeadStageOnSheet(id: string, leadStage: LeadStage): Promise<void> {
  if (leadStage === "CLOSED") await assertVendaConfirmada(id);
  await postAdmin({ action: "leadsUpdateStage", id, leadStage });
}

export async function markLeadWhatsAppOpened(id: string, method: "automatic" | "manual"): Promise<void> {
  await postPublic({ action: "leadsMarkWaOpened", id, method });
}

function asBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").toLowerCase().trim();
  return s === "true" || s === "1" || s === "sim" || s === "yes";
}

function mapLead(r: any): LeadRecord {
  return {
    id: String(r.id ?? ""),
    nome: String(r.nome ?? ""),
    whatsapp: String(r.whatsapp ?? ""),
    whatsappNormalizado: String(r.whatsappNormalizado ?? normalizePhone(String(r.whatsapp ?? ""))),
    dataFesta: String(r.dataFesta ?? ""),
    tema: String(r.tema ?? ""),
    status: (String(r.status ?? "Novo Lead") as LeadStatus),
    leadStage: (String(r.leadStage ?? "NEW") as LeadStage),
    createdAt: String(r.createdAt ?? ""),
    dataCadastro: String(r.dataCadastro ?? ""),
    horaCadastro: String(r.horaCadastro ?? ""),
    ultimaInteracao: String(r.ultimaInteracao ?? ""),
    origem: (String(r.origem ?? "Outro") as LeadOrigem),
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
    qualified: asBool(r.qualified),
    qualificationReason: String(r.qualificationReason ?? ""),
    waAberto: asBool(r.waAberto),
    waOpenedAt: String(r.waOpenedAt ?? ""),
    waOpenMethod: String(r.waOpenMethod ?? ""),
  };
}

export async function fetchLeadsFromSheet(): Promise<LeadRecord[]> {
  const json = await postAdmin({ action: "leadsList" });
  const rows = Array.isArray(json) ? json : Array.isArray((json as any)?.data) ? (json as any).data : [];
  const leads = rows.map(mapLead);

  try {
    const [orders, lancamentos] = await Promise.all([
      fetchOrdersFromSheet(),
      fetchLancamentos(),
    ]);
    return leads.map((lead) => {
      const venda = resolveLeadVenda(lead, orders, lancamentos);
      if (venda.confirmada) return { ...lead, status: "Convertido" as LeadStatus, leadStage: "CLOSED" as LeadStage };

      // Corrige apenas a visão operacional: um fechamento manual antigo sem
      // recebimento não deve inflar conversão nem vendas do CRM.
      return {
        ...lead,
        status: lead.status === "Convertido" ? "Em Atendimento" as LeadStatus : lead.status,
        leadStage: lead.leadStage === "CLOSED" ? "NEGOTIATION" as LeadStage : lead.leadStage,
      };
    });
  } catch {
    // Se Financeiro/Contratos estiver temporariamente indisponível, mantém a
    // leitura de Leads em vez de derrubar o CRM inteiro.
    return leads;
  }
}

export async function deleteLeadOnSheet(id: string): Promise<void> {
  await postAdmin({ action: "leadsDelete", id });
}
