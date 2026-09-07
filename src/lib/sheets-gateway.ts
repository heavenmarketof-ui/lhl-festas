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

// Algumas consultas legadas do Apps Script usam POST embora sejam 100% leitura.
// Elas continuam liberadas no modo visualização; qualquer mutation permanece bloqueada.
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

/**
 * GET administrativo.
 *
 * No Codespaces/Vite usamos PRIMEIRO a função somente-leitura do servidor.
 * Isso evita que a validação de sessão/admin do ambiente de preview impeça a
 * visualização dos dados reais. A função de desenvolvimento aceita apenas GET
 * e continua usando GAS_SHARED_TOKEN no servidor; nenhuma escrita é possível.
 *
 * Em produção usamos exclusivamente o gateway administrativo autenticado.
 */
export async function sheetGet(query = ""): Promise<any> {
  if (import.meta.env.DEV) {
    const { text } = await gasDevReadonlyGet({ data: { query } });
    return validateReadJson(parse(text));
  }

  const { text } = await gasAdminGet({ data: { query } });
  return validateReadJson(parse(text));
}

/** Retorna apenas informações de saúde da conexão, nunca URL ou token. */
export async function sheetConnectionStatus() {
  return gasDevConnectionStatus();
}

/**
 * POST administrativo.
 * Em preview, mutations ficam bloqueadas. Ações explicitamente classificadas
 * como leitura podem passar para permitir validar o CRM com dados reais.
 */
export async function sheetPost(body: Record<string, unknown>): Promise<any> {
  const action = String(body.action || "");
  const readonlyAction = READONLY_ADMIN_POST_ACTIONS.has(action);
  if (adminWriteBlockedInPreview() && !readonlyAction) {
    throw new Error("Modo de visualização ativo: alterações estão bloqueadas neste ambiente de desenvolvimento.");
  }
  const { text } = await gasAdminPost({ data: { body } });
  const json = parse(text);
  return readonlyAction ? validateReadJson(json) : json;
}

export async function sheetPublicPost(body: Record<string, unknown>): Promise<any> {
  const { text } = await gasPublicPost({ data: { body } });
  return parse(text);
}

export async function sheetPublicOrder(id: string): Promise<any | null> {
  const { row } = await gasPublicOrderById({ data: { id } });
  return row ?? null;
}
