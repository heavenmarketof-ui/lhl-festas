// ============================================================================
// Cliente do gateway seguro (navegador → Server Function → Apps Script).
// Nenhuma URL, token ou segredo trafega/pertence ao bundle do navegador.
// ============================================================================

import {
  gasAdminGet,
  gasAdminPost,
  gasPublicPost,
  gasPublicOrderById,
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

/** GET administrativo (exige sessão + papel admin). `query` ex.: "action=opList". */
export async function sheetGet(query = ""): Promise<any> {
  const { text } = await gasAdminGet({ data: { query } });
  return parse(text);
}

/** POST administrativo (exige sessão + papel admin). */
export async function sheetPost(body: Record<string, unknown>): Promise<any> {
  const { text } = await gasAdminPost({ data: { body } });
  return parse(text);
}

/** POST público — apenas ações da lista branca no servidor. */
export async function sheetPublicPost(body: Record<string, unknown>): Promise<any> {
  const { text } = await gasPublicPost({ data: { body } });
  return parse(text);
}

/** Busca pública de um único contrato pelo id (link do cliente). */
export async function sheetPublicOrder(id: string): Promise<any | null> {
  const { row } = await gasPublicOrderById({ data: { id } });
  return row ?? null;
}
