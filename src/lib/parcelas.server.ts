// ============================================================================
// PARCELAS DE BOLETO — camada servidor (fonte da verdade no banco).
// ----------------------------------------------------------------------------
// Regras invioláveis:
// · Monotonicidade: parcela PAGA nunca é rebaixada nem reescrita por uma tela
//   desatualizada (celular x computador).
// · Idempotência: cada parcela paga tem no máximo UM lançamento financeiro,
//   garantido pelo campo `lancamento_id`.
// ============================================================================

export type ParcelaStatus = "a_gerar" | "gerado" | "enviado" | "pago" | "vencido";

export type Parcela = {
  id: string;
  contratoId: string;
  contratoCliente: string;
  numero: number;
  total: number;
  valor: number;
  vencimento: string;
  status: ParcelaStatus;
  valorPago: number | null;
  pagoEm: string | null;
  lancamentoId: string | null;
  observacoes: string;
  createdAt: string;
  updatedAt: string;
};

export const RANK: Record<ParcelaStatus, number> = {
  a_gerar: 1,
  gerado: 2,
  enviado: 3,
  vencido: 3,
  pago: 10,
};

function mapRow(r: any): Parcela {
  return {
    id: String(r.id),
    contratoId: String(r.contrato_id ?? ""),
    contratoCliente: String(r.contrato_cliente ?? ""),
    numero: Number(r.numero ?? 0),
    total: Number(r.total ?? 0),
    valor: Number(r.valor ?? 0),
    vencimento: String(r.vencimento ?? "").slice(0, 10),
    status: (r.status ?? "a_gerar") as ParcelaStatus,
    valorPago: r.valor_pago == null ? null : Number(r.valor_pago),
    pagoEm: r.pago_em ? String(r.pago_em) : null,
    lancamentoId: r.lancamento_id ? String(r.lancamento_id) : null,
    observacoes: String(r.observacoes ?? ""),
    createdAt: String(r.created_at ?? ""),
    updatedAt: String(r.updated_at ?? ""),
  };
}

type Ctx = { supabase: any; claims?: any; userId?: string };

export async function listarParcelasServer(
  ctx: Ctx,
  contratoId?: string,
): Promise<Parcela[]> {
  let q = ctx.supabase.from("contrato_parcelas").select("*");
  if (contratoId) q = q.eq("contrato_id", contratoId);
  const { data, error } = await q.order("vencimento", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export type ParcelaInput = {
  id?: string;
  numero: number;
  total: number;
  valor: number;
  vencimento: string;
  status?: ParcelaStatus;
  observacoes?: string;
};

/**
 * Salva o plano de parcelas de um contrato com merge seguro:
 * · parcelas PAGAS no banco são mantidas exatamente como estão;
 * · status enviado pela tela nunca rebaixa o status já gravado;
 * · parcelas ausentes no envio só são removidas se não estiverem pagas.
 */
export async function salvarParcelasServer(
  ctx: Ctx,
  input: { contratoId: string; contratoCliente?: string; parcelas: ParcelaInput[] },
): Promise<Parcela[]> {
  const contratoId = String(input.contratoId || "").trim();
  if (!contratoId) throw new Error("Contrato inválido.");

  const atuais = await listarParcelasServer(ctx, contratoId);
  const porNumero = new Map(atuais.map((p) => [p.numero, p]));

  const enviados = (input.parcelas ?? []).filter((p) => Number(p.numero) > 0);
  const numerosEnviados = new Set(enviados.map((p) => Number(p.numero)));

  // 1. Remoções — nunca apaga histórico de parcela paga.
  const remover = atuais.filter((p) => !numerosEnviados.has(p.numero) && p.status !== "pago");
  if (remover.length) {
    const { error } = await ctx.supabase
      .from("contrato_parcelas")
      .delete()
      .in("id", remover.map((p) => p.id));
    if (error) throw new Error(error.message);
  }

  // 2. Upsert com monotonicidade.
  const rows = enviados.map((p) => {
    const atual = porNumero.get(Number(p.numero));
    if (atual && atual.status === "pago") {
      return {
        id: atual.id,
        contrato_id: contratoId,
        contrato_cliente: input.contratoCliente ?? atual.contratoCliente,
        numero: atual.numero,
        total: Number(p.total) || atual.total,
        valor: atual.valor,
        vencimento: atual.vencimento || null,
        status: "pago",
        valor_pago: atual.valorPago,
        pago_em: atual.pagoEm,
        lancamento_id: atual.lancamentoId,
        observacoes: atual.observacoes,
      };
    }
    const statusEnviado = (p.status ?? atual?.status ?? "a_gerar") as ParcelaStatus;
    const status =
      atual && RANK[atual.status] > RANK[statusEnviado] ? atual.status : statusEnviado;
    return {
      id: atual?.id,
      contrato_id: contratoId,
      contrato_cliente: input.contratoCliente ?? atual?.contratoCliente ?? "",
      numero: Number(p.numero),
      total: Number(p.total) || enviados.length,
      valor: Number(p.valor) || 0,
      vencimento: p.vencimento ? String(p.vencimento).slice(0, 10) : null,
      status,
      observacoes: p.observacoes ?? atual?.observacoes ?? "",
    };
  });

  if (rows.length) {
    const { error } = await ctx.supabase
      .from("contrato_parcelas")
      .upsert(rows, { onConflict: "contrato_id,numero" });
    if (error) throw new Error(error.message);
  }

  return listarParcelasServer(ctx, contratoId);
}

/** Muda o status de UMA parcela respeitando a monotonicidade. */
export async function atualizarStatusParcelaServer(
  ctx: Ctx,
  input: { id: string; status: ParcelaStatus; observacoes?: string },
): Promise<Parcela> {
  const { data: atualRow, error: e0 } = await ctx.supabase
    .from("contrato_parcelas")
    .select("*")
    .eq("id", input.id)
    .maybeSingle();
  if (e0) throw new Error(e0.message);
  if (!atualRow) throw new Error("Parcela não encontrada.");
  const atual = mapRow(atualRow);

  if (atual.status === "pago") {
    // Estado soberano: pago não volta atrás.
    return atual;
  }
  if (input.status === "pago") {
    throw new Error("Use o registro de pagamento para marcar a parcela como paga.");
  }

  const patch: Record<string, unknown> = { status: input.status };
  if (input.observacoes !== undefined) patch.observacoes = input.observacoes;

  const { data, error } = await ctx.supabase
    .from("contrato_parcelas")
    .update(patch)
    .eq("id", input.id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return mapRow(data);
}

/**
 * Marca a parcela como PAGA de forma idempotente. Devolve `criarLancamento`
 * indicando se a entrada financeira ainda precisa ser criada pela camada de
 * Fluxo de Caixa (planilha) — quando já existe `lancamento_id`, nunca duplica.
 */
export async function registrarPagamentoParcelaServer(
  ctx: Ctx,
  input: { id: string; valorPago?: number; lancamentoId: string; data?: string },
): Promise<{ parcela: Parcela; criarLancamento: boolean }> {
  const { data: row, error: e0 } = await ctx.supabase
    .from("contrato_parcelas")
    .select("*")
    .eq("id", input.id)
    .maybeSingle();
  if (e0) throw new Error(e0.message);
  if (!row) throw new Error("Parcela não encontrada.");
  const atual = mapRow(row);

  if (atual.status === "pago" && atual.lancamentoId) {
    return { parcela: atual, criarLancamento: false };
  }

  const valorPago =
    input.valorPago != null && Number(input.valorPago) > 0
      ? Number(input.valorPago)
      : atual.valor;

  const { data, error } = await ctx.supabase
    .from("contrato_parcelas")
    .update({
      status: "pago",
      valor_pago: valorPago,
      pago_em: new Date().toISOString(),
      lancamento_id: atual.lancamentoId ?? input.lancamentoId,
    })
    .eq("id", input.id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);

  return { parcela: mapRow(data), criarLancamento: !atual.lancamentoId };
}

/** Leitura pública enxuta (link do contrato do cliente). */
export async function listarParcelasPublicoServer(contratoId: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await sb
    .from("contrato_parcelas")
    .select("numero,total,valor,vencimento,status")
    .eq("contrato_id", contratoId)
    .order("numero", { ascending: true });
  if (error) return [];
  return (data ?? []).map((r: any) => ({
    numero: Number(r.numero),
    total: Number(r.total),
    valor: Number(r.valor),
    vencimento: String(r.vencimento ?? "").slice(0, 10),
    status: String(r.status) as ParcelaStatus,
  }));
}
