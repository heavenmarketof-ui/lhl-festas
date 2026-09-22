import { createLancamento, fetchLancamentos, type Lancamento } from "./financeiro-api";
import { fetchOrdersFromSheet } from "./sheets-api";
import {
  compraStatusOf,
  fetchOrdens,
  valorPrevistoCompra,
  valorRealCompra,
  type ItemCompra,
  type OrdemProducao,
} from "./producao-api";
import type { StoredOrder } from "./orders-storage";
import { origemLancamento } from "./solicitacoes-types";

export type CompraSemLancamento = {
  op: OrdemProducao;
  item: ItemCompra;
  solicitacaoId: string;
  valor: number;
  cliente: string;
};

function diasAtras(dataISO: string, dias: number): string {
  const data = new Date(`${dataISO}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() - dias);
  return data.toISOString().slice(0, 10);
}

function ativo(l: Lancamento): boolean {
  return String(l.ativo || "Sim").toLowerCase() === "sim";
}

export function localizarComprasSemLancamento(
  ops: OrdemProducao[],
  lancamentos: Lancamento[],
  orders: StoredOrder[],
  hojeISO: string,
): CompraSemLancamento[] {
  const inicio = diasAtras(hojeISO, 7);
  const contratos = new Map(orders.map((order) => [order.id, order]));
  const origens = new Set(lancamentos.filter(ativo).map((l) => String(l.origem || "").trim()));
  const ids = new Set(lancamentos.filter(ativo).map((l) => String(l.id || "").trim()));
  const vistos = new Set<string>();
  const faltantes: CompraSemLancamento[] = [];

  for (const op of ops) {
    const order = contratos.get(op.contratoId);
    const evento = String(order?.dataEvento || "").slice(0, 10);
    if (evento && evento < hojeISO) continue;

    for (const item of op.compras || []) {
      const status = compraStatusOf(item);
      const solicitacaoId = String(item.solicitacaoId || "").trim();
      const dataCompra = String(item.dataCompra || "").slice(0, 10);
      if (item.cancelado || item.removidoDoContrato) continue;
      if (status !== "Compra realizada" && status !== "Pago") continue;
      if (!solicitacaoId || vistos.has(solicitacaoId)) continue;
      if (!dataCompra || dataCompra < inicio || dataCompra > hojeISO) continue;

      const origem = origemLancamento(solicitacaoId);
      const idDeterministico = `fluxo-solicitacao-${solicitacaoId}`;
      if (origens.has(origem) || ids.has(idDeterministico)) continue;

      const valor = valorRealCompra(item) || valorPrevistoCompra(item);
      if (valor <= 0) continue;
      vistos.add(solicitacaoId);
      faltantes.push({ op, item, solicitacaoId, valor, cliente: order?.nome || "" });
    }
  }

  return faltantes;
}

export async function recuperarComprasSemLancamento(hojeISO: string) {
  const [ops, lancamentos, orders] = await Promise.all([
    fetchOrdens(),
    fetchLancamentos({ includeDeleted: true, force: true }),
    fetchOrdersFromSheet({ includeDeleted: true, force: true }),
  ]);
  const faltantes = localizarComprasSemLancamento(ops, lancamentos, orders, hojeISO);
  if (!faltantes.length) return { encontradas: 0, recuperadas: 0, total: 0, falhas: [] as string[] };

  const resultados = await Promise.allSettled(faltantes.map(({ op, item, solicitacaoId, valor, cliente }) =>
    createLancamento({
      id: `fluxo-solicitacao-${solicitacaoId}`,
      data: item.dataCompra || hojeISO,
      tipo: "Saída",
      categoria: item.tipo === "Patrimônio" ? "Patrimônio" : "Fornecedor",
      descricao: item.descricao || "Compra de material",
      valor,
      formaPagamento: item.formaPagamento || "PIX",
      conta: "Caixa",
      beneficiario: item.fornecedor || "",
      observacoes: [
        `Recuperado automaticamente da ${op.numero}`,
        cliente ? `Cliente: ${cliente}` : "",
      ].filter(Boolean).join(" · "),
      contratoId: op.contratoId,
      origem: origemLancamento(solicitacaoId),
      createdAt: new Date().toISOString(),
      ativo: "Sim",
    }),
  ));

  const depois = await fetchLancamentos({ includeDeleted: true, force: true });
  const confirmados = new Set(ativos(depois).map((l) => String(l.origem || "").trim()));
  const falhas: string[] = [];
  let total = 0;
  faltantes.forEach((compra, index) => {
    const confirmada = resultados[index].status === "fulfilled" && confirmados.has(origemLancamento(compra.solicitacaoId));
    if (!confirmada) {
      falhas.push(compra.item.descricao || compra.solicitacaoId);
    } else {
      total += compra.valor;
    }
  });
  const recuperadas = faltantes.length - falhas.length;
  return { encontradas: faltantes.length, recuperadas, total, falhas };
}

function ativos(lancamentos: Lancamento[]): Lancamento[] {
  return lancamentos.filter(ativo);
}
