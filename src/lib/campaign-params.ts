// Helpers para preservar parâmetros de campanha (UTM/gclid/fbclid) entre
// as páginas públicas do site oficial da LHL Festas.

export const CATALOG_URL = "/catalogo";

export const CAMPAIGN_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
] as const;

export type CampaignKey = (typeof CAMPAIGN_KEYS)[number];
export type CampaignParams = Partial<Record<CampaignKey, string>>;

const STORAGE_KEY = "lhl_campaign_params";
const MAX_VALUE_LENGTH = 300;

function isBrowser() {
  return typeof window !== "undefined";
}

function cleanValue(value: unknown): string {
  return String(value ?? "").trim().slice(0, MAX_VALUE_LENGTH);
}

/** Mantém somente chaves oficiais e valores não vazios. */
export function sanitizeCampaignParams(input: unknown): CampaignParams {
  if (!input || typeof input !== "object") return {};
  const raw = input as Record<string, unknown>;
  const out: CampaignParams = {};
  for (const key of CAMPAIGN_KEYS) {
    const value = cleanValue(raw[key]);
    if (value) out[key] = value;
  }
  return out;
}

/** Mescla preservando valores anteriores quando a navegação atual não informa a chave. */
export function mergeCampaignParams(
  stored: CampaignParams,
  current: Partial<Record<string, unknown>>,
): CampaignParams {
  const out = sanitizeCampaignParams(stored);
  for (const key of CAMPAIGN_KEYS) {
    const value = cleanValue(current[key]);
    if (value) out[key] = value;
  }
  return out;
}

function readStored(): CampaignParams {
  if (!isBrowser()) return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return sanitizeCampaignParams(JSON.parse(raw));
  } catch {
    return {};
  }
}

/** Lê parâmetros da URL atual, mescla com o que já estiver salvo em
 * sessionStorage e persiste novamente. Retorna o objeto mesclado. */
export function readAndPersistCampaignParams(): CampaignParams {
  if (!isBrowser()) return {};
  const stored = readStored();
  const url = new URLSearchParams(window.location.search);
  const current: Record<string, string> = {};
  for (const key of CAMPAIGN_KEYS) {
    const value = url.get(key);
    if (value) current[key] = value;
  }
  const merged = mergeCampaignParams(stored, current);
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch { /* noop */ }
  return merged;
}

export function getCampaignParams(): CampaignParams {
  return readStored();
}

/** Anexa os parâmetros de campanha (não vazios) a uma URL base. */
export function appendCampaignParams(baseUrl: string, extra: Record<string, string> = {}): string {
  const params = readAndPersistCampaignParams();
  const merged: Record<string, string> = { ...params, ...extra };
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v && String(v).trim()) qs.set(k, String(v));
  }
  const sep = baseUrl.includes("?") ? "&" : "?";
  const s = qs.toString();
  return s ? `${baseUrl}${sep}${s}` : baseUrl;
}

/** URL do catálogo interno com UTMs e origem preservados. */
export function buildCatalogUrl(origem: string): string {
  return appendCampaignParams(CATALOG_URL, { origem });
}

/** URL de retorno ao catálogo interno preservando a modalidade escolhida. */
export function buildCatalogReturnUrl(opts: { modalidade?: string; personalizado?: boolean } = {}): string {
  const extra: Record<string, string> = {};
  const mod = (opts.modalidade || "").toLowerCase();
  if (mod.includes("mesa")) extra.m = "festa_na_mesa";
  else if (mod.includes("peg")) extra.m = "peg_monte";
  const base = appendCampaignParams(CATALOG_URL, extra);
  return opts.personalizado ? `${base}#tema-personalizado` : base;
}

/** Validação segura de URLs de imagem vindas do catálogo. */
export function isSafeImageUrl(u: string | null | undefined): boolean {
  if (!u) return false;
  try {
    const parsed = new URL(u);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}
