// ============================================================================
// Parcelas de boleto — camada RPC fina. Lógica em ./parcelas.server.ts.
// ============================================================================

import { createServerFn } from "@tanstack/react-start";
import type { ParcelaInput, ParcelaStatus } from "./parcelas.server";

type AuthData<T extends Record<string, unknown>> = T & { _accessToken: string };

async function auth<T extends Record<string, unknown>>(data: AuthData<T>) {
  const m = await import("./admin-action-auth.server");
  const context = await m.contextFromAdminAccessToken(data._accessToken);
  const clean = m.stripAccessToken(data) as T;
  return { context, clean };
}

export const listarParcelasFn = createServerFn({ method: "GET" })
  .validator((input: AuthData<{ contratoId?: string }>) => input)
  .handler(async ({ data }) => {
    const { context, clean } = await auth(data);
    const m = await import("./parcelas.server");
    return m.listarParcelasServer(context as any, clean.contratoId);
  });

export const salvarParcelasFn = createServerFn({ method: "POST" })
  .validator((input: AuthData<{ contratoId: string; contratoCliente?: string; parcelas: ParcelaInput[] }>) => input)
  .handler(async ({ data }) => {
    const { context, clean } = await auth(data);
    const m = await import("./parcelas.server");
    return m.salvarParcelasServer(context as any, clean);
  });

export const atualizarStatusParcelaFn = createServerFn({ method: "POST" })
  .validator((input: AuthData<{ id: string; status: ParcelaStatus; observacoes?: string }>) => input)
  .handler(async ({ data }) => {
    const { context, clean } = await auth(data);
    const m = await import("./parcelas.server");
    return m.atualizarStatusParcelaServer(context as any, clean);
  });

export const registrarPagamentoParcelaFn = createServerFn({ method: "POST" })
  .validator((input: AuthData<{ id: string; valorPago?: number; lancamentoId: string }>) => input)
  .handler(async ({ data }) => {
    const { context, clean } = await auth(data);
    const m = await import("./parcelas.server");
    return m.registrarPagamentoParcelaServer(context as any, clean);
  });

export const listarParcelasPublicoFn = createServerFn({ method: "GET" })
  .validator((input: { contratoId: string }) => input)
  .handler(async ({ data }) => {
    const m = await import("./parcelas.server");
    return m.listarParcelasPublicoServer(String(data.contratoId || ""));
  });
