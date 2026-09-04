// ============================================================================
// Central de Solicitações Financeiras — server functions (camada RPC fina).
// Toda a lógica vive em ./solicitacoes.server.ts.
// ============================================================================

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { NovaSolicitacaoInput } from "./solicitacoes.server";

export const criarSolicitacaoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: NovaSolicitacaoInput) => input || {})
  .handler(async ({ data, context }) => {
    const m = await import("./solicitacoes.server");
    const ator = await m.assertAdmin(context as any);
    return m.criarSolicitacaoServer(data, ator);
  });

export const editarSolicitacaoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: NovaSolicitacaoInput & { id: string }) => input)
  .handler(async ({ data, context }) => {
    const m = await import("./solicitacoes.server");
    const ator = await m.assertAdmin(context as any);
    return m.editarSolicitacaoServer(data, ator);
  });

export const autorizarSolicitacaoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const m = await import("./solicitacoes.server");
    const ator = await m.assertAdmin(context as any);
    return m.autorizarSolicitacaoServer(data, ator);
  });

export const revogarAutorizacaoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const m = await import("./solicitacoes.server");
    const ator = await m.assertAdmin(context as any);
    return m.revogarAutorizacaoServer(data, ator);
  });


/** Reconciliação de STATUS: compra realizada, sem lançamento financeiro. */
export const marcarCompradaSemFinanceiroFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; valorReal?: number | string; fornecedor?: string; dataCompra?: string }) => input)
  .handler(async ({ data, context }) => {
    const m = await import("./solicitacoes.server");
    const ator = await m.assertAdmin(context as any);
    return m.marcarCompradaSemFinanceiroServer(data, ator);
  });

/** Pagamento: única porta que cria o lançamento no Fluxo de Caixa. */
export const registrarPagamentoSolicitacaoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: import("./solicitacoes.server").PagamentoInput) => input)
  .handler(async ({ data, context }) => {
    const m = await import("./solicitacoes.server");
    const ator = await m.assertAdmin(context as any);
    return m.registrarPagamentoServer(data, ator);
  });


export const recusarSolicitacaoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; motivo: string }) => input)
  .handler(async ({ data, context }) => {
    const m = await import("./solicitacoes.server");
    const ator = await m.assertAdmin(context as any);
    return m.recusarSolicitacaoServer(data, ator);
  });

export const cancelarSolicitacaoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; motivo?: string }) => input)
  .handler(async ({ data, context }) => {
    const m = await import("./solicitacoes.server");
    const ator = await m.assertAdmin(context as any);
    return m.cancelarSolicitacaoServer(data, ator);
  });
