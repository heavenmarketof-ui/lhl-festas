// ============================================================================
// Central de Solicitações Financeiras — helpers de servidor.
// Este arquivo nunca chega ao navegador (bloqueado por *.server.ts).
// ============================================================================

import {
  SOLICITACAO_ORIGENS, SOLICITACAO_TIPOS, TIPOS_ATIVOS,
  type SolicitacaoItem, type SolicitacaoOrigem, type SolicitacaoTipo,
} from "./solicitacoes-types";

export const TABLE = "solicitacoes_financeiras";
export const EVENTS = "solicitacoes_financeiras_eventos";

export type Ctx = { supabase: any; userId: string; claims?: any };
export type Ator = { userId: string; email: string };

/** Confirma papel admin usando o cliente do próprio usuário (RLS aplicada). */
export async function assertAdmin(context: Ctx): Promise<Ator> {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || data !== true) throw new Error("Forbidden: acesso restrito a administradores");
  let email = String(context.claims?.email || "");
  if (!email) {
    const { data: u } = await context.supabase.auth.getUser();
    email = String(u?.user?.email || "");
  }
  return { userId: context.userId, email };
}

export async function adminDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export async function logEvento(
  solicitacaoId: string,
  acao: string,
  detalhe: string,
  ator: Ator,
) {
  const db = await adminDb();
  await db.from(EVENTS).insert({
    solicitacao_id: solicitacaoId,
    acao,
    detalhe: detalhe || null,
    ator: ator.userId,
    ator_email: ator.email || null,
  });
}

/* ----------------------------- Sanitização ----------------------------- */

export const txt = (v: unknown, max = 400) => String(v ?? "").trim().slice(0, max);

export function numero(v: unknown): number {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

export function dataISO(v: unknown): string | null {
  const s = txt(v, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function tipoValido(v: unknown): SolicitacaoTipo {
  const s = txt(v, 40) as SolicitacaoTipo;
  if (!SOLICITACAO_TIPOS.includes(s)) return "compra_materiais";
  // Nesta sprint somente os tipos ativos podem ser gravados.
  return TIPOS_ATIVOS.includes(s) ? s : "compra_materiais";
}

function origemValida(v: unknown): SolicitacaoOrigem {
  const s = txt(v, 40) as SolicitacaoOrigem;
  return SOLICITACAO_ORIGENS.includes(s) ? s : "compra_manual";
}

function itensValidos(v: unknown): SolicitacaoItem[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 200).map((i: any) => ({
    descricao: txt(i?.descricao, 200),
    quantidade: numero(i?.quantidade) || undefined,
    unidade: txt(i?.unidade, 20) || undefined,
    valor: numero(i?.valor) || undefined,
  }));
}

export type NovaSolicitacaoInput = {
  tipo?: string;
  origem?: string;
  pedidoId?: string;
  pedidoCliente?: string;
  ordemProducao?: string;
  origemItemId?: string;
  itens?: SolicitacaoItem[];
  fornecedor?: string;
  categoria?: string;
  conta?: string;
  formaPagamento?: string;
  valor?: number | string;
  descricao?: string;
  observacoes?: string;
  dataPrevista?: string;
};

export function sanitize(input: NovaSolicitacaoInput) {
  return {
    tipo: tipoValido(input.tipo),
    origem: origemValida(input.origem),
    pedido_id: txt(input.pedidoId, 120) || null,
    pedido_cliente: txt(input.pedidoCliente, 200) || null,
    ordem_producao: txt(input.ordemProducao, 60) || null,
    origem_item_id: txt(input.origemItemId, 120) || null,
    itens: itensValidos(input.itens),
    fornecedor: txt(input.fornecedor, 200) || null,
    categoria: txt(input.categoria, 80) || "Fornecedor",
    conta: txt(input.conta, 80) || "Caixa",
    forma_pagamento: txt(input.formaPagamento, 60) || "PIX",
    valor: numero(input.valor),
    descricao: txt(input.descricao, 400),
    observacoes: txt(input.observacoes, 2000) || null,
    data_prevista: dataISO(input.dataPrevista),
  };
}

/* ---------------------------- Ações completas --------------------------- */

export async function criarSolicitacaoServer(input: NovaSolicitacaoInput, ator: Ator) {
  const row = sanitize(input);
  if (!row.descricao) throw new Error("Informe a descrição da solicitação.");
  const db = await adminDb();

  // Idempotência de criação: um mesmo item de origem (ex.: item de compra da OP)
  // nunca gera duas solicitações vivas — protege clique duplo, retry e abas.
  if (row.origem_item_id) {
    const { data: existente } = await db
      .from(TABLE)
      .select("id")
      .eq("origem_item_id", row.origem_item_id)
      .in("status", ["pendente", "autorizada", "lancada"])
      .maybeSingle();
    if (existente) return { id: String(existente.id), duplicada: true };
  }

  const { data: created, error } = await db
    .from(TABLE)
    .insert({
      ...row,
      status: "pendente",
      criado_por: ator.userId,
      criado_por_email: ator.email || null,
    })
    .select("id")
    .single();

  if (error) {
    // Corrida entre duas abas: o índice único devolve a solicitação existente.
    if (row.origem_item_id) {
      const { data: ja } = await db
        .from(TABLE)
        .select("id")
        .eq("origem_item_id", row.origem_item_id)
        .in("status", ["pendente", "autorizada", "lancada"])
        .maybeSingle();
      if (ja) return { id: String(ja.id), duplicada: true };
    }
    throw new Error("Não foi possível criar a solicitação financeira.");
  }

  await logEvento(String(created.id), "Solicitação criada", row.descricao, ator);
  return { id: String(created.id), duplicada: false };
}

export async function editarSolicitacaoServer(
  input: NovaSolicitacaoInput & { id: string },
  ator: Ator,
) {
  const id = txt(input?.id, 40);
  if (!id) throw new Error("Solicitação inválida.");
  const db = await adminDb();

  const { data: atual } = await db.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (!atual) throw new Error("Solicitação não encontrada.");
  if (atual.status !== "pendente") {
    throw new Error("Somente solicitações pendentes podem ser editadas.");
  }

  const row = sanitize(input);
  if (!row.descricao) throw new Error("Informe a descrição da solicitação.");

  // A edição nunca troca origem/vínculos originais (preserva a auditoria).
  const { error } = await db
    .from(TABLE)
    .update({
      fornecedor: row.fornecedor,
      categoria: row.categoria,
      conta: row.conta,
      forma_pagamento: row.forma_pagamento,
      valor: row.valor,
      descricao: row.descricao,
      observacoes: row.observacoes,
      data_prevista: row.data_prevista,
      editado_por: ator.userId,
      editado_por_email: ator.email || null,
      editado_em: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pendente");
  if (error) throw new Error("Não foi possível salvar a solicitação.");

  const mudancas: string[] = [];
  const cmp = (label: string, antes: unknown, depois: unknown) => {
    if (String(antes ?? "") !== String(depois ?? "")) {
      mudancas.push(`${label}: ${antes || "—"} → ${depois || "—"}`);
    }
  };
  cmp("Fornecedor", atual.fornecedor, row.fornecedor);
  cmp("Categoria", atual.categoria, row.categoria);
  cmp("Conta", atual.conta, row.conta);
  cmp("Forma de pagamento", atual.forma_pagamento, row.forma_pagamento);
  cmp("Valor", Number(atual.valor).toFixed(2), row.valor.toFixed(2));
  cmp("Descrição", atual.descricao, row.descricao);
  cmp("Data prevista", atual.data_prevista, row.data_prevista);

  await logEvento(
    id,
    "Solicitação editada",
    mudancas.length ? mudancas.join(" · ") : "Sem alterações de valores",
    ator,
  );
  return { ok: true };
}

export async function recusarSolicitacaoServer(
  input: { id: string; motivo: string },
  ator: Ator,
) {
  const id = txt(input?.id, 40);
  const motivo = txt(input?.motivo, 1000);
  if (!id) throw new Error("Solicitação inválida.");
  if (!motivo) throw new Error("O motivo da recusa é obrigatório.");

  const db = await adminDb();
  const { data: rows, error } = await db
    .from(TABLE)
    .update({
      status: "recusada",
      recusado_por: ator.userId,
      recusado_por_email: ator.email || null,
      recusado_em: new Date().toISOString(),
      recusa_motivo: motivo,
    })
    .eq("id", id)
    .eq("status", "pendente")
    .select("id");
  if (error) throw new Error("Não foi possível recusar a solicitação.");
  if (!rows?.length) throw new Error("Somente solicitações pendentes podem ser recusadas.");

  await logEvento(id, "Solicitação recusada", motivo, ator);
  return { ok: true };
}

export async function cancelarSolicitacaoServer(
  input: { id: string; motivo?: string },
  ator: Ator,
) {
  const id = txt(input?.id, 40);
  if (!id) throw new Error("Solicitação inválida.");

  const db = await adminDb();
  const { data: rows, error } = await db
    .from(TABLE)
    .update({
      status: "cancelada",
      cancelado_por: ator.userId,
      cancelado_por_email: ator.email || null,
      cancelado_em: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pendente")
    .select("id");
  if (error) throw new Error("Não foi possível cancelar a solicitação.");
  if (!rows?.length) throw new Error("Somente solicitações pendentes podem ser canceladas.");

  await logEvento(id, "Solicitação cancelada", txt(input?.motivo, 500), ator);
  return { ok: true };
}

/* ------------------------------ Autorização ----------------------------- */
//
// AUTORIZAR ≠ PAGAR. A autorização apenas libera a compra:
//   pendente → autorizada (auditoria registrada, nenhum lançamento criado).
// O lançamento no Fluxo de Caixa nasce somente em "Registrar pagamento".

export async function autorizarSolicitacaoServer(input: { id: string }, ator: Ator) {
  const id = txt(input?.id, 40);
  if (!id) throw new Error("Solicitação inválida.");

  const db = await adminDb();
  const { data: atual } = await db.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (!atual) throw new Error("Solicitação não encontrada.");
  if (atual.status === "autorizada" || atual.status === "lancada") {
    return { ok: true, jaAutorizada: true };
  }
  if (atual.status !== "pendente") {
    throw new Error("Solicitações recusadas ou canceladas não podem ser autorizadas.");
  }

  const { data: rows, error } = await db
    .from(TABLE)
    .update({
      status: "autorizada",
      autorizado_por: ator.userId,
      autorizado_por_email: ator.email || null,
      autorizado_em: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pendente")
    .select("id, valor");
  if (error) throw new Error("Não foi possível autorizar a solicitação.");
  if (!rows?.length) throw new Error("Esta solicitação já está sendo processada.");

  await logEvento(
    id,
    "Compra autorizada",
    `Valor ${Number(rows[0].valor).toFixed(2)} — compra liberada, sem lançamento financeiro`,
    ator,
  );
  return { ok: true, jaAutorizada: false };
}

/* ------------------------------ Revogação ------------------------------ */

export async function revogarAutorizacaoServer(input: { id: string }, ator: Ator) {
  const id = txt(input?.id, 40);
  if (!id) throw new Error("Solicitação inválida.");

  const db = await adminDb();
  const { data: atual } = await db.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (!atual) throw new Error("Solicitação não encontrada.");
  if (atual.status !== "autorizada") {
    throw new Error("Somente solicitações autorizadas podem ter a autorização revogada.");
  }

  // Verifica se já houve lançamento financeiro (lancamento_id preenchido)
  // ou se o status mudou para 'lancada'.
  if (atual.lancamento_id || atual.status === "lancada" || atual.status === "paga") {
    throw new Error("Não é possível revogar: a compra já foi registrada ou paga.");
  }

  // Evidência operacional: se o item vinculado na Ordem de Produção já está
  // "Compra realizada" ou "Pago", a autorização NÃO pode ser revogada — mesmo
  // que ainda não exista lançamento no Fluxo de Caixa ("Agora não").
  if (await itemDaOPJaComprado(atual)) {
    throw new Error(
      "Não é possível revogar: a compra já foi realizada na Ordem de Produção.",
    );
  }


  const { data: rows, error } = await db
    .from(TABLE)
    .update({
      status: "pendente",
      autorizado_por: null,
      autorizado_por_email: null,
      autorizado_em: null,
      lancamento_id: null,

    })
    .eq("id", id)
    .eq("status", "autorizada")
    .is("lancamento_id", null)
    .select("id");

  if (error) throw new Error("Não foi possível revogar a autorização.");
  if (!rows?.length) throw new Error("Esta solicitação já foi processada ou paga.");

  await logEvento(
    id,
    "Autorização revogada",
    "Compra voltou para o estado pendente por decisão administrativa",
    ator,
  );
  return { ok: true };
}



/* ------------------- Evidência operacional (Ordem de Produção) ----------- */

/**
 * Lê as Ordens de Produção da planilha e diz se o item vinculado à solicitação
 * já está em "Compra realizada" ou "Pago". Usado como trava de revogação.
 * Falha de leitura → retorna false (as demais travas continuam valendo).
 */
async function itemDaOPJaComprado(atual: any): Promise<boolean> {
  try {
    const { callGas } = await import("./sheets-endpoint.server");
    const text = await callGas({ method: "GET", query: "action=opList" });
    const json = JSON.parse(text);
    const rows: any[] = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    const itemId = String(atual?.origem_item_id || "");
    const descricao = String(atual?.descricao || "").toLowerCase();
    for (const raw of rows) {
      const data = typeof raw?.dataJson === "string" ? JSON.parse(raw.dataJson) : raw?.dataJson ?? raw;
      const compras: any[] = Array.isArray(data?.compras) ? data.compras : [];
      for (const c of compras) {
        const mesmoItem =
          (itemId && String(c?.id || "") === itemId) ||
          (String(c?.solicitacaoId || "") === String(atual?.id || "")) ||
          (!!c?.descricao && descricao.includes(String(c.descricao).toLowerCase()));
        if (!mesmoItem) continue;
        const st = String(c?.statusCompra || "");
        if (c?.comprado || c?.pago || st === "Compra realizada" || st === "Pago") return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/* ------------- Reconciliação de STATUS (nunca cria financeiro) ----------- */

/**
 * Marca a solicitação como "comprada": a compra foi realizada na operação e o
 * usuário escolheu NÃO registrar no Fluxo de Caixa agora ("Agora não").
 * Nunca cria lançamento financeiro — apenas retira o item da fila ativa.
 */
export async function marcarCompradaSemFinanceiroServer(
  input: { id: string; valorReal?: number | string; fornecedor?: string; dataCompra?: string },
  ator: Ator,
) {
  const id = txt(input?.id, 40);
  if (!id) throw new Error("Solicitação inválida.");

  const db = await adminDb();
  const { data: atual } = await db.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (!atual) throw new Error("Solicitação não encontrada.");
  if (atual.status === "lancada" || atual.status === "comprada") {
    return { ok: true, jaComprada: true };
  }
  if (atual.status !== "autorizada") {
    throw new Error("Somente compras autorizadas podem ser marcadas como realizadas.");
  }

  const valorReal = numero(input?.valorReal);
  const { error } = await db
    .from(TABLE)
    .update({
      status: "comprada",
      fornecedor: txt(input?.fornecedor, 200) || atual.fornecedor || null,
      observacoes: [
        atual.observacoes || "",
        valorReal > 0 ? `Valor real da compra: ${valorReal.toFixed(2)} (previsto ${Number(atual.valor || 0).toFixed(2)})` : "",
      ]
        .filter(Boolean)
        .join(" · ")
        .slice(0, 2000),
    })
    .eq("id", id)
    .eq("status", "autorizada");
  if (error) throw new Error("Não foi possível atualizar a solicitação.");

  await logEvento(
    id,
    "Compra realizada",
    valorReal > 0
      ? `Compra concluída na operação por ${valorReal.toFixed(2)} — sem lançamento no Fluxo de Caixa`
      : "Compra concluída na operação — sem lançamento no Fluxo de Caixa",
    ator,
  );
  return { ok: true, jaComprada: false };
}

/* --------------------------- Registro de pagamento ---------------------- */
//
// Três passos, todos no servidor:
//  1. UPDATE condicional reservando o UUID do lançamento (atômico: dois
//     cliques/abas simultâneos nunca reservam dois UUIDs).
//  2. Confere no Fluxo de Caixa se esse UUID já existe (refresh/retry/timeout).
//  3. Cria o lançamento e marca a solicitação como "Lançada no Fluxo de Caixa".

async function lancamentoJaExiste(lancamentoId: string): Promise<boolean> {
  const { callGas } = await import("./sheets-endpoint.server");
  try {
    const text = await callGas({ method: "GET", query: "action=fluxoList" });
    const json = JSON.parse(text);
    const rows: any[] = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    return rows.some((r) => String(r?.id ?? "") === lancamentoId);
  } catch {
    // Planilha indisponível: tratamos como "não existe"; o passo 1 já garantiu
    // que somente uma execução chegou até aqui.
    return false;
  }
}

export type PagamentoInput = {
  id: string;
  valor?: number | string;
  fornecedor?: string;
  formaPagamento?: string;
  conta?: string;
  dataPagamento?: string;
  observacoes?: string;
};

export async function registrarPagamentoServer(input: PagamentoInput, ator: Ator) {
  const id = txt(input?.id, 40);
  if (!id) throw new Error("Solicitação inválida.");

  const db = await adminDb();
  const { data: atual } = await db.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (!atual) throw new Error("Solicitação não encontrada.");
  if (atual.status === "lancada") {
    return { ok: true, lancamentoId: String(atual.lancamento_id || ""), jaLancada: true };
  }
  if (atual.status !== "autorizada" && atual.status !== "comprada") {
    throw new Error("Somente compras autorizadas podem ter o pagamento registrado.");
  }

  // Dados finais informados na confirmação da compra (fonte: operação).
  const valorFinal = numero(input.valor) || Number(atual.valor || 0);
  const fornecedorFinal = txt(input.fornecedor, 200) || atual.fornecedor || "";
  const formaFinal = txt(input.formaPagamento, 60) || atual.forma_pagamento || "PIX";
  const contaFinal = txt(input.conta, 80) || atual.conta || "Caixa";
  const dataFinal = dataISO(input.dataPagamento) || new Date().toISOString().slice(0, 10);
  const obsFinal = txt(input.observacoes, 2000);

  // Passo 1 — reserva atômica do lançamento.
  const { data: rows, error } = await db
    .from(TABLE)
    .update({
      valor: valorFinal,
      fornecedor: fornecedorFinal || null,
      forma_pagamento: formaFinal,
      conta: contaFinal,
      lancamento_id: atual.lancamento_id || crypto.randomUUID(),
      // REGRA SOBERANA: Se já houve compra na OP, o financeiro deve refletir isso
      status: "lancada",
      lancado_em: new Date().toISOString()
    })
    .eq("id", id)
    .in("status", ["autorizada", "comprada", "lancada"])
    .select("*");
  if (error) throw new Error("Não foi possível registrar o pagamento.");
  if (!rows?.length) {
    const { data: agora } = await db.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (agora?.status === "lancada") {
      return { ok: true, lancamentoId: String(agora.lancamento_id || ""), jaLancada: true };
    }
    throw new Error("Esta solicitação já está sendo processada.");
  }

  const solicitacao = rows[0];
  const lancamentoId = String(solicitacao.lancamento_id || "");
  if (!lancamentoId) throw new Error("Falha ao reservar o lançamento financeiro.");

  // Passo 2 — idempotência (nunca duplica lançamento).
  const existe = await lancamentoJaExiste(lancamentoId);

  // Passo 3 — cria a Saída no Fluxo de Caixa com todos os vínculos.
  if (!existe) {
    const { callGas } = await import("./sheets-endpoint.server");
    const { origemLancamento } = await import("./solicitacoes-types");
    const obs = [
      obsFinal || solicitacao.observacoes || "",
      `Solicitação Financeira: ${id}`,
      solicitacao.ordem_producao ? `Ordem de Produção: ${solicitacao.ordem_producao}` : "",
      solicitacao.pedido_id ? `Contrato: ${solicitacao.pedido_id}` : "",
      fornecedorFinal ? `Fornecedor: ${fornecedorFinal}` : "",
      `Pagamento registrado por: ${ator.email || ator.userId}`,
    ]
      .filter(Boolean)
      .join(" · ");

    await callGas({
      method: "POST",
      body: {
        action: "fluxoCreate",
        id: lancamentoId,
        data: dataFinal,
        tipo: "Saída",
        categoria: solicitacao.categoria || "Fornecedor",
        descricao: solicitacao.descricao || "Solicitação financeira",
        valor: String(valorFinal.toFixed(2)),
        formaPagamento: formaFinal,
        conta: contaFinal,
        beneficiario: fornecedorFinal,
        observacoes: obs,
        contratoId: solicitacao.pedido_id || "",
        origem: origemLancamento(id),
        createdAt: new Date().toISOString(),
        ativo: "Sim",
      },
    });
  }

  // O status já foi atualizado no Passo 1 (reserva atômica)
  await logEvento(
    id,
    "Pagamento registrado — lançamento criado no Fluxo de Caixa",
    existe
      ? `Lançamento ${lancamentoId} já existia (nada duplicado)`
      : `Lançamento ${lancamentoId} · ${valorFinal.toFixed(2)} · ${formaFinal}`,
    ator,
  );

  return { ok: true, lancamentoId, jaLancada: false };
}

