import * as base from "./solicitacoes-api";
import { fetchOrdersFromSheet } from "./sheets-api";
import { fetchOrdens, type OrdemProducao } from "./producao-api";
import { mudarEtapaCompra } from "./compras-flow";
import { itensAprovacaoSemSolicitacao } from "./solicitacoes-reconciliacao";
import { withAdminAccessToken } from "./admin-action-auth";
import { listarSolicitacoesFn } from "./solicitacoes-list.functions";
import type { Solicitacao } from "./solicitacoes-types";

export * from "./solicitacoes-api";

let reparoEmCurso: Promise<void> | null = null;

function parse(r: any): Solicitacao {
  return {
    id: String(r.id),
    tipo: String(r.tipo || "compra_materiais") as Solicitacao["tipo"],
    origem: String(r.origem || "compra_manual") as Solicitacao["origem"],
    status: String(r.status || "pendente") as Solicitacao["status"],
    pedidoId: String(r.pedido_id || ""),
    pedidoCliente: String(r.pedido_cliente || ""),
    ordemProducao: String(r.ordem_producao || ""),
    origemItemId: String(r.origem_item_id || ""),
    itens: Array.isArray(r.itens) ? r.itens : [],
    fornecedor: String(r.fornecedor || ""),
    categoria: String(r.categoria || ""),
    conta: String(r.conta || ""),
    formaPagamento: String(r.forma_pagamento || ""),
    valor: Number(r.valor || 0),
    descricao: String(r.descricao || ""),
    observacoes: String(r.observacoes || ""),
    dataPrevista: String(r.data_prevista || ""),
    criadoPorEmail: String(r.criado_por_email || ""),
    editadoPorEmail: String(r.editado_por_email || ""),
    editadoEm: String(r.editado_em || ""),
    autorizadoPorEmail: String(r.autorizado_por_email || ""),
    autorizadoEm: String(r.autorizado_em || ""),
    recusadoPorEmail: String(r.recusado_por_email || ""),
    recusadoEm: String(r.recusado_em || ""),
    recusaMotivo: String(r.recusa_motivo || ""),
    canceladoPorEmail: String(r.cancelado_por_email || ""),
    canceladoEm: String(r.cancelado_em || ""),
    lancamentoId: String(r.lancamento_id || ""),
    lancadoEm: String(r.lancado_em || ""),
    createdAt: String(r.created_at || ""),
    updatedAt: String(r.updated_at || ""),
  };
}

async function listarSolicitacoesSeguro(): Promise<Solicitacao[]> {
  const auth = await withAdminAccessToken({});
  const rows = await Promise.race([
    listarSolicitacoesFn({ data: auth as any } as any),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("A Central de Solicitações demorou demais para responder.")), 12000)),
  ]);
  return (Array.isArray(rows) ? rows : []).map(parse);
}

async function reconciliarSolicitacoesFaltantes(): Promise<void> {
  if (reparoEmCurso) return reparoEmCurso;

  reparoEmCurso = (async () => {
    try {
      const [orders, ordens] = await Promise.all([
        fetchOrdersFromSheet(),
        fetchOrdens(),
      ]);

      const orderById = new Map(orders.map((order) => [order.id, order]));

      for (const opOriginal of ordens) {
        const order = orderById.get(opOriginal.contratoId);
        if (!order) continue;

        let opAtual: OrdemProducao = opOriginal;
        const faltantes = itensAprovacaoSemSolicitacao(order, opAtual);

        for (const item of faltantes) {
          try {
            const resultado = await mudarEtapaCompra({
              op: opAtual,
              itemId: item.id,
              status: "Aguardando autorização",
              order,
            });
            opAtual = resultado.op;
          } catch (error) {
            console.error("[Solicitações] Falha ao reconciliar item enviado para aprovação:", error);
          }
        }
      }
    } catch (error) {
      console.error("[Solicitações] Falha ao reconciliar solicitações financeiras:", error);
    }
  })().finally(() => {
    reparoEmCurso = null;
  });

  return reparoEmCurso;
}

export async function fetchSolicitacoes(): Promise<Solicitacao[]> {
  // A Central deve abrir primeiro. A reconciliação é reparo de consistência e
  // nunca pode bloquear a listagem principal.
  const atuais = await listarSolicitacoesSeguro();
  void reconciliarSolicitacoesFaltantes();
  return atuais;
}

// Mantém os demais métodos no módulo-base; somente a listagem principal é soberana.
void base;
