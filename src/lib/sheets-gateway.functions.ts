// ============================================================================
// Gateway seguro Frontend → Server Function → Apps Script → Google Sheets.
// O navegador nunca conhece a URL do Apps Script nem os tokens internos.
// - Ações públicas: lista branca, validação de tamanho e limites básicos.
// - Ações administrativas: token Supabase explícito + papel "admin".
// - Em Codespaces: leitura alternativa somente GET para desenvolvimento.
// ============================================================================

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getServerEnv } from "@/lib/runtime-env.server";

const PUBLIC_POST_ACTIONS = new Set(["create", "leadsCreate", "leadsMarkWaOpened"]);
const PUBLIC_BODY_MAX_BYTES = 24_000;
const PUBLIC_WINDOW_MS = 10 * 60 * 1000;
const PUBLIC_LIMITS: Record<string, number> = {
  create: 6,
  leadsCreate: 12,
  leadsMarkWaOpened: 40,
};

type RateEntry = { count: number; resetAt: number };
const publicRateCache = new Map<string, RateEntry>();

const ADMIN_ROLE_TTL_MS = 15_000;
const adminRoleCache = new Map<string, number>();

async function authenticateAdmin(accessToken: string) {
  const supabaseUrl = getServerEnv("SUPABASE_URL");
  const publishableKey = getServerEnv("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !publishableKey || !accessToken) {
    throw new Error("Não foi possível validar a sessão administrativa.");
  }

  const supabase = createClient<Database>(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(accessToken);
  const userId = String(data?.claims?.sub || "");
  if (error || !userId) throw new Error("Sessão administrativa inválida ou expirada.");

  const now = Date.now();
  const cachedUntil = adminRoleCache.get(userId) ?? 0;
  if (cachedUntil <= now) {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/has_role`, {
      method: "POST",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ _user_id: userId, _role: "admin" }),
    });

    let ok: unknown = false;
    try { ok = await response.json(); } catch { ok = false; }
    if (!response.ok || ok !== true) {
      adminRoleCache.delete(userId);
      throw new Error("Acesso restrito a administradores.");
    }
    adminRoleCache.set(userId, now + ADMIN_ROLE_TTL_MS);
  }

  return { userId, accessToken };
}

function requestIp(): string {
  try {
    const request = getRequest();
    return (
      request?.headers.get("cf-connecting-ip") ||
      request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

function enforcePublicRateLimit(action: string) {
  const now = Date.now();
  const key = `${requestIp()}:${action}`;
  const limit = PUBLIC_LIMITS[action] ?? 10;
  const current = publicRateCache.get(key);
  if (!current || current.resetAt <= now) {
    publicRateCache.set(key, { count: 1, resetAt: now + PUBLIC_WINDOW_MS });
    return;
  }
  if (current.count >= limit) throw new Error("Muitas solicitações. Aguarde alguns minutos e tente novamente.");
  current.count += 1;
}

function cleanPublicBody(body: Record<string, unknown>): Record<string, unknown> {
  const serialized = JSON.stringify(body || {});
  if (new TextEncoder().encode(serialized).length > PUBLIC_BODY_MAX_BYTES) {
    throw new Error("Solicitação maior que o permitido");
  }

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body || {})) {
    if (typeof value === "string") {
      clean[key] = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").slice(0, 4000);
    } else if (typeof value === "number" || typeof value === "boolean" || value == null) {
      clean[key] = value;
    }
  }
  return clean;
}

function withLeadsToken(body: Record<string, unknown>, token: string) {
  const action = String(body.action || "");
  if (action.startsWith("leads")) return { ...body, adminToken: token };
  return body;
}

function isDevReadonlyAllowed() {
  return process.env.CODESPACES === "true" || process.env.NODE_ENV !== "production";
}

/* ------------------------------ Público ------------------------------ */

export const gasPublicPost = createServerFn({ method: "POST" })
  .validator((input: { body: Record<string, unknown> }) => input)
  .handler(async ({ data }) => {
    const action = String(data.body?.action || "");
    if (!PUBLIC_POST_ACTIONS.has(action)) throw new Error("Ação não permitida");
    enforcePublicRateLimit(action);
    const cleanBody = cleanPublicBody(data.body || {});
    const { callGas, leadsAdminToken } = await import("./sheets-endpoint.server");
    const body = withLeadsToken(cleanBody, leadsAdminToken());
    return { text: await callGas({ method: "POST", body }) };
  });

/* --------------------------- Administrativo --------------------------- */

export const gasAdminGet = createServerFn({ method: "POST" })
  .validator((input: { query?: string; accessToken?: string }) => ({
    query: String(input?.query || "").slice(0, 4000),
    accessToken: String(input?.accessToken || "").slice(0, 10000),
  }))
  .handler(async ({ data }) => {
    await authenticateAdmin(data.accessToken);
    const { callGas } = await import("./sheets-endpoint.server");
    return { text: await callGas({ method: "GET", query: data.query }) };
  });

export const gasDevReadonlyGet = createServerFn({ method: "POST" })
  .validator((input: { query?: string }) => ({ query: String(input?.query || "").slice(0, 4000) }))
  .handler(async ({ data }) => {
    if (!isDevReadonlyAllowed()) throw new Error("Leitura de desenvolvimento indisponível em produção");
    const { callGas, gasSharedToken } = await import("./sheets-endpoint.server");
    if (!gasSharedToken()) {
      throw new Error("GAS_SHARED_TOKEN ausente neste Codespace. Libere o secret para o repositório heavenmarketof-ui/lhl-festas e reinicie o Codespace.");
    }
    return { text: await callGas({ method: "GET", query: data.query }) };
  });

export const gasDevConnectionStatus = createServerFn({ method: "POST" })
  .handler(async () => {
    if (!isDevReadonlyAllowed()) return { dev: false, tokenConfigured: false, reachable: false, rows: 0 };
    const { callGas, gasSharedToken } = await import("./sheets-endpoint.server");
    const tokenConfigured = !!gasSharedToken();
    if (!tokenConfigured) return { dev: true, tokenConfigured, reachable: false, rows: 0 };
    try {
      const text = await callGas({ method: "GET", timeoutMs: 12000 });
      const json = JSON.parse(text);
      const rows = Array.isArray(json) ? json.length : Array.isArray(json?.data) ? json.data.length : 0;
      const denied = json?.ok === false || !!json?.error;
      return { dev: true, tokenConfigured, reachable: !denied, rows, error: denied ? String(json?.error || "Acesso negado") : "" };
    } catch (err) {
      return { dev: true, tokenConfigured, reachable: false, rows: 0, error: err instanceof Error ? err.message : "Falha na conexão" };
    }
  });

export const gasAdminPost = createServerFn({ method: "POST" })
  .validator((input: { body: Record<string, unknown>; accessToken?: string }) => ({
    body: input?.body || {},
    accessToken: String(input?.accessToken || "").slice(0, 10000),
  }))
  .handler(async ({ data }) => {
    await authenticateAdmin(data.accessToken);
    const { callGas, leadsAdminToken } = await import("./sheets-endpoint.server");
    const body = withLeadsToken(data.body || {}, leadsAdminToken());
    return { text: await callGas({ method: "POST", body }) };
  });
