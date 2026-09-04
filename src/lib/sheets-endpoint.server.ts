// ============================================================================
// Endpoint do Google Apps Script — SOMENTE SERVIDOR.
// Arquivos *.server.ts nunca entram no bundle do navegador.
// A URL, o token compartilhado e o token administrativo de Leads ficam aqui
// (ou, preferencialmente, em variáveis de ambiente/secrets do Lovable Cloud).
// ============================================================================

/** URL padrão (fallback) — sobrescrita por process.env.GAS_ENDPOINT_URL. */
const DEFAULT_GAS_URL =
  "https://script.google.com/macros/s/AKfycbyRqbCLoOJ7rm1RbntzTN1l0qgc1s16htI9wcd5zKQpZntslh0XYHkTNzz3qad5mubR/exec";

export function gasUrl(): string {
  return process.env.GAS_ENDPOINT_URL || DEFAULT_GAS_URL;
}

/** Segredo compartilhado servidor ↔ Apps Script (Script Properties: GAS_SHARED_TOKEN). */
export function gasSharedToken(): string {
  // .trim() evita falha silenciosa quando o valor foi colado com espaço/quebra de linha.
  return (process.env.GAS_SHARED_TOKEN || "").trim();
}


/** Token administrativo legado do módulo de Leads (Script Properties: LEADS_ADMIN_TOKEN). */
export function leadsAdminToken(): string {
  return process.env.GAS_LEADS_ADMIN_TOKEN || "lhl-leads-2026-admin";
}

type GasRequest = {
  method: "GET" | "POST";
  /** query string para GET, ex.: "action=opList" */
  query?: string;
  /** corpo JSON para POST */
  body?: Record<string, unknown>;
  timeoutMs?: number;
};

/** Chama o Apps Script a partir do servidor e devolve o texto bruto da resposta. */
export async function callGas(req: GasRequest): Promise<string> {
  const token = gasSharedToken();
  const base = gasUrl();
  const timeout = req.timeoutMs ?? 20000;
  // Rótulo de log seguro: só a action/rota, nunca o token ou dados pessoais.
  const label =
    req.method === "GET"
      ? `GET ${new URLSearchParams(req.query || "").get("action") || "orders"}`
      : `POST ${String((req.body || {}).action || "?")}`;

  const attempts = 2;
  let lastErr: unknown;

  for (let i = 1; i <= attempts; i++) {
    const started = Date.now();
    try {
      let res: Response;
      if (req.method === "GET") {
        const params = new URLSearchParams(req.query || "");
        if (token) params.set("gasToken", token);
        const url = params.toString() ? `${base}?${params.toString()}` : base;
        res = await fetch(url, {
          method: "GET",
          cache: "no-store",
          redirect: "follow",
          signal: AbortSignal.timeout(timeout),
        });
      } else {
        // O token vai no corpo JSON (body.gasToken) E na query string, porque o
        // /exec do Apps Script pode redirecionar e perder o corpo da requisição.
        const payload = token ? { ...(req.body || {}), gasToken: token } : { ...(req.body || {}) };
        const postUrl = token ? `${base}?gasToken=${encodeURIComponent(token)}` : base;
        res = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
          redirect: "follow",
          signal: AbortSignal.timeout(timeout),
        });
      }
      if (!res.ok) throw new Error(`Planilha respondeu ${res.status}`);
      const text = await res.text();
      console.info(`[gas] ${label} ok em ${Date.now() - started}ms (${text.length} bytes)`);
      return text;
    } catch (err) {
      lastErr = err;
      console.warn(
        `[gas] ${label} falhou (tentativa ${i}/${attempts}) em ${Date.now() - started}ms:`,
        err instanceof Error ? err.message : "erro desconhecido",
      );
      // Não repete escritas: um POST pode ter sido aplicado antes do timeout.
      if (req.method !== "GET" || i === attempts) break;
      await new Promise((r) => setTimeout(r, 500 * i));
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("Falha ao consultar a planilha");
}

