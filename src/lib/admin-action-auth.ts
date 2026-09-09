import { supabase } from "@/integrations/supabase/client";

/**
 * Acrescenta o JWT da sessão administrativa aos dados enviados para Server Functions.
 * O login do painel vive no navegador (Supabase Auth/localStorage), portanto esse
 * token precisa viajar explicitamente: Server Functions não recebem automaticamente
 * o Authorization header da sessão do supabase-js.
 */
export async function withAdminAccessToken<T extends Record<string, unknown>>(data: T): Promise<T & { _accessToken: string }> {
  const { data: sessionData, error } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token || "";
  if (error || !token) throw new Error("Sua sessão administrativa expirou. Entre novamente no painel.");
  return { ...data, _accessToken: token };
}
