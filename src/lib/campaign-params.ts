// Helpers para preservar parâmetros de campanha (UTM/gclid/fbclid) entre
// o site principal, o catálogo externo e o formulário de orçamento.

export const CATALOG_URL = "https://catalogo-lhlfestas.lovable.app/";

export const CAMPAIGN_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
] as const;

export type CampaignParams = Partial<Record<(typeof CAMPAIGN_KEYS)[number], string>>;

const STORAGE_KEY = "lhl_campaign_params";

function isBrowser() {
  return typeof window !== "undefined";
}

/** Lê parâmetros da URL atual, mescla com o que já estiver salvo em
 *  sessionStorage e persiste novamente. Retorna o objeto mesclado. */
export function readAndPersistCampaignParams(): CampaignParams {
  if (!isBrowser()) return {};
  let stored: CampaignParams = {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) stored = JSON.parse(raw) as CampaignParams;
  } catch { /* noop */ }

  const url = new URLSearchParams(window.location.search);
  const merged: CampaignParams = { ...stored };
  for (const k of CAMPAIGN_KEYS) {
    const v = url.get(k);
    if (v) merged[k] = v;
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch { /* noop */ }
  return merged;
}

export function getCampaignParams(): CampaignParams {
  if (!isBrowser()) return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CampaignParams;
  } catch { /* noop */ }
  return {};
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

/** URL do catálogo com UTMs e origem preservados. */
export function buildCatalogUrl(origem: string): string {
  return appendCampaignParams(CATALOG_URL, { origem });
}

/** URL de retorno ao catálogo preservando modalidade e (opcional) âncora. */
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
