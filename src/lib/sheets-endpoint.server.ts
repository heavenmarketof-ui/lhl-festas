// ============================================================================
// Endpoint do Google Apps Script — SOMENTE SERVIDOR.
// Nenhum endpoint ou token privado deve ficar fixo no código do projeto.
// ============================================================================

import { getServerEnv } from "./runtime-env.server";

export function gasUrl(): string {
  const value = getServerEnv("GAS_ENDPOINT_URL");
  if (!value) {
    throw new Error("GAS_ENDPOINT_URL não configurado no ambiente do servidor.");
  }
  return value;
}

/** Segredo compartilhado servidor ↔ Apps Script (Script Properties: GAS_SHARED_TOKEN). */
export function gasSharedToken(): string {
  return getServerEnv("GAS_SHARED_TOKEN");
}

/** Token administrativo do módulo de Leads. Nunca usar fallback fixo no código. */
export function leadsAdminToken(): string {
  return getServerEnv("GAS_LEADS_ADMIN_TOKEN");
}

type GasRequest = {
  method: "GET" | "POST";
  query?: string;
  body?: Record<string, unknown>;
  timeoutMs?: number;
};

export async function callGas(req: GasRequest): Promise<string> {
  const token = gasSharedToken();
  const base = gasUrl();
  const timeout = req.timeoutMs ?? 90000;
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
      if (req.method !== "GET" || i === attempts) break;
      await new Promise((r) => setTimeout(r, 500 * i));
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("Falha ao consultar a planilha");
}
