// ============================================================================
// Cliente do gateway seguro (navegador → Server Function → Apps Script).
// Nenhuma URL, token ou segredo trafega/pertence ao bundle do navegador.
// ============================================================================

import {
  gasAdminGet,
  gasAdminPost,
  gasPublicPost,
  gasPublicOrderById,
  gasDevReadonlyGet,
  gasDevConnectionStatus,
} from "./sheets-gateway.functions";

function parse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export function rowsOf(json: any): any[] {
  return Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
}

function adminWriteBlockedInPreview() {
  return import.meta.env.DEV && String(import.meta.env.VITE_ADMIN_WRITES || "").toLowerCase() !== "true";
}

function looksDenied(json: any) {
  return !!json && typeof json === "object" && !Array.isArray(json) && (json.ok === false || !!json.error);
}

function looksEmptyGatewayResponse(json: any) {
  return !!json && typeof json === "object" && !Array.isArray(json) && Object.keys(json).length === 0;
}

/**
 * GET administrativo. Em desenvolvimento, se a leitura autenticada falhar
 * OU vier vazia pelo middleware/gateway, tenta a rota SOMENTE-LEITURA.
 * Nenhum POST é executado por este fluxo.
 */
export async function sheetGet(query = ""): Promise<any> {
  let firstError: unknown;
  try {
    const { text } = await gasAdminGet({ data: { query } });
    const json = parse(text);
    if (!looksDenied(json) && !looksEmptyGatewayResponse(json)) return json;
    firstError = looksDenied(json)
      ? new Error(String(json.error || "Apps Script recusou a leitura"))
      : new Error("Gateway administrativo respondeu vazio");
  } catch (err) {
    firstError = err;
  }

  if (import.meta.env.DEV) {
    const { text } = await gasDevReadonlyGet({ data: { query } });
    const json = parse(text);
    if (looksDenied(json)) throw new Error(String(json.error || "Apps Script recusou a leitura"));
    if (looksEmptyGatewayResponse(json)) throw new Error("Apps Script respondeu sem dados legíveis");
    return json;
  }

  throw firstError instanceof Error ? firstError : new Error("Falha ao consultar o Apps Script");
}

/** Retorna apenas informações de saúde da conexão, nunca URL ou token. */
export async function sheetConnectionStatus() {
  return gasDevConnectionStatus();
}

/** POST administrativo. Bloqueado por padrão em desenvolvimento. */
export async function sheetPost(body: Record<string, unknown>): Promise<any> {
  if (adminWriteBlockedInPreview()) {
    throw new Error("Modo de visualização ativo: alterações estão bloqueadas neste ambiente de desenvolvimento.");
  }
  const { text } = await gasAdminPost({ data: { body } });
  return parse(text);
}

export async function sheetPublicPost(body: Record<string, unknown>): Promise<any> {
  const { text } = await gasPublicPost({ data: { body } });
  return parse(text);
}

export async function sheetPublicOrder(id: string): Promise<any | null> {
  const { row } = await gasPublicOrderById({ data: { id } });
  return row ?? null;
}
