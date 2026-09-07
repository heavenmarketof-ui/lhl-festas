import type { StoredOrder } from "./orders-storage";
import type { Solicitacao } from "./solicitacoes-types";
import { toDateISO } from "./date-utils";

export type SolicitacaoContextoFesta = {
  cliente: string;
  tema: string;
  modalidade: string;
  plano: string;
  retirada: string;
  festa: string;
};

/**
 * Contexto visual da solicitação derivado sempre do contrato atual.
 * Cliente/tema/data não são duplicados na solicitação financeira; assim uma
 * correção no contrato aparece automaticamente na fila administrativa.
 */
export function contextoFestaDaSolicitacao(
  solicitacao: Solicitacao,
  order?: StoredOrder | null,
): SolicitacaoContextoFesta {
  return {
    cliente: String(order?.nome || solicitacao.pedidoCliente || "—"),
    tema: String(order?.details?.tema || "").trim() || "Tema não informado",
    modalidade: String(order?.modalidade || "").trim(),
    plano: String(order?.plano || "").trim(),
    retirada: toDateISO(order?.details?.dataRetirada) || "",
    festa: toDateISO(order?.details?.dataEvento) || "",
  };
}

/** Texto único para pesquisa da Central de Solicitações. */
export function textoPesquisaSolicitacao(
  solicitacao: Solicitacao,
  contexto: SolicitacaoContextoFesta,
): string {
  return [
    solicitacao.descricao,
    solicitacao.fornecedor,
    solicitacao.categoria,
    solicitacao.observacoes,
    contexto.cliente,
    contexto.tema,
    contexto.modalidade,
    contexto.plano,
    contexto.retirada,
    contexto.festa,
    solicitacao.pedidoCliente,
    solicitacao.pedidoId,
    solicitacao.ordemProducao,
    solicitacao.criadoPorEmail,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Linha curta usada na fila e nos cards móveis. */
export function resumoFestaDaSolicitacao(contexto: SolicitacaoContextoFesta): string {
  return [contexto.tema, contexto.modalidade, contexto.plano]
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .join(" · ");
}

/**
 * Identifica se a solicitação está ligada a uma festa real do sistema.
 * Solicitações manuais sem contrato continuam válidas, mas não recebem
 * contexto inventado de cliente/tema/data.
 */
export function temContextoDeContrato(
  solicitacao: Solicitacao,
  order?: StoredOrder | null,
): boolean {
  return Boolean(order?.id || String(solicitacao.pedidoId || "").trim());
}
