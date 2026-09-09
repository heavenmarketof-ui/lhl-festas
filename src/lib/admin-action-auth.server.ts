import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getServerEnv } from "./runtime-env.server";

export type AdminFunctionContext = {
  supabase: ReturnType<typeof createClient<Database>>;
  userId: string;
  claims: Record<string, unknown>;
  accessToken: string;
};

/**
 * Valida o JWT vindo da sessão do painel e devolve um cliente Supabase atuando
 * como o próprio usuário. A checagem específica de papel admin continua sendo
 * feita por cada domínio (ex.: assertAdmin), preservando RLS e auditoria.
 */
export async function contextFromAdminAccessToken(accessToken: unknown): Promise<AdminFunctionContext> {
  const token = String(accessToken || "").trim();
  if (!token) throw new Error("Unauthorized: sessão administrativa ausente");

  const url = getServerEnv("SUPABASE_URL");
  const key = getServerEnv("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) throw new Error("Configuração de autenticação administrativa indisponível no servidor.");

  const supabase = createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  const claims = (data?.claims || {}) as Record<string, unknown>;
  const userId = String(claims.sub || "");
  if (error || !userId) throw new Error("Unauthorized: sessão administrativa inválida ou expirada");

  return { supabase, userId, claims, accessToken: token };
}

export function stripAccessToken<T extends Record<string, unknown>>(data: T): Omit<T, "_accessToken"> {
  const { _accessToken: _ignored, ...clean } = data;
  return clean;
}
