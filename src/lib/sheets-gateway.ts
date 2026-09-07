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

/**
 * GET administrativo. Em desenvolvimento, se a leitura autenticada falhar,
 * tenta a rota SOMENTE-LEITURA do servidor. Nenhum POST é executado.
 */
export async function sheetGet(query = ""): Promise<any> {
  let firstError: unknown;
  try {
    const { text } = await gasAdminGet({ data: { query } });
    const json = parse(text);
    if (!looksDenied(json)) return json;
    firstError = new Error(String(json.error || "Apps Script recusou a leitura"));
  } catch (err) {
    firstError = err;
  }

  if (import.meta.env.DEV) {
    const { text } = await gasDevReadonlyGet({ data: { query } });
    const json = parse(text);
    if (looksDenied(json)) throw new Error(String(json.error || "Apps Script recusou a leitura"));
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
