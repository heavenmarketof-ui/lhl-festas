// ============================================================================
// Gateway seguro Frontend → Server Function → Apps Script → Google Sheets.
// O navegador nunca conhece a URL do Apps Script nem os tokens.
// - Ações públicas: lista branca mínima (criar contrato de reserva, criar lead).
// - Ações administrativas: exigem sessão Supabase válida + papel "admin".
// ============================================================================

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Ações POST liberadas para visitantes não autenticados (site público). */
const PUBLIC_POST_ACTIONS = new Set([
  "create", // reserva → contrato
  "leadsCreate", // orçamento / consultora → lead
  "leadsMarkWaOpened", // telemetria de abertura do WhatsApp
]);

// Uma mesma tela administrativa pode abrir 4–6 leituras ao mesmo tempo.
// A sessão continua sendo validada em TODA chamada pelo middleware, mas evitamos
// repetir o RPC de papel "admin" várias vezes no mesmo instante.
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

/** Injeta o token administrativo de Leads nas ações que o Apps Script exige. */
function withLeadsToken(body: Record<string, unknown>, token: string) {
  const action = String(body.action || "");
  if (action.startsWith("leads")) return { ...body, adminToken: token };
  return body;
}

/* ------------------------------ Público ------------------------------ */

export const gasPublicPost = createServerFn({ method: "POST" })
  .inputValidator((input: { body: Record<string, unknown> }) => input)
  .handler(async ({ data }) => {
    const action = String(data.body?.action || "");
    if (!PUBLIC_POST_ACTIONS.has(action)) {
      throw new Error("Ação não permitida");
    }
    const { callGas, leadsAdminToken } = await import("./sheets-endpoint.server");
    const body = withLeadsToken(data.body, leadsAdminToken());
    return { text: await callGas({ method: "POST", body }) };
  });

/** Consulta pública de UM contrato pelo id (link do contrato/checklist do cliente). */
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
    } catch {
      rows = [];
    }
    const row = rows.find((r) => String(r?.id ?? "") === data.id) ?? null;
    return { row };
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

export const gasAdminPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { body: Record<string, unknown> }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { callGas, leadsAdminToken } = await import("./sheets-endpoint.server");
    const body = withLeadsToken(data.body || {}, leadsAdminToken());
    return { text: await callGas({ method: "POST", body }) };
  });
