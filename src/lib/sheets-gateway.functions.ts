// ============================================================================
// Gateway seguro Frontend → Server Function → Apps Script → Google Sheets.
// O navegador nunca conhece a URL do Apps Script nem os tokens.
// - Ações públicas: lista branca mínima (criar contrato de reserva, criar lead).
// - Ações administrativas: exigem sessão Supabase válida + papel "admin".
// - Em Codespaces: leitura alternativa somente GET para desenvolvimento.
// ============================================================================

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PUBLIC_POST_ACTIONS = new Set([
  "create",
  "leadsCreate",
  "leadsMarkWaOpened",
]);

const ADMIN_ROLE_TTL_MS = 15_000;
const adminRoleCache = new Map<string, number>();

async function assertAdmin(context: { supabase: any; userId: string }) {
  const now = Date.now();
  const cachedUntil = adminRoleCache.get(context.userId) ?? 0;
  if (cachedUntil > now) return;

  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || data !== true) {
    adminRoleCache.delete(context.userId);
    throw new Error("Forbidden: acesso restrito a administradores");
  }
  adminRoleCache.set(context.userId, now + ADMIN_ROLE_TTL_MS);
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
  .inputValidator((input: { body: Record<string, unknown> }) => input)
  .handler(async ({ data }) => {
    const action = String(data.body?.action || "");
    if (!PUBLIC_POST_ACTIONS.has(action)) throw new Error("Ação não permitida");
    const { callGas, leadsAdminToken } = await import("./sheets-endpoint.server");
    const body = withLeadsToken(data.body, leadsAdminToken());
    return { text: await callGas({ method: "POST", body }) };
  });

export const gasPublicOrderById = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => ({ id: String(input.id || "").slice(0, 120) }))
  .handler(async ({ data }) => {
    if (!data.id) return { row: null };
    const { callGas } = await import("./sheets-endpoint.server");
    const text = await callGas({ method: "GET" });
    let rows: any[] = [];
    try {
      const json = JSON.parse(text);
      rows = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    } catch { rows = []; }
    return { row: rows.find((r) => String(r?.id ?? "") === data.id) ?? null };
  });

/* --------------------------- Administrativo --------------------------- */

export const gasAdminGet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query?: string }) => ({ query: String(input?.query || "") }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { callGas } = await import("./sheets-endpoint.server");
    return { text: await callGas({ method: "GET", query: data.query }) };
  });

/**
 * Leitura auxiliar EXCLUSIVA de desenvolvimento.
 * Não aceita POST e não altera nenhuma informação.
 */
export const gasDevReadonlyGet = createServerFn({ method: "POST" })
  .inputValidator((input: { query?: string }) => ({ query: String(input?.query || "") }))
  .handler(async ({ data }) => {
    if (!isDevReadonlyAllowed()) throw new Error("Leitura de desenvolvimento indisponível em produção");
    const { callGas, gasSharedToken } = await import("./sheets-endpoint.server");
    if (!gasSharedToken()) {
      throw new Error("GAS_SHARED_TOKEN ausente neste Codespace. Libere o secret para o repositório heavenmarketof-ui/lhl-festas e reinicie o Codespace.");
    }
    return { text: await callGas({ method: "GET", query: data.query }) };
  });

/** Diagnóstico sem expor URL nem segredo. */
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
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { body: Record<string, unknown> }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { callGas, leadsAdminToken } = await import("./sheets-endpoint.server");
    const body = withLeadsToken(data.body || {}, leadsAdminToken());
    return { text: await callGas({ method: "POST", body }) };
  });
