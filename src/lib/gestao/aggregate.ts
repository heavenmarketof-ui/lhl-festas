// ============================================================================
// GESTÃO — AGREGADOR 100% READ-ONLY (Business Intelligence LHL Festas)
// ----------------------------------------------------------------------------
// REGRA ABSOLUTA: este módulo apenas LÊ. Nenhuma função aqui cria, atualiza,
// exclui, sincroniza ou reconcilia qualquer dado. Não importa nem chama
// mutations (saveOrdem, updateOrderOnSheet, createLancamento, mudarEtapaCompra,
// registrarPagamentoSolicitacao, ...).
//
// Fontes de leitura:
//   • Contratos ......... fetchOrdersFromSheet()   (planilha — aba PEDIDOS)
//   • Financeiro ........ fetchLancamentos()       (planilha — Fluxo de Caixa)
//   • Operação .......... fetchOrdens()            (planilha — ORDENS_PRODUCAO)
//
// Convenções de dados legados: quando não é possível classificar, usamos
// "Não classificado". Quando não há informação suficiente para um indicador,
// devolvemos `disponivel: false` (a UI mostra "Dados insuficientes").
// ============================================================================

import type { StoredOrder } from "@/lib/orders-storage";
import { parseValor, type Lancamento } from "@/lib/financeiro-api";
import type { ItemCompra, OrdemProducao } from "@/lib/producao-api";
import { valorPrevistoCompra, valorRealCompra, compraStatusOf } from "@/lib/producao-api";
import { getContractPaymentStatus, indexRecebimentos, money } from "@/lib/pagamentos";
import { toDateISO } from "@/lib/date-utils";
import {
  buildPeriodo, buckets, bucketDe, dentro, diaSemana, diasEntre,
  DIAS_SEMANA, MESES_CURTOS, moveCursor, nomeMes,
  type Bucket, type Periodo, type PeriodoCursor,
} from "./periodo";

export const NAO_CLASSIFICADO = "Não classificado";

export type Snapshot = {
  orders: StoredOrder[];
  lancamentos: Lancamento[];
  ops: OrdemProducao[];
  geradoEm: string;
};

export type Serie = { label: string; [k: string]: number | string };
export type Rank = { nome: string; valor: number; qtd?: number };

export type Kpi = {
  label: string;
  valor: number;
  formato: "moeda" | "numero" | "percent";
  anterior?: number;
  variacao?: number | null;
  disponivel: boolean;
};

export type LucroVenda = {
  contratoId: string;
  cliente: string;
  tema: string;
  modalidade: string;
  dataEvento: string;
  valorVendido: number;
  compras: number;
  lucroEstimado: number;
  margemPercentual: number;
  apurado: boolean;
};

const norm = (v: unknown) =>
  String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

const ehCaucaoLanc = (l: Lancamento) =>
  norm(l.categoria).includes("caucao") || norm(l.origem).includes("caucao");

/** Data de fechamento comercial do contrato. */
export function dataFechamento(o: StoredOrder): string {
  return toDateISO(o.createdAt) || toDateISO(o.details?.dataHoraAceite) || "";
}

export function dataEvento(o: StoredOrder): string {
  return toDateISO(o.details?.dataEvento) || "";
}

export function valorContrato(o: StoredOrder): number {
  return money(parseValor(o.details?.valorTotal));
}

export function modalidadeDe(o: StoredOrder): string {
  const m = String(o.modalidade || "").trim();
  return m || NAO_CLASSIFICADO;
}

export function kitDe(o: StoredOrder): string {
  const k = String(o.plano || "").trim();
  return k || NAO_CLASSIFICADO;
}

export function temaDe(o: StoredOrder): string {
  const t = String(o.tema || "").trim();
  return t || NAO_CLASSIFICADO;
}

/** Identificador de cliente confiável: CPF > telefone > e-mail. */
export function clienteKey(o: StoredOrder): string | null {
  const cpf = String(o.cpf || "").replace(/\D/g, "");
  if (cpf.length >= 11) return `cpf:${cpf}`;
  const tel = String(o.telefone || "").replace(/\D/g, "");
  if (tel.length >= 10) return `tel:${tel}`;
  const mail = norm(o.email);
  if (mail.includes("@")) return `mail:${mail}`;
  return null;
}

export const cancelado = (o: StoredOrder) => o.status === "Cancelado";
export const finalizado = (o: StoredOrder) => norm(o.status).includes("finaliz");

function variacao(atual: number, anterior: number): number | null {
  if (!Number.isFinite(anterior) || anterior <= 0) return null;
  return ((atual - anterior) / anterior) * 100;
}

function topN(map: Map<string, { qtd: number; valor: number }>, n: number, por: "qtd" | "valor"): Rank[] {
  return Array.from(map.entries())
    .map(([nome, v]) => ({ nome, valor: v.valor, qtd: v.qtd }))
    .sort((a, b) => (por === "qtd" ? b.qtd! - a.qtd! : b.valor - a.valor))
    .slice(0, n);
}

function bump(map: Map<string, { qtd: number; valor: number }>, key: string, valor: number, qtd = 1) {
  const cur = map.get(key) || { qtd: 0, valor: 0 };
  cur.qtd += qtd;
  cur.valor = money(cur.valor + valor);
  map.set(key, cur);
}

/** Soma dias a uma data ISO sem depender do fuso local. */
function addDiasISO(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Indicadores realizados nunca enxergam o futuro.
 * Período passado = período completo; período atual = do início até hoje;
 * período futuro = nenhum realizado.
 */
function fimRealizado(p: Periodo, hoje: string): string | null {
  if (hoje < p.inicio) return null;
  return hoje < p.fim ? hoje : p.fim;
}

/** Período anterior comparável pelo mesmo número de dias decorridos. */
function fimComparavelAnterior(
  atual: Periodo, anterior: Periodo, fimAtual: string | null,
): string | null {
  if (!fimAtual) return null;
  if (fimAtual === atual.fim) return anterior.fim;
  const diasDecorridos = diasEntre(atual.inicio, fimAtual);
  const alvo = addDiasISO(anterior.inicio, diasDecorridos);
  return alvo < anterior.fim ? alvo : anterior.fim;
}

const dentroRealizado = (p: Periodo, fim: string | null, data: string) =>
  !!fim && !!data && data >= p.inicio && data <= fim;

/* ============================ Núcleo do período ============================ */

type Nucleo = {
  pedidos: StoredOrder[];
  vendido: number;
  faturamento: number;
  ticket: number;
  recebido: number;
  saidas: number;
  aReceber: number;
  saldoTotalClientes: number;
  clientes: number;
  caucaoRecebida: number;
  caucaoDevolvida: number;
};

function nucleo(snap: Snapshot, p: Periodo, fim: string | null): Nucleo {
  const idx = indexRecebimentos(snap.lancamentos);
  // PEDIDOS = tudo que foi vendido/fechado comercialmente no periodo,
  // mesmo que a festa seja entregue em outro mes.
  const pedidos = snap.orders.filter((o) =>
    !cancelado(o) && dentroRealizado(p, fim, dataFechamento(o)),
  );
  const vendido = money(pedidos.reduce((total, o) => total + valorContrato(o), 0));

  // FATURAMENTO = somente festas/entregas efetivamente ocorridas até hoje.
  // Eventos futuros permanecem na carteira/a receber, mas não entram como realizado.
  const entregues = snap.orders.filter((o) => {
    if (cancelado(o)) return false;
    const ev = dataEvento(o);
    return dentroRealizado(p, fim, ev);
  });
  const faturamento = money(entregues.reduce((total, o) => total + valorContrato(o), 0));

  // A RECEBER NO PERÍODO = saldo de contratos cujo EVENTO pertence ao período.
  // Contrato finalizado nunca entra como saldo pendente: na regra comercial da
  // LHL, uma festa só é finalizada depois de estar 100% quitada.
  const aReceber = money(
    snap.orders
      .filter((o) => !cancelado(o) && !finalizado(o) && dentro(p, dataEvento(o)))
      .reduce((s, o) => s + getContractPaymentStatus(o, idx).saldoReceber, 0),
  );

  // SALDO TOTAL DE CLIENTES = tudo que ainda falta receber dos contratos em
  // aberto, independentemente do mês do fechamento ou do evento.
  const saldoTotalClientes = money(
    snap.orders
      .filter((o) => !cancelado(o) && !finalizado(o))
      .reduce((s, o) => s + getContractPaymentStatus(o, idx).saldoReceber, 0),
  );

  let recebido = 0, saidas = 0, caucaoRecebida = 0, caucaoDevolvida = 0;
  for (const l of snap.lancamentos) {
    const d = String(l.data || "").slice(0, 10);
    if (!dentroRealizado(p, fim, d)) continue;
    const v = parseValor(l.valor);
    if (ehCaucaoLanc(l)) {
      if (l.tipo === "Entrada") caucaoRecebida += v; else caucaoDevolvida += v;
      continue; // caução nunca é receita/saída comercial
    }
    if (l.tipo === "Entrada") {
      if (String(l.contratoId || "").trim()) recebido += v;
    } else {
      saidas += v;
    }
  }

  const clientesSet = new Set<string>();
  for (const o of pedidos) clientesSet.add(clienteKey(o) || `id:${o.id}`);

  return {
    pedidos,
    vendido,
    faturamento,
    ticket: pedidos.length ? money(vendido / pedidos.length) : 0,
    recebido: money(recebido),
    saidas: money(saidas),
    aReceber,
    saldoTotalClientes,
    clientes: clientesSet.size,
    caucaoRecebida: money(caucaoRecebida),
    caucaoDevolvida: money(caucaoDevolvida),
  };
}

/* ============================ Modalidades / Kits ============================ */

export type ModalidadeResumo = {
  nome: string;
  pedidos: number;
  faturamento: number;
  ticket: number;
  clientes: number;
  percPedidos: number;
  percFaturamento: number;
  evolucao: Serie[];
  kits: Rank[];
  faturamentoPorKit: Rank[];
  margem: number | null;
  custos: number;
};

function resumoModalidade(
  nome: string,
  pedidos: StoredOrder[],
  entregues: StoredOrder[],
  totalPedidos: number,
  totalFat: number,
  bs: Bucket[],
  custoPorContrato: Map<string, number>,
): ModalidadeResumo {
  const valorVendido = money(pedidos.reduce((total, o) => total + valorContrato(o), 0));
  const faturamento = money(entregues.reduce((total, o) => total + valorContrato(o), 0));
  const clientes = new Set(pedidos.map((o) => clienteKey(o) || `id:${o.id}`)).size;

  const evolucao: Serie[] = bs.map((b) => {
    const vendasLote = pedidos.filter((o) => {
      const d = dataFechamento(o);
      return d >= b.inicio && d <= b.fim;
    });
    const entregasLote = entregues.filter((o) => {
      const d = dataEvento(o);
      return d >= b.inicio && d <= b.fim;
    });
    const vendidoLote = money(vendasLote.reduce((total, o) => total + valorContrato(o), 0));
    const fat = money(entregasLote.reduce((total, o) => total + valorContrato(o), 0));
    return {
      label: b.label,
      Pedidos: vendasLote.length,
      Faturamento: fat,
      Ticket: vendasLote.length ? money(vendidoLote / vendasLote.length) : 0,
    };
  });

  const kitsMap = new Map<string, { qtd: number; valor: number }>();
  const kitsFatMap = new Map<string, { qtd: number; valor: number }>();
  for (const o of pedidos) bump(kitsMap, kitDe(o), valorContrato(o));
  for (const o of entregues) bump(kitsFatMap, kitDe(o), valorContrato(o));

  let custos = 0;
  let temCusto = false;
  for (const o of pedidos) {
    const c = custoPorContrato.get(o.id);
    if (c != null) { custos += c; temCusto = true; }
  }
  custos = money(custos);

  return {
    nome,
    pedidos: pedidos.length,
    faturamento,
    ticket: pedidos.length ? money(valorVendido / pedidos.length) : 0,
    clientes,
    percPedidos: totalPedidos ? (pedidos.length / totalPedidos) * 100 : 0,
    percFaturamento: totalFat ? (faturamento / totalFat) * 100 : 0,
    evolucao,
    kits: topN(kitsMap, 12, "qtd"),
    faturamentoPorKit: topN(kitsMap, 12, "valor"),
    margem: temCusto ? money(faturamento - custos) : null,
    custos,
  };
}

/* ================================ Resultado ================================ */

export type GestaoData = {
  periodo: Periodo;
  periodoAnterior: Periodo;
  geradoEm: string;

  kpis: Kpi[];
  resumo: Nucleo & { resultadoCaixa: number };
  comparativo: {
    label: string;
    atual: number;
    anterior: number;
    variacao: number | null;
    formato: "moeda" | "numero";
  }[];

  evolucao: Serie[];
  entradasSaidas: Serie[];
  recebidoAReceber: Serie[];

  modalidades: ModalidadeResumo[];
  participacao: Rank[];

  temasQtd: Rank[];
  temasValor: Rank[];
  kitsQtd: Rank[];
  kitsValor: Rank[];

  clientes: {
    unicos: number;
    novos: number;
    recorrentes: number;
    taxaRecorrencia: number | null;
    identificavel: boolean;
    evolucao: Serie[];
    topPorContratos: Rank[];
    topPorFaturamento: Rank[];
    origem: Rank[];
    origemDisponivel: boolean;
  };

  financeiro: {
    saidasPorCategoria: Rank[];
    comprasPrevisto: number;
    comprasReal: number;
    economia: number;
    comprasDisponivel: boolean;
    margemDisponivel: boolean;
    margemTotal: number | null;
    custosDiretos: number;
    lucroEstimado: number;
    margemLucroPercentual: number;
    lucroPorVenda: LucroVenda[];
    resultadoEvolucao: Serie[];
  };

  carteiraFutura: {
    mes: string;
    pedidos: number;
    vendido: number;
    recebido: number;
    aReceber: number;
  }[];

  operacao: {
    comprasRealizadas: number;
    valorCompras: number;
    itensProduzidos: number;
    kitsProntos: number;
    eventosRealizados: number;
    itensMaisComprados: Rank[];
    gastoPorMaterial: Rank[];
    itensMaisProduzidos: Rank[];
    volume: Serie[];
  };

  sazonalidade: {
    porMes: Serie[];
    porDiaSemana: Serie[];
    melhorMesPedidos: string | null;
    melhorMesFaturamento: string | null;
    antecedenciaMedia: number | null;
    distribuicaoAntecedencia: Rank[];
    ultimaHora: { faixa: string; qtd: number; perc: number }[];
    cancelamentos: { qtd: number; valor: number; taxa: number; disponivel: boolean };
  };

  destaques: { titulo: string; valor: string }[];
};

export function getGestaoData(snap: Snapshot, cursor: PeriodoCursor): GestaoData {
  const periodo = buildPeriodo(cursor);
  const anterior = buildPeriodo(moveCursor(cursor, -1));
  const bs = buckets(periodo);
  const idx = indexRecebimentos(snap.lancamentos);
  const hoje = new Date().toISOString().slice(0, 10);

  // KPIs realizados são acumulados somente até hoje.
  // A comparação usa a mesma quantidade de dias do período anterior.
  const fimAtual = fimRealizado(periodo, hoje);
  const fimAnterior = fimComparavelAnterior(periodo, anterior, fimAtual);
  const at = nucleo(snap, periodo, fimAtual);
  const ant = nucleo(snap, anterior, fimAnterior);
  const resultadoCaixa = money(at.recebido - at.saidas);

  const kpi = (
    label: string, valor: number, formato: Kpi["formato"], anteriorV?: number,
  ): Kpi => ({
    label, valor, formato,
    anterior: anteriorV,
    variacao: anteriorV == null ? null : variacao(valor, anteriorV),
    disponivel: true,
  });

  const kpis: Kpi[] = [
    kpi("Pedidos", at.pedidos.length, "numero", ant.pedidos.length),
    kpi("Vendas do mês", at.vendido, "moeda", ant.vendido),
    kpi("Faturamento", at.faturamento, "moeda", ant.faturamento),
    kpi("Ticket médio", at.ticket, "moeda", ant.ticket),
    kpi("Recebido", at.recebido, "moeda", ant.recebido),
    kpi("Saídas", at.saidas, "moeda", ant.saidas),
    kpi("A receber no período", at.aReceber, "moeda", ant.aReceber),
    ...(cursor.tipo === "anual"
      ? [kpi("Saldo total de clientes", at.saldoTotalClientes, "moeda")]
      : []),
    kpi("Clientes", at.clientes, "numero", ant.clientes),
  ];

  /* -------- Evolução temporal -------- */
  const evolucao: Serie[] = bs.map((b) => {
    const vendasLote = at.pedidos.filter((o) => {
      const d = dataFechamento(o);
      return d >= b.inicio && d <= b.fim;
    });
    const entregasLote = snap.orders.filter((o) => {
      if (cancelado(o)) return false;
      const ev = dataEvento(o);
      return !!fimAtual && !!ev && ev >= b.inicio && ev <= b.fim && ev <= fimAtual;
    });
    const vendidoLote = money(vendasLote.reduce((total, o) => total + valorContrato(o), 0));
    const fat = money(entregasLote.reduce((total, o) => total + valorContrato(o), 0));
    let receb = 0, sai = 0, aRec = 0;
    for (const l of snap.lancamentos) {
      const d = String(l.data || "").slice(0, 10);
      if (d < b.inicio || d > b.fim || !fimAtual || d > fimAtual || ehCaucaoLanc(l)) continue;
      if (l.tipo === "Entrada") {
        if (String(l.contratoId || "").trim()) receb += parseValor(l.valor);
      } else {
        sai += parseValor(l.valor);
      }
    }
    for (const o of snap.orders) {
      const ev = dataEvento(o);
      if (cancelado(o) || finalizado(o) || !ev || ev < b.inicio || ev > b.fim) continue;
      aRec += getContractPaymentStatus(o, idx).saldoReceber;
    }
    return {
      label: b.label,
      Faturado: fat,
      Recebido: money(receb),
      Saídas: money(sai),
      Resultado: money(receb - sai),
      "A receber": money(aRec),
      Pedidos: vendasLote.length,
      Ticket: vendasLote.length ? money(vendidoLote / vendasLote.length) : 0,
    };
  });

  const entradasSaidas = evolucao.map((e) => ({
    label: e.label, Entradas: e.Recebido, Saídas: e["Saídas"], Resultado: e.Resultado,
  })) as Serie[];
  const recebidoAReceber = evolucao.map((e) => ({
    label: e.label, Recebido: e.Recebido, "A receber": e["A receber"],
  })) as Serie[];

  /* -------- Custos diretos por contrato (OPs) -------- */
  const custoPorContrato = new Map<string, number>();
  const comprasNoPeriodo: { item: ItemCompra; op: OrdemProducao; data: string }[] = [];
  let comprasPrevisto = 0, comprasReal = 0, itensProduzidos = 0, kitsProntos = 0;
  const itensCompradosMap = new Map<string, { qtd: number; valor: number }>();
  const itensProduzidosMap = new Map<string, { qtd: number; valor: number }>();

  for (const op of snap.ops) {
    let custo = 0;
    let temCusto = false;
    for (const c of op.compras || []) {
      if (c.cancelado) continue;
      const st = compraStatusOf(c);
      const concluida = st === "Compra realizada" || st === "Pago";
      const data = toDateISO(c.dataCompra) || toDateISO(op.atualizadoEm) || toDateISO(op.criadoEm);
      if (concluida) {
        custo += valorRealCompra(c) || valorPrevistoCompra(c);
        temCusto = true;
      }
      if (concluida && dentroRealizado(periodo, fimAtual, data)) {
        comprasNoPeriodo.push({ item: c, op, data });
        comprasPrevisto += valorPrevistoCompra(c);
        comprasReal += valorRealCompra(c) || valorPrevistoCompra(c);
        const nome = String(c.descricao || "").trim() || NAO_CLASSIFICADO;
        bump(itensCompradosMap, nome, valorRealCompra(c) || valorPrevistoCompra(c), c.quantidade || 1);
      }
    }
    if (temCusto) custoPorContrato.set(op.contratoId, money(custo));

    const dataOp = toDateISO(op.atualizadoEm) || toDateISO(op.criadoEm);
    for (const pr of op.producao || []) {
      if (pr.status !== "Concluído") continue;
      if (!dentroRealizado(periodo, fimAtual, toDateISO(pr.prazo) || dataOp)) continue;
      itensProduzidos += pr.quantidade || 1;
      bump(itensProduzidosMap, String(pr.descricao || "").trim() || NAO_CLASSIFICADO, 0, pr.quantidade || 1);
    }
    if (op.kitProntoConfirmadoEm && dentroRealizado(periodo, fimAtual, toDateISO(op.kitProntoConfirmadoEm))) kitsProntos++;
  }

  /* -------- Modalidades (dinâmico) -------- */
  const entreguesPeriodo = snap.orders.filter((o) => {
    if (cancelado(o)) return false;
    const ev = dataEvento(o);
    return dentroRealizado(periodo, fimAtual, ev);
  });
  const nomesModalidade = new Set<string>([
    ...at.pedidos.map(modalidadeDe),
    ...entreguesPeriodo.map(modalidadeDe),
  ]);
  const modalidades = Array.from(nomesModalidade)
    .map((nome) => resumoModalidade(
      nome,
      at.pedidos.filter((o) => modalidadeDe(o) === nome),
      entreguesPeriodo.filter((o) => modalidadeDe(o) === nome),
      at.pedidos.length,
      at.faturamento,
      bs,
      custoPorContrato,
    ))
    .sort((a, b) => b.faturamento - a.faturamento);

  const participacao: Rank[] = modalidades.map((m) => ({
    nome: m.nome, valor: m.faturamento, qtd: m.pedidos,
  }));

  /* -------- Temas e kits (geral) -------- */
  const temasMap = new Map<string, { qtd: number; valor: number }>();
  const kitsMap = new Map<string, { qtd: number; valor: number }>();
  const temasFatMap = new Map<string, { qtd: number; valor: number }>();
  const kitsFatMap = new Map<string, { qtd: number; valor: number }>();
  for (const o of at.pedidos) {
    bump(temasMap, temaDe(o), valorContrato(o));
    bump(kitsMap, `${modalidadeDe(o)} — ${kitDe(o)}`, valorContrato(o));
  }
  for (const o of entreguesPeriodo) {
    bump(temasFatMap, temaDe(o), valorContrato(o));
    bump(kitsFatMap, `${modalidadeDe(o)} — ${kitDe(o)}`, valorContrato(o));
  }

  /* -------- Clientes -------- */
  const identificaveis = at.pedidos.filter((o) => clienteKey(o));
  const identificavel = at.pedidos.length > 0 && identificaveis.length / at.pedidos.length >= 0.6;

  const primeiraCompra = new Map<string, string>();
  const contratosPorCliente = new Map<string, { qtd: number; valor: number; nome: string }>();
  for (const o of snap.orders) {
    if (cancelado(o)) continue;
    const k = clienteKey(o);
    if (!k) continue;
    const d = dataFechamento(o);
    const prev = primeiraCompra.get(k);
    if (!prev || (d && d < prev)) primeiraCompra.set(k, d);
    const cur = contratosPorCliente.get(k) || { qtd: 0, valor: 0, nome: o.nome };
    cur.qtd++;
    cur.valor = money(cur.valor + valorContrato(o));
    cur.nome = cur.nome || o.nome;
    contratosPorCliente.set(k, cur);
  }

  const clientesPeriodo = new Set<string>();
  let novos = 0, recorrentes = 0;
  for (const o of identificaveis) {
    const k = clienteKey(o)!;
    if (clientesPeriodo.has(k)) continue;
    clientesPeriodo.add(k);
    if (primeiraCompra.get(k) === dataFechamento(o)) novos++; else recorrentes++;
  }

  const clientesEvolucao: Serie[] = bs.map((b) => {
    let n = 0, r = 0;
    const vistos = new Set<string>();
    for (const o of identificaveis) {
      const d = dataFechamento(o);
      if (d < b.inicio || d > b.fim) continue;
      const k = clienteKey(o)!;
      if (vistos.has(k)) continue;
      vistos.add(k);
      if (primeiraCompra.get(k) === d) n++; else r++;
    }
    return { label: b.label, Novos: n, Recorrentes: r };
  });

  const rankClientes = new Map<string, { qtd: number; valor: number }>();
  const rankClientesFat = new Map<string, { qtd: number; valor: number }>();
  for (const o of at.pedidos) {
    const nome = String(o.nome || "").trim() || NAO_CLASSIFICADO;
    bump(rankClientes, nome, valorContrato(o));
  }
  for (const o of entreguesPeriodo) {
    const nome = String(o.nome || "").trim() || NAO_CLASSIFICADO;
    bump(rankClientesFat, nome, valorContrato(o));
  }

  const origemMap = new Map<string, { qtd: number; valor: number }>();
  let comOrigem = 0;
  for (const o of at.pedidos) {
    const org = String(o.details?.origemCliente || "").trim();
    if (org) comOrigem++;
    bump(origemMap, org || NAO_CLASSIFICADO, valorContrato(o));
  }
  const origemDisponivel = at.pedidos.length > 0 && comOrigem / at.pedidos.length >= 0.5;

  /* -------- Financeiro: saídas por categoria -------- */
  const saidasCat = new Map<string, { qtd: number; valor: number }>();
  for (const l of snap.lancamentos) {
    const d = String(l.data || "").slice(0, 10);
    if (!dentroRealizado(periodo, fimAtual, d) || l.tipo !== "Saída" || ehCaucaoLanc(l)) continue;
    bump(saidasCat, String(l.categoria || "").trim() || NAO_CLASSIFICADO, parseValor(l.valor));
  }

  const custosDiretos = money(
    entreguesPeriodo.reduce((s, o) => s + (custoPorContrato.get(o.id) ?? 0), 0),
  );
  const margemDisponivel = entreguesPeriodo.some((o) => custoPorContrato.has(o.id));

  // LUCRO ESTIMADO (fase 1): só consideramos a festa apurada quando
  // existe ao menos uma compra/custo realmente vinculado ao contrato.
  const lucroPorVenda: LucroVenda[] = entreguesPeriodo
    .map((o) => {
      const valorVendido = valorContrato(o);
      const apurado = custoPorContrato.has(o.id);
      const compras = money(custoPorContrato.get(o.id) ?? 0);
      const lucroEstimado = apurado ? money(valorVendido - compras) : 0;
      return {
        contratoId: o.id,
        cliente: String(o.nome || "").trim() || NAO_CLASSIFICADO,
        tema: temaDe(o),
        modalidade: modalidadeDe(o),
        dataEvento: dataEvento(o),
        valorVendido,
        compras,
        lucroEstimado,
        margemPercentual: apurado && valorVendido > 0 ? (lucroEstimado / valorVendido) * 100 : 0,
        apurado,
      };
    })
    .sort((a, b) => Number(b.apurado) - Number(a.apurado) || b.lucroEstimado - a.lucroEstimado);

  const vendasApuradas = lucroPorVenda.filter((v) => v.apurado);
  const faturamentoApurado = money(vendasApuradas.reduce((total, venda) => total + venda.valorVendido, 0));
  const lucroEstimado = money(vendasApuradas.reduce((total, venda) => total + venda.lucroEstimado, 0));
  const margemLucroPercentual = faturamentoApurado > 0 ? (lucroEstimado / faturamentoApurado) * 100 : 0;
  kpis.push(
    kpi("Lucro estimado apurado", lucroEstimado, "moeda"),
    kpi("Margem estimada apurada", margemLucroPercentual, "percent"),
  );

  /* -------- Carteira futura (por data do evento) -------- */
  const futMap = new Map<string, { pedidos: number; vendido: number; recebido: number; aReceber: number }>();
  for (const o of snap.orders) {
    if (cancelado(o) || finalizado(o)) continue;
    const ev = dataEvento(o);
    if (!ev || ev < hoje) continue;
    const key = ev.slice(0, 7);
    const st = getContractPaymentStatus(o, idx);
    const cur = futMap.get(key) || { pedidos: 0, vendido: 0, recebido: 0, aReceber: 0 };
    cur.pedidos++;
    cur.vendido = money(cur.vendido + st.valorTotal);
    cur.recebido = money(cur.recebido + st.totalRecebido);
    cur.aReceber = money(cur.aReceber + st.saldoReceber);
    futMap.set(key, cur);
  }
  const carteiraFutura = Array.from(futMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 12)
    .map(([key, v]) => ({
      mes: `${nomeMes(Number(key.slice(5, 7)))}/${key.slice(0, 4)}`,
      pedidos: v.pedidos,
      vendido: v.vendido,
      recebido: v.recebido,
      aReceber: v.aReceber,
    }));

  /* -------- Operação -------- */
  const eventosRealizados = snap.orders.filter(
    (o) => !cancelado(o) && dentro(periodo, dataEvento(o)) && dataEvento(o) <= hoje,
  ).length;

  const volume: Serie[] = bs.map((b) => {
    const compras = comprasNoPeriodo.filter((c) => c.data >= b.inicio && c.data <= b.fim);
    const eventos = snap.orders.filter((o) => {
      const ev = dataEvento(o);
      return !cancelado(o) && !!fimAtual && ev >= b.inicio && ev <= b.fim && ev <= fimAtual;
    }).length;
    return {
      label: b.label,
      Compras: compras.length,
      "Gasto compras": money(compras.reduce((s, c) => s + (valorRealCompra(c.item) || valorPrevistoCompra(c.item)), 0)),
      Eventos: eventos,
    };
  });

  /* -------- Sazonalidade -------- */
  const porMesMap = new Map<number, { qtd: number; valor: number }>();
  for (const o of at.pedidos) {
    const ev = dataEvento(o) || dataFechamento(o);
    if (!ev) continue;
    const m = Number(ev.slice(5, 7));
    const cur = porMesMap.get(m) || { qtd: 0, valor: 0 };
    cur.qtd++;
    cur.valor = money(cur.valor + valorContrato(o));
    porMesMap.set(m, cur);
  }
  const porMes: Serie[] = MESES_CURTOS.map((label, i) => ({
    label,
    Festas: porMesMap.get(i + 1)?.qtd ?? 0,
    Faturamento: porMesMap.get(i + 1)?.valor ?? 0,
  }));
  const melhorMesPedidos = porMesMap.size
    ? nomeMes(Array.from(porMesMap.entries()).sort((a, b) => b[1].qtd - a[1].qtd)[0][0])
    : null;
  const melhorMesFaturamento = porMesMap.size
    ? nomeMes(Array.from(porMesMap.entries()).sort((a, b) => b[1].valor - a[1].valor)[0][0])
    : null;

  const dowMap = new Map<number, { qtd: number; valor: number }>();
  for (const o of at.pedidos) {
    const ev = dataEvento(o);
    const dw = diaSemana(ev);
    if (dw == null) continue;
    const cur = dowMap.get(dw) || { qtd: 0, valor: 0 };
    cur.qtd++;
    cur.valor = money(cur.valor + valorContrato(o));
    dowMap.set(dw, cur);
  }
  const porDiaSemana: Serie[] = DIAS_SEMANA.map((label, i) => ({
    label,
    Festas: dowMap.get(i)?.qtd ?? 0,
    Faturamento: dowMap.get(i)?.valor ?? 0,
  }));

  const antecedencias = at.pedidos
    .map((o) => {
      const f = dataFechamento(o); const e = dataEvento(o);
      if (!f || !e) return null;
      const d = diasEntre(f, e);
      return d >= 0 ? d : null;
    })
    .filter((d): d is number => d != null);

  const faixas: { nome: string; test: (d: number) => boolean }[] = [
    { nome: "0–7 dias", test: (d) => d <= 7 },
    { nome: "8–15", test: (d) => d >= 8 && d <= 15 },
    { nome: "16–30", test: (d) => d >= 16 && d <= 30 },
    { nome: "31–60", test: (d) => d >= 31 && d <= 60 },
    { nome: "61–90", test: (d) => d >= 61 && d <= 90 },
    { nome: "90+", test: (d) => d > 90 },
  ];
  const distribuicaoAntecedencia: Rank[] = faixas.map((f) => ({
    nome: f.nome, valor: antecedencias.filter(f.test).length, qtd: antecedencias.filter(f.test).length,
  }));

  const ultimaHora = [7, 15, 30].map((lim) => {
    const qtd = antecedencias.filter((d) => d <= lim).length;
    return {
      faixa: `Até ${lim} dias antes`,
      qtd,
      perc: antecedencias.length ? (qtd / antecedencias.length) * 100 : 0,
    };
  });

  const cancelados = snap.orders.filter((o) =>
    cancelado(o) && dentroRealizado(periodo, fimAtual, dataFechamento(o)),
  );
  const totalComCancelados = at.pedidos.length + cancelados.length;

  /* -------- Destaques -------- */
  const maiorContrato = [...at.pedidos].sort((a, b) => valorContrato(b) - valorContrato(a))[0];
  const topTemaQtd = topN(temasMap, 1, "qtd")[0];
  const topKit = topN(kitsMap, 1, "qtd")[0];
  const topClienteValor = topN(rankClientesFat, 1, "valor")[0];
  const modMaisVendida = [...modalidades].sort((a, b) => b.pedidos - a.pedidos)[0];
  const modMaiorFat = modalidades[0];
  const topLucro = lucroPorVenda[0];
  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const destaques = [
    maiorContrato && { titulo: "🏆 Maior contrato", valor: `${maiorContrato.nome} — ${fmt(valorContrato(maiorContrato))}` },
    modMaisVendida && { titulo: "🏆 Modalidade mais vendida", valor: `${modMaisVendida.nome} (${modMaisVendida.pedidos} pedidos)` },
    modMaiorFat && { titulo: "🏆 Modalidade com maior faturamento", valor: `${modMaiorFat.nome} — ${fmt(modMaiorFat.faturamento)}` },
    topKit && { titulo: "🏆 Kit mais vendido", valor: `${topKit.nome} (${topKit.qtd})` },
    topTemaQtd && { titulo: "🏆 Tema mais contratado", valor: `${topTemaQtd.nome} (${topTemaQtd.qtd})` },
    melhorMesFaturamento && { titulo: "🏆 Melhor mês em faturamento", valor: melhorMesFaturamento },
    melhorMesPedidos && { titulo: "🏆 Melhor mês em pedidos", valor: melhorMesPedidos },
    topClienteValor && { titulo: "🏆 Cliente com maior faturamento", valor: `${topClienteValor.nome} — ${fmt(topClienteValor.valor)}` },
    topLucro && { titulo: "💰 Maior lucro estimado", valor: `${topLucro.cliente} — ${fmt(topLucro.lucroEstimado)}` },
  ].filter(Boolean) as { titulo: string; valor: string }[];

  return {
    periodo,
    periodoAnterior: anterior,
    geradoEm: snap.geradoEm,
    kpis,
    resumo: { ...at, resultadoCaixa },
    comparativo: [
      { label: "Pedidos", atual: at.pedidos.length, anterior: ant.pedidos.length, variacao: variacao(at.pedidos.length, ant.pedidos.length), formato: "numero" },
      { label: "Faturamento", atual: at.faturamento, anterior: ant.faturamento, variacao: variacao(at.faturamento, ant.faturamento), formato: "moeda" },
      { label: "Ticket médio", atual: at.ticket, anterior: ant.ticket, variacao: variacao(at.ticket, ant.ticket), formato: "moeda" },
      { label: "Clientes", atual: at.clientes, anterior: ant.clientes, variacao: variacao(at.clientes, ant.clientes), formato: "numero" },
      { label: "Recebido", atual: at.recebido, anterior: ant.recebido, variacao: variacao(at.recebido, ant.recebido), formato: "moeda" },
    ],
    evolucao,
    entradasSaidas,
    recebidoAReceber,
    modalidades,
    participacao,
    temasQtd: topN(temasMap, 10, "qtd"),
    temasValor: topN(temasFatMap, 10, "valor"),
    kitsQtd: topN(kitsMap, 10, "qtd"),
    kitsValor: topN(kitsFatMap, 10, "valor"),
    clientes: {
      unicos: clientesPeriodo.size || at.clientes,
      novos,
      recorrentes,
      taxaRecorrencia: identificavel && clientesPeriodo.size
        ? (recorrentes / clientesPeriodo.size) * 100
        : null,
      identificavel,
      evolucao: clientesEvolucao,
      topPorContratos: topN(rankClientes, 10, "qtd"),
      topPorFaturamento: topN(rankClientesFat, 10, "valor"),
      origem: topN(origemMap, 8, "qtd"),
      origemDisponivel,
    },
    financeiro: {
      saidasPorCategoria: topN(saidasCat, 10, "valor"),
      comprasPrevisto: money(comprasPrevisto),
      comprasReal: money(comprasReal),
      economia: money(comprasPrevisto - comprasReal),
      comprasDisponivel: comprasNoPeriodo.length > 0,
      margemDisponivel,
      margemTotal: lucroEstimado,
      custosDiretos,
      lucroEstimado,
      margemLucroPercentual,
      lucroPorVenda,
      resultadoEvolucao: evolucao.map((e) => ({ label: e.label, Resultado: e.Resultado })) as Serie[],
    },
    carteiraFutura,
    operacao: {
      comprasRealizadas: comprasNoPeriodo.length,
      valorCompras: money(comprasReal),
      itensProduzidos,
      kitsProntos,
      eventosRealizados,
      itensMaisComprados: topN(itensCompradosMap, 10, "qtd"),
      gastoPorMaterial: topN(itensCompradosMap, 10, "valor"),
      itensMaisProduzidos: topN(itensProduzidosMap, 10, "qtd"),
      volume,
    },
    sazonalidade: {
      porMes,
      porDiaSemana,
      melhorMesPedidos,
      melhorMesFaturamento,
      antecedenciaMedia: antecedencias.length
        ? Math.round(antecedencias.reduce((s, d) => s + d, 0) / antecedencias.length)
        : null,
      distribuicaoAntecedencia,
      ultimaHora,
      cancelamentos: {
        qtd: cancelados.length,
        valor: money(cancelados.reduce((s, o) => s + valorContrato(o), 0)),
        taxa: totalComCancelados ? (cancelados.length / totalComCancelados) * 100 : 0,
        disponivel: snap.orders.some((o) => cancelado(o)),
      },
    },
    destaques,
  };
}

export { bucketDe };
