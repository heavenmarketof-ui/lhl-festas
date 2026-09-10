// ============================================================================
// Central de Solicitações Financeiras — server functions (camada RPC fina).
// Escritas usam o cliente Supabase autenticado do próprio administrador.
// ============================================================================

import { createServerFn } from "@tanstack/react-start";
import type { NovaSolicitacaoInput } from "./solicitacoes.server";

type AuthData<T extends Record<string, unknown>> = T & { _accessToken: string };

async function auth<T extends Record<string, unknown>>(data: AuthData<T>) {
  const authModule = await import("./admin-action-auth.server");
  const context = await authModule.contextFromAdminAccessToken(data._accessToken);
  const clean = authModule.stripAccessToken(data) as T;
  const base = await import("./solicitacoes.server");
  const ator = await base.assertAdmin(context as any);
  return { ator, clean, db: context.supabase };
}

export const criarSolicitacaoFn = createServerFn({ method: "POST" })
  .validator((input: AuthData<NovaSolicitacaoInput & Record<string, unknown>>) => input)
  .handler(async ({ data }) => {
    const { ator, clean, db } = await auth(data);
    const m = await import("./solicitacoes-authenticated.server");
    return m.criarSolicitacaoServer(clean as NovaSolicitacaoInput, ator, db);
  });

export const editarSolicitacaoFn = createServerFn({ method: "POST" })
  .validator((input: AuthData<NovaSolicitacaoInput & { id: string } & Record<string, unknown>>) => input)
  .handler(async ({ data }) => {
    const { ator, clean, db } = await auth(data);
    const m = await import("./solicitacoes-authenticated.server");
    return m.editarSolicitacaoServer(clean as NovaSolicitacaoInput & { id: string }, ator, db);
  });

export const autorizarSolicitacaoFn = createServerFn({ method: "POST" })
  .validator((input: AuthData<{ id: string }>) => input)
  .handler(async ({ data }) => {
    const { ator, clean, db } = await auth(data);
    const m = await import("./solicitacoes-authenticated.server");
    return m.autorizarSolicitacaoServer(clean, ator, db);
  });

export const revogarAutorizacaoFn = createServerFn({ method: "POST" })
  .validator((input: AuthData<{ id: string }>) => input)
  .handler(async ({ data }) => {
    const { ator, clean, db } = await auth(data);
    const m = await import("./solicitacoes-authenticated.server");
    return m.revogarAutorizacaoServer(clean, ator, db);
  });

/** Reconciliação de STATUS: compra realizada, sem lançamento financeiro. */
export const marcarCompradaSemFinanceiroFn = createServerFn({ method: "POST" })
  .validator((input: AuthData<{ id: string; valorReal?: number | string; fornecedor?: string; dataCompra?: string }>) => input)
  .handler(async ({ data }) => {
    const { ator, clean, db } = await auth(data);
    const m = await import("./solicitacoes-authenticated.server");
    return m.marcarCompradaSemFinanceiroServer(clean, ator, db);
  });

/** Pagamento: encerra a solicitação apenas após confirmar a saída financeira. */
export const registrarPagamentoSolicitacaoFn = createServerFn({ method: "POST" })
  .validator((input: AuthData<import("./solicitacoes.server").PagamentoInput & Record<string, unknown>>) => input)
  .handler(async ({ data }) => {
    const { ator, clean, db } = await auth(data);
    const safe = await import("./solicitacoes-pagamento-auth.server");
    return safe.registrarPagamentoSeguroServer(
      clean as import("./solicitacoes.server").PagamentoInput,
      ator,
      db,
    );
  });

export const recusarSolicitacaoFn = createServerFn({ method: "POST" })
  .validator((input: AuthData<{ id: string; motivo: string }>) => input)
  .handler(async ({ data }) => {
    const { ator, clean, db } = await auth(data);
    const m = await import("./solicitacoes-authenticated.server");
    return m.recusarSolicitacaoServer(clean, ator, db);
  });

export const cancelarSolicitacaoFn = createServerFn({ method: "POST" })
  .validator((input: AuthData<{ id: string; motivo?: string }>) => input)
  .handler(async ({ data }) => {
    const { ator, clean, db } = await auth(data);
    const m = await import("./solicitacoes-authenticated.server");
    return m.cancelarSolicitacaoServer(clean, ator, db);
  });
