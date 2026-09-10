// ============================================================================
// CENTRAL DE SOLICITAÇÕES — escritas com a sessão do próprio administrador
// ----------------------------------------------------------------------------
// Este módulo elimina a dependência de SUPABASE_SERVICE_ROLE_KEY no Worker.
// Toda escrita usa o cliente Supabase autenticado recebido do server function;
// a autorização continua protegida por assertAdmin + RLS no banco.
// ============================================================================

import type {
  Ator,
  Ctx,
  NovaSolicitacaoInput,
} from "./solicitacoes.server";
import {
  TABLE,
  EVENTS,
  sanitize,
  txt,
  numero,
} from "./solicitacoes.server";

type Db = Ctx["supabase"];

export async function logEventoAutenticado(
  db: Db,
  solicitacaoId: string,
  acao: string,
  detalhe: string,
  ator: Ator,
) {
  const { error } = await db.from(EVENTS).insert({
    solicitacao_id: solicitacaoId,
    acao,
    detalhe: detalhe || null,
    ator: ator.userId,
    ator_email: ator.email || null,
  });
  if (error) console.error("[Solicitações] Falha ao registrar auditoria:", error.message || error);
}

export async function criarSolicitacaoServer(
  input: NovaSolicitacaoInput,
  ator: Ator,
  db: Db,
) {
  const row = sanitize(input);
  if (!row.descricao) throw new Error("Informe a descrição da solicitação.");

  if (row.origem_item_id) {
    const { data: existente } = await db
      .from(TABLE)
      .select("id")
      .eq("origem_item_id", row.origem_item_id)
      .in("status", ["pendente", "autorizada", "comprada", "lancada"])
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
    if (row.origem_item_id) {
      const { data: ja } = await db
        .from(TABLE)
        .select("id")
        .eq("origem_item_id", row.origem_item_id)
        .in("status", ["pendente", "autorizada", "comprada", "lancada"])
        .maybeSingle();
      if (ja) return { id: String(ja.id), duplicada: true };
    }
    console.error("[Solicitações] INSERT recusado:", error.message || error);
    throw new Error("Não foi possível criar a solicitação financeira.");
  }

  await logEventoAutenticado(db, String(created.id), "Solicitação criada", row.descricao, ator);
  return { id: String(created.id), duplicada: false };
}

export async function editarSolicitacaoServer(
  input: NovaSolicitacaoInput & { id: string },
  ator: Ator,
  db: Db,
) {
  const id = txt(input?.id, 40);
  if (!id) throw new Error("Solicitação inválida.");

  const { data: atual, error: readError } = await db.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (readError) throw new Error("Não foi possível carregar a solicitação.");
  if (!atual) throw new Error("Solicitação não encontrada.");
  if (atual.status !== "pendente") {
    throw new Error("Somente solicitações pendentes podem ser editadas.");
  }

  const row = sanitize(input);
  if (!row.descricao) throw new Error("Informe a descrição da solicitação.");

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

  await logEventoAutenticado(
    db,
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
  db: Db,
) {
  const id = txt(input?.id, 40);
  const motivo = txt(input?.motivo, 1000);
  if (!id) throw new Error("Solicitação inválida.");
  if (!motivo) throw new Error("O motivo da recusa é obrigatório.");

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

  await logEventoAutenticado(db, id, "Solicitação recusada", motivo, ator);
  return { ok: true };
}

export async function cancelarSolicitacaoServer(
  input: { id: string; motivo?: string },
  ator: Ator,
  db: Db,
) {
  const id = txt(input?.id, 40);
  if (!id) throw new Error("Solicitação inválida.");

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

  await logEventoAutenticado(db, id, "Solicitação cancelada", txt(input?.motivo, 500), ator);
  return { ok: true };
}

export async function autorizarSolicitacaoServer(
  input: { id: string },
  ator: Ator,
  db: Db,
) {
  const id = txt(input?.id, 40);
  if (!id) throw new Error("Solicitação inválida.");

  const { data: atual, error: readError } = await db.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (readError) throw new Error("Não foi possível carregar a solicitação.");
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

  await logEventoAutenticado(
    db,
    id,
    "Compra autorizada",
    `Valor ${Number(rows[0].valor).toFixed(2)} — compra liberada, sem lançamento financeiro`,
    ator,
  );
  return { ok: true, jaAutorizada: false };
}

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
          String(c?.solicitacaoId || "") === String(atual?.id || "") ||
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

export async function revogarAutorizacaoServer(
  input: { id: string },
  ator: Ator,
  db: Db,
) {
  const id = txt(input?.id, 40);
  if (!id) throw new Error("Solicitação inválida.");

  const { data: atual, error: readError } = await db.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (readError) throw new Error("Não foi possível carregar a solicitação.");
  if (!atual) throw new Error("Solicitação não encontrada.");
  if (atual.status !== "autorizada") {
    throw new Error("Somente solicitações autorizadas podem ter a autorização revogada.");
  }
  if (atual.lancamento_id) {
    throw new Error("Não é possível revogar: a compra já foi registrada ou paga.");
  }
  if (await itemDaOPJaComprado(atual)) {
    throw new Error("Não é possível revogar: a compra já foi realizada na Ordem de Produção.");
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

  await logEventoAutenticado(
    db,
    id,
    "Autorização revogada",
    "Compra voltou para o estado pendente por decisão administrativa",
    ator,
  );
  return { ok: true };
}

export async function marcarCompradaSemFinanceiroServer(
  input: { id: string; valorReal?: number | string; fornecedor?: string; dataCompra?: string },
  ator: Ator,
  db: Db,
) {
  const id = txt(input?.id, 40);
  if (!id) throw new Error("Solicitação inválida.");

  const { data: atual, error: readError } = await db.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (readError) throw new Error("Não foi possível carregar a solicitação.");
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
        valorReal > 0
          ? `Valor real da compra: ${valorReal.toFixed(2)} (previsto ${Number(atual.valor || 0).toFixed(2)})`
          : "",
      ]
        .filter(Boolean)
        .join(" · ")
        .slice(0, 2000),
    })
    .eq("id", id)
    .eq("status", "autorizada");
  if (error) throw new Error("Não foi possível atualizar a solicitação.");

  await logEventoAutenticado(
    db,
    id,
    "Compra realizada",
    valorReal > 0
      ? `Compra concluída na operação por ${valorReal.toFixed(2)} — sem lançamento no Fluxo de Caixa`
      : "Compra concluída na operação — sem lançamento no Fluxo de Caixa",
    ator,
  );
  return { ok: true, jaComprada: false };
}
