// ============================================================================
// Central de Solicitações Financeiras — server functions (camada RPC fina).
// Toda a lógica vive em ./solicitacoes.server.ts.
// ============================================================================

import { createServerFn } from "@tanstack/react-start";
import type { NovaSolicitacaoInput } from "./solicitacoes.server";

type AuthData<T extends Record<string, unknown>> = T & { _accessToken: string };

async function auth<T extends Record<string, unknown>>(data: AuthData<T>) {
  const authModule = await import("./admin-action-auth.server");
  const context = await authModule.contextFromAdminAccessToken(data._accessToken);
  const clean = authModule.stripAccessToken(data) as T;
  const m = await import("./solicitacoes.server");
  const ator = await m.assertAdmin(context as any);
  return { m, ator, clean };
}

export const criarSolicitacaoFn = createServerFn({ method: "POST" })
  .validator((input: AuthData<NovaSolicitacaoInput & Record<string, unknown>>) => input)
  .handler(async ({ data }) => {
    const { m, ator, clean } = await auth(data);
    return m.criarSolicitacaoServer(clean as NovaSolicitacaoInput, ator);
  });

export const editarSolicitacaoFn = createServerFn({ method: "POST" })
  .validator((input: AuthData<NovaSolicitacaoInput & { id: string } & Record<string, unknown>>) => input)
  .handler(async ({ data }) => {
    const { m, ator, clean } = await auth(data);
    return m.editarSolicitacaoServer(clean as NovaSolicitacaoInput & { id: string }, ator);
  });

export const autorizarSolicitacaoFn = createServerFn({ method: "POST" })
  .validator((input: AuthData<{ id: string }>) => input)
  .handler(async ({ data }) => {
    const { m, ator, clean } = await auth(data);
    return m.autorizarSolicitacaoServer(clean, ator);
  });

export const revogarAutorizacaoFn = createServerFn({ method: "POST" })
  .validator((input: AuthData<{ id: string }>) => input)
  .handler(async ({ data }) => {
    const { m, ator, clean } = await auth(data);
    return m.revogarAutorizacaoServer(clean, ator);
  });

/** Reconciliação de STATUS: compra realizada, sem lançamento financeiro. */
export const marcarCompradaSemFinanceiroFn = createServerFn({ method: "POST" })
  .validator((input: AuthData<{ id: string; valorReal?: number | string; fornecedor?: string; dataCompra?: string }>) => input)
  .handler(async ({ data }) => {
    const { m, ator, clean } = await auth(data);
    return m.marcarCompradaSemFinanceiroServer(clean, ator);
  });

/** Pagamento: encerra a solicitação apenas após confirmar a saída financeira. */
export const registrarPagamentoSolicitacaoFn = createServerFn({ method: "POST" })
  .validator((input: AuthData<import("./solicitacoes.server").PagamentoInput & Record<string, unknown>>) => input)
  .handler(async ({ data }) => {
    const { m, ator, clean } = await auth(data);
    void m;
    const safe = await import("./solicitacoes-pagamento-safe.server");
    return safe.registrarPagamentoSeguroServer(clean as import("./solicitacoes.server").PagamentoInput, ator);
  });

export const recusarSolicitacaoFn = createServerFn({ method: "POST" })
  .validator((input: AuthData<{ id: string; motivo: string }>) => input)
  .handler(async ({ data }) => {
    const { m, ator, clean } = await auth(data);
    return m.recusarSolicitacaoServer(clean, ator);
  });

export const cancelarSolicitacaoFn = createServerFn({ method: "POST" })
  .validator((input: AuthData<{ id: string; motivo?: string }>) => input)
  .handler(async ({ data }) => {
    const { m, ator, clean } = await auth(data);
    return m.cancelarSolicitacaoServer(clean, ator);
  });
