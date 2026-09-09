import type { StoredOrder } from "@/lib/orders-storage";
import type { Lancamento } from "@/lib/financeiro-api";
import { parseValor } from "@/lib/financeiro-api";
import { toDateISO } from "@/lib/date-utils";
import { buildPeriodo, buckets, moveCursor, type PeriodoCursor } from "./periodo";
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

const isCanceled = (o: StoredOrder) =>
  norm(o.status) === "cancelado" || norm(o.status) === "excluido";

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

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function effectiveEnd(inicio: string, fim: string) {
  const hoje = todayISO();
  if (hoje < inicio) return null;
  return hoje < fim ? hoje : fim;
}

function inPeriod(data: string, inicio: string, fim: string | null) {
  return !!fim && !!data && data >= inicio && data <= fim;
}

function addDaysISO(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string) {
  const da = new Date(`${a}T12:00:00Z`).getTime();
  const db = new Date(`${b}T12:00:00Z`).getTime();
  return Math.max(0, Math.round((db - da) / 86400000));
}

function comparablePreviousEnd(cursor: PeriodoCursor): string | null {
  const atual = buildPeriodo(cursor);
  const fimAtual = effectiveEnd(atual.inicio, atual.fim);
  if (!fimAtual) return null;
  const anterior = buildPeriodo(moveCursor(cursor, -1));
  if (fimAtual === atual.fim) return anterior.fim;
  const elapsed = daysBetween(atual.inicio, fimAtual);
  const target = addDaysISO(anterior.inicio, elapsed);
  return target < anterior.fim ? target : anterior.fim;
}

function prepareSoldSnapshot(snap: Snapshot): Snapshot {
  const saleDates = firstSaleDates(snap.lancamentos);
  const orders = snap.orders.flatMap((o) => {
    if (isCanceled(o)) return [];
    const saleDate = saleDates.get(o.id);
    if (!saleDate) return [];
    return [{
      ...o,
      createdAt: `${saleDate}T12:00:00.000Z`,
      status: isClosed(o) ? ("Finalizado" as any) : o.status,
      details: { ...o.details, dataHoraAceite: `${saleDate}T12:00:00.000Z` },
    }];
  });
  return { ...snap, orders };
}

function countCreatedOrders(snap: Snapshot, cursor: PeriodoCursor, fimOverride?: string | null) {
  const periodo = buildPeriodo(cursor);
  const fim = fimOverride === undefined ? effectiveEnd(periodo.inicio, periodo.fim) : fimOverride;
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

function modalidadeNome(o: StoredOrder) {
  return String(o.modalidade || "").trim() || "Não classificado";
}

function aplicarEvolucaoPedidosEVendas(data: GestaoData, snap: Snapshot, cursor: PeriodoCursor) {
  const periodo = buildPeriodo(cursor);
  const fim = effectiveEnd(periodo.inicio, periodo.fim);
  const bs = buckets(periodo);
  const saleDates = firstSaleDates(snap.lancamentos);

  const stats = new Map(bs.map((b) => [b.label, { pedidos: 0, vendas: 0 }]));
  if (fim) {
    for (const o of snap.orders) {
      if (isCanceled(o)) continue;
      const created = toDateISO(o.createdAt) || toDateISO(o.details?.dataHoraAceite);
      if (inPeriod(created, periodo.inicio, fim)) {
        const b = bs.find((x) => created >= x.inicio && created <= x.fim);
        if (b) stats.get(b.label)!.pedidos += 1;
      }

      const saleDate = saleDates.get(o.id) || "";
      if (inPeriod(saleDate, periodo.inicio, fim)) {
        const b = bs.find((x) => saleDate >= x.inicio && saleDate <= x.fim);
        if (b) stats.get(b.label)!.vendas += parseValor(o.details?.valorTotal);
      }
    }
  }

  data.evolucao = data.evolucao.map((e) => ({
    ...e,
    Pedidos: stats.get(e.label)?.pedidos || 0,
    Vendas: Math.round((stats.get(e.label)?.vendas || 0) * 100) / 100,
  }));
}

function faturamentoRealizado(
  snap: Snapshot,
  cursor: PeriodoCursor,
  fimOverride?: string | null,
) {
  const periodo = buildPeriodo(cursor);
  const fim = fimOverride === undefined ? effectiveEnd(periodo.inicio, periodo.fim) : fimOverride;
  if (!fim) return { total: 0, porModalidade: new Map<string, number>() };

  const entregues = snap.orders.filter((o) => {
    if (isCanceled(o)) return false;
    const dataEvento = toDateISO(o.details?.dataEvento);
    return inPeriod(dataEvento, periodo.inicio, fim);
  });
  const porId = new Map(entregues.map((o) => [String(o.id), o]));
  const porModalidade = new Map<string, number>();
  let total = 0;

  for (const l of snap.lancamentos) {
    if (l.tipo !== "Entrada" || isCaucao(l)) continue;
    const valor = parseValor(l.valor);
    if (valor <= 0) continue;
    const data = toDateISO(l.data);
    if (!inPeriod(data, periodo.inicio, fim)) continue;
    const order = porId.get(String(l.contratoId || "").trim());
    if (!order) continue;
    total += valor;
    const mod = modalidadeNome(order);
    porModalidade.set(mod, (porModalidade.get(mod) || 0) + valor);
  }

  return { total: Math.round(total * 100) / 100, porModalidade };
}

function aplicarFaturamentoRealizado(data: GestaoData, snap: Snapshot, cursor: PeriodoCursor) {
  const atual = faturamentoRealizado(snap, cursor);
  const anteriorCursor = moveCursor(cursor, -1);
  const anterior = faturamentoRealizado(snap, anteriorCursor, comparablePreviousEnd(cursor));

  data.resumo.faturamento = atual.total;
  replaceKpi(data, "Faturamento", atual.total, anterior.total);

  const periodo = buildPeriodo(cursor);
  const fim = effectiveEnd(periodo.inicio, periodo.fim);
  const deliveredOrders = new Map(
    snap.orders
      .filter((o) => !isCanceled(o) && inPeriod(toDateISO(o.details?.dataEvento), periodo.inicio, fim))
      .map((o) => [String(o.id), o]),
  );
  const bs = buckets(periodo);
  const faturadoPorBucket = new Map(bs.map((b) => [b.label, 0]));

  for (const l of snap.lancamentos) {
    if (l.tipo !== "Entrada" || isCaucao(l) || parseValor(l.valor) <= 0) continue;
    if (!deliveredOrders.has(String(l.contratoId || "").trim())) continue;
    const d = toDateISO(l.data);
    if (!inPeriod(d, periodo.inicio, fim)) continue;
    const bucket = bs.find((b) => d >= b.inicio && d <= b.fim);
    if (!bucket) continue;
    faturadoPorBucket.set(bucket.label, (faturadoPorBucket.get(bucket.label) || 0) + parseValor(l.valor));
  }

  data.evolucao = data.evolucao.map((e) => ({
    ...e,
    Faturado: Math.round((faturadoPorBucket.get(e.label) || 0) * 100) / 100,
  }));

  const total = atual.total;
  data.modalidades = data.modalidades.map((m) => {
    const fat = Math.round((atual.porModalidade.get(m.nome) || 0) * 100) / 100;
    return { ...m, faturamento: fat, percFaturamento: total > 0 ? (fat / total) * 100 : 0 };
  });
  data.participacao = data.modalidades.map((m) => ({ nome: m.nome, valor: m.faturamento, qtd: m.pedidos }));

  data.comparativo = data.comparativo.map((c) =>
    norm(c.label).includes("fatur")
      ? {
          ...c,
          atual: atual.total,
          anterior: anterior.total,
          variacao: anterior.total > 0 ? ((atual.total - anterior.total) / anterior.total) * 100 : null,
        }
      : c,
  );
}

export function getGestaoData(snap: Snapshot, cursor: PeriodoCursor): GestaoData {
  const soldSnap = prepareSoldSnapshot(snap);
  const data = getGestaoDataBase(soldSnap, cursor);

  const pedidosAtual = countCreatedOrders(snap, cursor);
  const pedidosAnterior = countCreatedOrders(snap, moveCursor(cursor, -1), comparablePreviousEnd(cursor));
  replaceKpi(data, "Pedidos", pedidosAtual, pedidosAnterior);

  aplicarEvolucaoPedidosEVendas(data, snap, cursor);
  aplicarFaturamentoRealizado(data, snap, cursor);

  return data;
}