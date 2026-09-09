import type { StoredOrder } from "@/lib/orders-storage";
import type { Lancamento } from "@/lib/financeiro-api";
import { parseValor } from "@/lib/financeiro-api";
import { toDateISO } from "@/lib/date-utils";
import { buildPeriodo, moveCursor, type PeriodoCursor } from "./periodo";
import {
  getGestaoData as getGestaoDataBase,
  type GestaoData,
  type Snapshot,
  type ModalidadeResumo,
  type Rank,
  type Serie,
} from "./aggregate";

export type { GestaoData, Snapshot, ModalidadeResumo, Rank, Serie } from "./aggregate";

const norm = (v: unknown) =>
  String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

const isCaucao = (l: Lancamento) =>
  norm(l.categoria).includes("caucao") || norm(l.origem).includes("caucao");

const isClosed = (o: StoredOrder) =>
  norm(o.status).includes("finaliz") ||
  o.details?.devolucaoConfirmada === "Sim" ||
  o.details?.caucaoDevolvida === "Sim";

const isCanceled = (o: StoredOrder) => o.status === "Cancelado" || String(o.status) === "Excluído";

/**
 * Regra comercial LHL:
 * contrato criado = pré-contrato/pedido;
 * venda = primeiro recebimento real não-caução vinculado ao contrato.
 */
function firstSaleDates(lancamentos: Lancamento[]) {
  const map = new Map<string, string>();
  for (const l of lancamentos) {
    if (l.tipo !== "Entrada" || isCaucao(l) || parseValor(l.valor) <= 0) continue;
    const id = String(l.contratoId || "").trim();
    const data = toDateISO(l.data);
    if (!id || !data) continue;
    const atual = map.get(id);
    if (!atual || data < atual) map.set(id, data);
  }
  return map;
}

function effectiveEnd(inicio: string, fim: string) {
  const hoje = new Date().toISOString().slice(0, 10);
  if (hoje < inicio) return null;
  return hoje < fim ? hoje : fim;
}

function inPeriod(data: string, inicio: string, fim: string | null) {
  return !!fim && !!data && data >= inicio && data <= fim;
}

function prepareSoldSnapshot(snap: Snapshot, realizedOnly: boolean): Snapshot {
  const saleDates = firstSaleDates(snap.lancamentos);
  const today = new Date().toISOString().slice(0, 10);
  const orders = snap.orders.flatMap((o) => {
    if (isCanceled(o)) return [];
    const saleDate = saleDates.get(o.id);
    if (!saleDate) return [];
    const eventDate = toDateISO(o.details?.dataEvento);
    if (realizedOnly && (!eventDate || eventDate > today)) return [];
    return [{
      ...o,
      createdAt: `${saleDate}T12:00:00.000Z`,
      status: isClosed(o) ? ("Finalizado" as any) : o.status,
      details: { ...o.details, dataHoraAceite: `${saleDate}T12:00:00.000Z` },
    }];
  });
  return { ...snap, orders };
}

function countCreatedOrders(snap: Snapshot, cursor: PeriodoCursor) {
  const periodo = buildPeriodo(cursor);
  const fim = effectiveEnd(periodo.inicio, periodo.fim);
  return snap.orders.filter((o) => {
    if (isCanceled(o)) return false;
    const d = toDateISO(o.createdAt) || toDateISO(o.details?.dataHoraAceite);
    return inPeriod(d, periodo.inicio, fim);
  }).length;
}

function replaceKpi(data: GestaoData, label: string, valor: number, anterior?: number) {
  const k = data.kpis.find((x) => x.label === label);
  if (!k) return;
  k.valor = valor;
  if (anterior != null) {
    k.anterior = anterior;
    k.variacao = anterior > 0 ? ((valor - anterior) / anterior) * 100 : null;
  }
}

function mergeRealizedFinancialViews(sales: GestaoData, realized: GestaoData) {
  sales.resumo.faturamento = realized.resumo.faturamento;
  const kReal = realized.kpis.find((k) => k.label === "Faturamento");
  if (kReal) replaceKpi(sales, "Faturamento", kReal.valor, kReal.anterior);

  const realizedByBucket = new Map(realized.evolucao.map((e) => [e.label, e]));
  sales.evolucao = sales.evolucao.map((e) => {
    const r = realizedByBucket.get(e.label);
    return r ? { ...e, Faturado: r.Faturado } : e;
  });

  const realizedMods = new Map(realized.modalidades.map((m) => [m.nome, m]));
  sales.modalidades = sales.modalidades.map((m) => {
    const r = realizedMods.get(m.nome);
    if (!r) return { ...m, faturamento: 0, percFaturamento: 0 };
    return {
      ...m,
      faturamento: r.faturamento,
      percFaturamento: r.percFaturamento,
      margem: r.margem,
      evolucao: m.evolucao.map((e) => {
        const re = r.evolucao.find((x) => x.label === e.label);
        return re ? { ...e, Faturamento: re.Faturamento } : e;
      }),
    };
  });
  sales.participacao = realized.participacao;
}

/**
 * Camada soberana de Gestão LHL.
 * Mantém todo o BI existente, mas corrige a definição de venda, fechamento,
 * faturamento realizado e pendências de contratos finalizados.
 */
export function getGestaoData(snap: Snapshot, cursor: PeriodoCursor): GestaoData {
  const soldSnap = prepareSoldSnapshot(snap, false);
  const realizedSnap = prepareSoldSnapshot(snap, true);
  const data = getGestaoDataBase(soldSnap, cursor);
  const realized = getGestaoDataBase(realizedSnap, cursor);

  mergeRealizedFinancialViews(data, realized);

  // "Pedidos" é quantidade de pré-contratos/contratos criados no período.
  // "Vendas confirmadas" é o valor integral dos contratos cujo primeiro
  // recebimento real aconteceu no período.
  const pedidosAtual = countCreatedOrders(snap, cursor);
  const pedidosAnterior = countCreatedOrders(snap, moveCursor(cursor, -1));
  replaceKpi(data, "Pedidos", pedidosAtual, pedidosAnterior);

  const vendas = data.kpis.find((k) => k.label === "Vendas do mês");
  if (vendas) vendas.label = "Vendas confirmadas";

  const faturamento = data.kpis.find((k) => k.label === "Faturamento");
  if (faturamento) faturamento.label = "Faturamento realizado";

  return data;
}