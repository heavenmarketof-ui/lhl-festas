// ============================================================================
// PAGAMENTO SEGURO DE SOLICITAÇÕES — LHL FESTAS
// ----------------------------------------------------------------------------
// Regra soberana:
// 1) reservar um ID estável para o lançamento;
// 2) criar/confirmar a saída no Fluxo de Caixa;
// 3) só então marcar a solicitação como "lancada".
//
// Se o Apps Script demorar ou o POST terminar em timeout depois de ter sido
// aplicado, verificamos o Fluxo antes de considerar a operação como falha.
// Assim a solicitação nunca some da fila sem que o financeiro esteja garantido.
// ============================================================================

import type { Ator, PagamentoInput } from "./solicitacoes.server";
import { TABLE, adminDb, logEvento, txt, numero, dataISO } from "./solicitacoes.server";
import { callGas } from "./sheets-endpoint.server";
import { origemLancamento } from "./solicitacoes-types";

type FluxoRow = Record<string, unknown>;

function rowsOf(json: unknown): FluxoRow[] {
  if (Array.isArray(json)) return json as FluxoRow[];
  if (json && typeof json === "object" && Array.isArray((json as { data?: unknown[] }).data)) {
    return (json as { data: FluxoRow[] }).data;
  }
  return [];
}

async function fluxoExiste(lancamentoId: string, solicitacaoId: string): Promise<boolean> {
  const text = await callGas({ method: "GET", query: "action=fluxoList", timeoutMs: 90000 });
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return false;
  }

  const origem = origemLancamento(solicitacaoId);
  return rowsOf(json).some((r) =>
    String(r.id ?? "").trim() === lancamentoId ||
    String(r.origem ?? "").trim() === origem,
  );
}

async function confirmarFluxo(lancamentoId: string, solicitacaoId: string): Promise<void> {
  if (!(await fluxoExiste(lancamentoId, solicitacaoId))) {
    throw new Error(
      "O lançamento financeiro ainda não foi confirmado. A solicitação foi mantida disponível para nova tentativa.",
    );
  }
}

export async function registrarPagamentoSeguroServer(input: PagamentoInput, ator: Ator) {
  const id = txt(input?.id, 40);
  if (!id) throw new Error("Solicitação inválida.");

  const db = await adminDb();
  let { data: atual } = await db.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (!atual) throw new Error("Solicitação não encontrada.");

  if (!["autorizada", "comprada", "lancada"].includes(String(atual.status))) {
    throw new Error("Somente compras autorizadas ou realizadas podem ter o pagamento registrado.");
  }

  const valorFinal = numero(input.valor) || numero(atual.valor);
  if (valorFinal <= 0) throw new Error("Informe o valor real pago antes de lançar no Fluxo de Caixa.");

  const fornecedorFinal = txt(input.fornecedor || atual.fornecedor, 200);
  const formaFinal = txt(input.formaPagamento || atual.forma_pagamento || "PIX", 60) || "PIX";
  const contaFinal = txt(input.conta || atual.conta || "Caixa", 80) || "Caixa";
  const dataFinal = dataISO(input.dataPagamento) || new Date().toISOString().slice(0, 10);
  const observacoes = txt(input.observacoes || atual.observacoes, 2000);

  let lancamentoId = txt(atual.lancamento_id, 80) || crypto.randomUUID();

  // Reserva o mesmo ID e os dados financeiros sem avançar o status.
  if (!txt(atual.lancamento_id, 80)) {
    const { data: reservadas, error } = await db
      .from(TABLE)
      .update({
        valor: valorFinal,
        fornecedor: fornecedorFinal || null,
        forma_pagamento: formaFinal,
        conta: contaFinal,
        lancamento_id: lancamentoId,
      })
      .eq("id", id)
      .is("lancamento_id", null)
      .select("*");

    if (error) throw new Error("Não foi possível preparar o lançamento financeiro.");

    if (reservadas?.length) {
      atual = reservadas[0];
    } else {
      const { data: concorrente } = await db.from(TABLE).select("*").eq("id", id).maybeSingle();
      if (!concorrente) throw new Error("Solicitação não encontrada após preparar o lançamento.");
      atual = concorrente;
      lancamentoId = txt(concorrente.lancamento_id, 80);
      if (!lancamentoId) throw new Error("Não foi possível reservar o identificador financeiro.");
    }
  }

  // Se já está no Fluxo, apenas finalizamos/reparamos o status local.
  let existe = await fluxoExiste(lancamentoId, id);

  if (!existe) {
    const obs = [
      observacoes,
      atual.ordem_producao ? `OP: ${atual.ordem_producao}` : "",
      atual.pedido_cliente ? `Cliente: ${atual.pedido_cliente}` : "",
    ].filter(Boolean).join(" · ");

    try {
      await callGas({
        method: "POST",
        timeoutMs: 90000,
        body: {
          action: "fluxoCreate",
          id: lancamentoId,
          data: dataFinal,
          tipo: "Saída",
          categoria: atual.categoria || "Fornecedor",
          descricao: atual.descricao || "Solicitação financeira",
          valor: valorFinal,
          formaPagamento: formaFinal,
          conta: contaFinal,
          beneficiario: fornecedorFinal,
          observacoes: obs,
          contratoId: atual.pedido_id || "",
          origem: origemLancamento(id),
          createdAt: new Date().toISOString(),
          ativo: "Sim",
        },
      });
    } catch (e) {
      // Timeout não é prova de falha: o Apps Script pode ter concluído o POST.
      try {
        await confirmarFluxo(lancamentoId, id);
      } catch {
        throw e instanceof Error ? e : new Error("Não foi possível registrar o lançamento financeiro.");
      }
    }

    await confirmarFluxo(lancamentoId, id);
    existe = true;
  }

  if (!existe) {
    throw new Error("O lançamento financeiro não foi confirmado. A solicitação permanece disponível.");
  }

  // SOMENTE depois do Fluxo confirmado a solicitação é encerrada como lançada.
  const { data: finalizadas, error: finalError } = await db
    .from(TABLE)
    .update({
      valor: valorFinal,
      fornecedor: fornecedorFinal || null,
      forma_pagamento: formaFinal,
      conta: contaFinal,
      lancamento_id: lancamentoId,
      status: "lancada",
      lancado_em: atual.lancado_em || new Date().toISOString(),
    })
    .eq("id", id)
    .select("id");

  if (finalError || !finalizadas?.length) {
    throw new Error("O financeiro foi confirmado, mas não foi possível atualizar a solicitação. Atualize a tela antes de repetir.");
  }

  await logEvento(
    id,
    "Pagamento registrado",
    `Saída confirmada no Fluxo de Caixa — lançamento ${lancamentoId}`,
    ator,
  );

  return { ok: true, lancamentoId, jaLancada: String(atual.status) === "lancada" };
}
