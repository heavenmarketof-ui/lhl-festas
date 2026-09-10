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

const SHEETS_TIMEOUT_MS = 12000;

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} demorou mais de ${Math.round(SHEETS_TIMEOUT_MS / 1000)}s para responder.`)),
          SHEETS_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

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
    const { text } = await withTimeout(gasDevReadonlyGet({ data: { query } }), "Leitura da planilha");
    return validateReadJson(parse(text));
  }

  const { text } = await withTimeout(gasAdminGet({ data: { query } }), "Leitura da planilha");
  return validateReadJson(parse(text));
}

export async function sheetConnectionStatus() {
  return withTimeout(gasDevConnectionStatus(), "Verificação da planilha");
}

export async function sheetPost(body: Record<string, unknown>): Promise<any> {
  const action = String(body.action || "");
  const readonlyAction = READONLY_ADMIN_POST_ACTIONS.has(action);
  if (adminWriteBlockedInPreview() && !readonlyAction) {
    throw new Error("Modo de visualização ativo: alterações estão bloqueadas neste ambiente de desenvolvimento.");
  }
  const { text } = await withTimeout(gasAdminPost({ data: { body } }), `Ação ${action || "administrativa"}`);
  const json = parse(text);
  return readonlyAction ? validateReadJson(json) : validateWriteJson(json);
}

export async function sheetPublicPost(body: Record<string, unknown>): Promise<any> {
  const { text } = await withTimeout(gasPublicPost({ data: { body } }), "Gravação pública");
  return validateWriteJson(parse(text));
}
