// ============================================================================
// Cliente do gateway seguro (navegador → Server Function → Apps Script).
// Nenhuma URL, token ou segredo trafega/pertence ao bundle do navegador.
// ============================================================================

import {
  gasAdminGet,
  gasAdminPost,
  gasPublicPost,
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

const READONLY_ADMIN_POST_ACTIONS = new Set([
  "leadsList",
]);

function looksDenied(json: any) {
  return !!json && typeof json === "object" && !Array.isArray(json) && (json.ok === false || !!json.error);
}

function looksEmptyGatewayResponse(json: any) {
  return !!json && typeof json === "object" && !Array.isArray(json) && Object.keys(json).length === 0;
}

function validateReadJson(json: any) {
  if (looksDenied(json)) throw new Error(String(json.error || "Apps Script recusou a leitura"));
  if (looksEmptyGatewayResponse(json)) throw new Error("Apps Script respondeu sem dados legíveis");
  return json;
}

function validateWriteJson(json: any) {
  if (looksDenied(json)) throw new Error(String(json.error || "Solicitação recusada"));
  if (looksEmptyGatewayResponse(json)) throw new Error("Servidor respondeu sem confirmar a gravação");
  return json;
}

export async function sheetGet(query = ""): Promise<any> {
  if (import.meta.env.DEV) {
    const { text } = await gasDevReadonlyGet({ data: { query } });
    return validateReadJson(parse(text));
  }

  const { text } = await gasAdminGet({ data: { query } });
  return validateReadJson(parse(text));
}

export async function sheetConnectionStatus() {
  return gasDevConnectionStatus();
}

export async function sheetPost(body: Record<string, unknown>): Promise<any> {
  const action = String(body.action || "");
  const readonlyAction = READONLY_ADMIN_POST_ACTIONS.has(action);
  if (adminWriteBlockedInPreview() && !readonlyAction) {
    throw new Error("Modo de visualização ativo: alterações estão bloqueadas neste ambiente de desenvolvimento.");
  }
  const { text } = await gasAdminPost({ data: { body } });
  const json = parse(text);
  return readonlyAction ? validateReadJson(json) : validateWriteJson(json);
}

export async function sheetPublicPost(body: Record<string, unknown>): Promise<any> {
  const { text } = await gasPublicPost({ data: { body } });
  return validateWriteJson(parse(text));
}
