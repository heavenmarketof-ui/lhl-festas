// ============================================================================
// Central de Solicitações Financeiras — API do cliente.
// Leituras: direto no banco (RLS permite apenas administradores).
// Escritas: sempre via server functions (auditoria e validação no servidor).
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import { withAdminAccessToken } from "./admin-action-auth";
import {
  criarSolicitacaoFn, editarSolicitacaoFn, autorizarSolicitacaoFn,
  recusarSolicitacaoFn, cancelarSolicitacaoFn, registrarPagamentoSolicitacaoFn,
  revogarAutorizacaoFn, marcarCompradaSemFinanceiroFn,
} from "./solicitacoes.functions";

import {
  type Solicitacao, type SolicitacaoEvento, type SolicitacaoItem,
  type SolicitacaoOrigem, type SolicitacaoStatus, type SolicitacaoTipo,
} from "./solicitacoes-types";

const TABLE = "solicitacoes_financeiras";
const EVENTS = "solicitacoes_financeiras_eventos";

function parse(r: any): Solicitacao {
  return {
    id: String(r.id),
    tipo: String(r.tipo || "compra_materiais") as SolicitacaoTipo,
    origem: String(r.origem || "compra_manual") as SolicitacaoOrigem,
    status: String(r.status || "pendente") as SolicitacaoStatus,
    pedidoId: String(r.pedido_id || ""),
    pedidoCliente: String(r.pedido_cliente || ""),
    ordemProducao: String(r.ordem_producao || ""),
    origemItemId: String(r.origem_item_id || ""),
    itens: Array.isArray(r.itens) ? (r.itens as SolicitacaoItem[]) : [],
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

export async function fetchSolicitacoes(): Promise<Solicitacao[]> {
  const { data, error } = await supabase.from(TABLE as any).select("*").order("created_at", { ascending: false }).limit(2000);
  if (error) throw new Error(error.message);
  return (data || []).map(parse);
}

export async function fetchSolicitacao(id: string): Promise<Solicitacao | null> {
  const { data, error } = await supabase.from(TABLE as any).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? parse(data) : null;
}

export async function fetchEventos(id: string): Promise<SolicitacaoEvento[]> {
  const { data, error } = await supabase.from(EVENTS as any).select("*").eq("solicitacao_id", id).order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({ id: String(r.id), acao: String(r.acao || ""), detalhe: String(r.detalhe || ""), atorEmail: String(r.ator_email || ""), createdAt: String(r.created_at || "") }));
}

export async function fetchSolicitacoesPorItem(): Promise<Record<string, Solicitacao>> {
  const list = await fetchSolicitacoes();
  const map: Record<string, Solicitacao> = {};
  for (const s of list) if (s.origemItemId && !map[s.origemItemId]) map[s.origemItemId] = s;
  return map;
}

export type NovaSolicitacao = {
  tipo?: SolicitacaoTipo; origem?: SolicitacaoOrigem; pedidoId?: string; pedidoCliente?: string;
  ordemProducao?: string; origemItemId?: string; itens?: SolicitacaoItem[]; fornecedor?: string;
  categoria?: string; conta?: string; formaPagamento?: string; valor?: number | string;
  descricao?: string; observacoes?: string; dataPrevista?: string;
};

export async function criarSolicitacao(input: NovaSolicitacao) {
  return criarSolicitacaoFn({ data: await withAdminAccessToken(input as Record<string, unknown>) } as any);
}

export async function editarSolicitacao(input: NovaSolicitacao & { id: string }) {
  return editarSolicitacaoFn({ data: await withAdminAccessToken(input as Record<string, unknown>) } as any);
}

export async function autorizarSolicitacao(id: string) {
  return autorizarSolicitacaoFn({ data: await withAdminAccessToken({ id }) } as any);
}

export type PagamentoSolicitacao = {
  id: string; valor?: number | string; fornecedor?: string; formaPagamento?: string;
  conta?: string; dataPagamento?: string; observacoes?: string;
};

export async function registrarPagamentoSolicitacao(input: PagamentoSolicitacao) {
  return registrarPagamentoSolicitacaoFn({ data: await withAdminAccessToken(input as Record<string, unknown>) } as any);
}

export async function recusarSolicitacao(id: string, motivo: string) {
  return recusarSolicitacaoFn({ data: await withAdminAccessToken({ id, motivo }) } as any);
}

export async function cancelarSolicitacao(id: string, motivo?: string) {
  return cancelarSolicitacaoFn({ data: await withAdminAccessToken({ id, motivo }) } as any);
}

export async function marcarCompradaSemFinanceiro(input: { id: string; valorReal?: number | string; fornecedor?: string; dataCompra?: string }) {
  return marcarCompradaSemFinanceiroFn({ data: await withAdminAccessToken(input as Record<string, unknown>) } as any);
}

export async function revogarAutorizacao(id: string) {
  return revogarAutorizacaoFn({ data: await withAdminAccessToken({ id }) } as any);
}

export type ResultadoLote = {
  concluidas: { id: string; descricao: string }[];
  falhas: { id: string; descricao: string; erro: string }[];
};

export async function executarEmLote(itens: Solicitacao[], acao: (s: Solicitacao) => Promise<unknown>): Promise<ResultadoLote> {
  const out: ResultadoLote = { concluidas: [], falhas: [] };
  for (const s of itens) {
    try {
      await acao(s);
      out.concluidas.push({ id: s.id, descricao: s.descricao });
    } catch (e) {
      out.falhas.push({ id: s.id, descricao: s.descricao, erro: e instanceof Error ? e.message : "Erro desconhecido" });
    }
  }
  return out;
}
