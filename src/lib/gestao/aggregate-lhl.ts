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

/**
 * Regra comercial LHL:
 * - Pedido = contrato/pré-contrato criado no período, ainda que sem sinal.
 * - Venda = primeiro recebimento real não-caução vinculado ao contrato.
 * - O valor da venda é o valor TOTAL negociado do contrato.
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

/**
 * FATURAMENTO LHL = caixa efetivamente recebido NO PERÍODO referente às festas
 * que também foram ENTREGUES/REALIZADAS nesse período, até a data de corte.
 *
 * Isso evita dois erros:
 * 1) venda futura entrar como faturamento antes da festa acontecer;
 * 2) somar o valor total do contrato quando só uma parcela entrou no caixa.
 */
function faturamentoRealizado(
  snap: Snapshot,
  cursor: PeriodoCursor,
  fimOverride?: string | null,
) {
  const periodo = buildPeriodo(cursor);
  const fim = fimOverride === undefined ? effectiveEnd(periodo.inicio, periodo.fim) : fimOverride;
  if (!fim) return { total: 0, porModalidade: new Map<string, number>(), ids: new Set<string>() };

  const entregues = snap.orders.filter((o) => {
    if (isCanceled(o)) return false;
    const dataEvento = toDateISO(o.details?.dataEvento);
    return inPeriod(dataEvento, periodo.inicio, fim);
  });
  const porId = new Map(entregues.map((o) => [String(o.id), o]));
  const ids = new Set(porId.keys());
  const porModalidade = new Map<string, number>();
  let total = 0;

  for (const l of snap.lancamentos) {
    if (l.tipo !== "Entrada" || isCaucao(l)) continue;
    const valor = parseValor(l.valor);
    if (valor <= 0) continue;
    const data = toDateISO(l.data);
    if (!inPeriod(data, periodo.inicio, fim)) continue;
    const contratoId = String(l.contratoId || "").trim();
    const order = porId.get(contratoId);
    if (!order) continue;

    total += valor;
    const mod = modalidadeNome(order);
    porModalidade.set(mod, (porModalidade.get(mod) || 0) + valor);
  }

  return {
    total: Math.round(total * 100) / 100,
    porModalidade,
    ids,
  };
}

function aplicarFaturamentoRealizado(
  data: GestaoData,
  snap: Snapshot,
  cursor: PeriodoCursor,
) {
  const atual = faturamentoRealizado(snap, cursor);
  const anteriorCursor = moveCursor(cursor, -1);
  const anterior = faturamentoRealizado(snap, anteriorCursor, comparablePreviousEnd(cursor));

  data.resumo.faturamento = atual.total;
  replaceKpi(data, "Faturamento", atual.total, anterior.total);

  // Gráfico temporal: mostra apenas entradas reais de contratos cuja festa já
  // foi realizada dentro do período selecionado.
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
    return {
      ...m,
      faturamento: fat,
      percFaturamento: total > 0 ? (fat / total) * 100 : 0,
    };
  });
  data.participacao = data.modalidades.map((m) => ({
    nome: m.nome,
    valor: m.faturamento,
    qtd: m.pedidos,
  }));

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

/**
 * Camada soberana de Gestão LHL.
 *
 * Conceitos oficiais:
 * - PEDIDOS: contratos/pré-contratos criados no período, com ou sem sinal.
 * - VENDAS DO MÊS: contratos cujo primeiro recebimento real não-caução entrou
 *   no período; soma o valor TOTAL negociado desses contratos.
 * - FATURAMENTO: somente dinheiro efetivamente recebido no período referente
 *   às festas entregues/realizadas nesse mesmo período, até hoje.
 */
export function getGestaoData(snap: Snapshot, cursor: PeriodoCursor): GestaoData {
  const soldSnap = prepareSoldSnapshot(snap);
  const data = getGestaoDataBase(soldSnap, cursor);

  // Pedidos usam a data em que o contrato/pré-contrato foi criado, mesmo sem sinal.
  const pedidosAtual = countCreatedOrders(snap, cursor);
  const pedidosAnterior = countCreatedOrders(
    snap,
    moveCursor(cursor, -1),
    comparablePreviousEnd(cursor),
  );
  replaceKpi(data, "Pedidos", pedidosAtual, pedidosAnterior);

  // A base calcula corretamente o valor integral das vendas a partir do snapshot
  // de vendas confirmadas. Apenas deixamos o nome explícito para a operação.
  const vendas = data.kpis.find((k) => k.label === "Vendas do mês");
  if (vendas) vendas.label = "Vendas do mês";

  aplicarFaturamentoRealizado(data, snap, cursor);

  return data;
}