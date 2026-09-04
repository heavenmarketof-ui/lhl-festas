// ============================================================================
// Parcelas de boleto — camada RPC fina. Lógica em ./parcelas.server.ts.
// ============================================================================

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ParcelaInput, ParcelaStatus } from "./parcelas.server";

export const listarParcelasFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { contratoId?: string }) => input || {})
  .handler(async ({ data, context }) => {
    const m = await import("./parcelas.server");
    return m.listarParcelasServer(context as any, data.contratoId);
  });

export const salvarParcelasFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { contratoId: string; contratoCliente?: string; parcelas: ParcelaInput[] }) => input,
  )
  .handler(async ({ data, context }) => {
    const m = await import("./parcelas.server");
    return m.salvarParcelasServer(context as any, data);
  });

export const atualizarStatusParcelaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: ParcelaStatus; observacoes?: string }) => input)
  .handler(async ({ data, context }) => {
    const m = await import("./parcelas.server");
    return m.atualizarStatusParcelaServer(context as any, data);
  });

export const registrarPagamentoParcelaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; valorPago?: number; lancamentoId: string }) => input)
  .handler(async ({ data, context }) => {
    const m = await import("./parcelas.server");
    return m.registrarPagamentoParcelaServer(context as any, data);
  });

export const listarParcelasPublicoFn = createServerFn({ method: "GET" })
  .inputValidator((input: { contratoId: string }) => input)
  .handler(async ({ data }) => {
    const m = await import("./parcelas.server");
    return m.listarParcelasPublicoServer(String(data.contratoId || ""));
  });
