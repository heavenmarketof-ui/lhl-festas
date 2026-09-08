// ============================================================================
// CAMADA AGREGADORA ÚNICA DO DASHBOARD — LHL FESTAS
// ----------------------------------------------------------------------------
// Não existe base paralela: tudo aqui é DERIVADO das fontes oficiais já
// existentes (Contratos, Ordens de Produção, Solicitações Financeiras e
// Lançamentos). Nenhuma escrita acontece neste módulo — é somente leitura.
// Uma única passagem de cálculo alimenta cards, listas, alertas e agenda.
// ============================================================================

import { toDateISO } from "./date-utils";
import type { StoredOrder } from "./orders-storage";
import type { Lancamento } from "./financeiro-api";
import { parseValor, fmtBRL, fmtBRL as fmtMoedaBR } from "./financeiro-api";
import type { Solicitacao } from "./solicitacoes-types";
import { getContractPaymentStatus, indexRecebimentos } from "./pagamentos";
import {
  aguardandoConfirmacaoKit,
  comprasGlobais,
  compraStatusOf,
  compraAtiva,
  conferenciaCompleta,
  diasAte,
  isAtrasada,
  pendenciasOperacionais,
  producaoAtiva,
  progressPercent,
  stages,
  todayISO,
  addDaysISO,
  descricaoCompra,
  fmtDateBR,
  type CompraStatus,
  type OrdemProducao,
  determineNivelOperacional,
} from "./producao-api";

/* ============================ Urgência ============================ */
// Regra oficial: usa prioritariamente a DATA DA RETIRADA (o kit precisa estar
// pronto antes da festa). Sem retirada, usa a data da festa.

export type Urgencia4 = "urgente" | "atencao" | "normal" | "sem-data";

export const URG_LABEL: Record<Urgencia4, string> = {
  urgente: "Urgente",
  atencao: "Atenção",
  normal: "Normal",
  "sem-data": "Sem data",
};

export const URG_EMOJI: Record<Urgencia4, string> = {
  urgente: "🔴",
  atencao: "🟡",
  normal: "🟢",
  "sem-data": "⚪",
};

export const URG_CLASS: Record<Urgencia4, string> = {
  urgente: "bg-red-500/15 text-red-600 border-red-500/40",
  atencao: "bg-yellow-500/15 text-yellow-700 border-yellow-500/40",
  normal: "bg-emerald-500/15 text-emerald-600 border-emerald-500/40",
  "sem-data": "bg-muted text-muted-foreground border-border",
};

export const URG_PESO: Record<Urgencia4, number> = {
  urgente: 0,
  atencao: 1,
  normal: 2,
  "sem-data": 3,
};

export type Prazo = { base: string; dias: number | null; urgencia: Urgencia4 };

/** Prazo/urgência a partir da retirada (preferencial) ou da festa. */
export function prazoDe(retirada?: string, festa?: string): Prazo {
  const base = toDateISO(retirada) || toDateISO(festa) || "";
  if (!base) return { base: "", dias: null, urgencia: "sem-data" };
  const dias = diasAte(base);
  if (dias == null) return { base: "", dias: null, urgencia: "sem-data" };
  if (dias < 0 || dias <= 7) return { base, dias, urgencia: "urgente" };
  if (dias <= 15) return { base, dias, urgencia: "atencao" };
  return { base, dias, urgencia: "normal" };
}

export function textoDias(dias: number | null): string {
  if (dias == null) return "—";
  if (dias < 0) return `${Math.abs(dias)} dia(s) em atraso`;
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  return `em ${dias} dias`;
}

/* ============================ Tipos ============================ */

export type LinkAlvo = {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
};

export type CompraDash = {
  key: string;
  opId: string;
  contratoId: string;
  numeroOP: string;
  itemId: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  cliente: string;
  fornecedor: string;
  valorPrevisto: number;
  valorReal: number;
  formaPagamento: string;
  dataCompra: string;
  status: CompraStatus;
  retirada: string;
  festa: string;
  dias: number | null;
  urgencia: Urgencia4;
  responsavel: string;
  tema?: string;
  modalidade?: string;
  aniversariante?: string;
  solicitacaoId?: string;

  solicitacao?: Solicitacao;
  orcamentoIncompleto: boolean;
};

export type OrdemDash = {
  opId: string;
  contratoId: string;
  numero: string;
  cliente: string;
  aniversariante?: string;
  tema: string;
  modalidade: string;
  kit: string;
  retirada: string;
  festa: string;
  devolucao: string;
  dias: number | null;
  urgencia: Urgencia4;
  progresso: number;
  etapaAtual: string;
  atrasada: boolean;
  responsavel: string;
  comprasPend: boolean;
  producaoPend: boolean;
  aguardandoConfirmacao: boolean;
  kitPronto: boolean;
  /** Itens de compra ainda na fila ativa desta OP. */
  comprasPendentes: number;
  /** Itens de produção ainda na fila ativa desta OP. */
  producoesPendentes: number;
  /** 0 compras pendentes + 0 produções pendentes, aguardando confirmação humana. */
  tudoConcluido: boolean;
  semOrcamento: boolean;

  aguardandoAutorizacao: boolean;
  autorizadaNaoComprada: boolean;
  compradaNaoPaga: boolean;
  /** Legado: nenhum recebimento confirmado ainda (derivado da regra central). */
  semSinal: boolean;
  /** Saldo real a receber > 0 segundo getContractPaymentStatus. */
  pagamentoPendente: boolean;
  valorTotalContrato: number;
  totalRecebido: number;
  saldoReceber: number;
  devolucaoAtrasada: boolean;
  devolucaoConfirmada: boolean;
  isMontagem: boolean;
};

export type BlocoOcorrencia =
  | "tarefas"     // Próximas Tarefas (Ações imediatas)
  | "compras"     // Compras Pendentes
  | "producao";    // Produções Pendentes

export type Ocorrencia = {
  /** Identificador único: tipo + contrato + pedido + OP + item + etapa. */
  id: string;
  bloco: BlocoOcorrencia;
  titulo: string;
  descricao: string;
  cliente: string;
  tema?: string;
  modalidade?: string;
  aniversariante?: string;
  pedido: string;

  urgencia: Urgencia4;
  dataLimite: string;
  dias: number | null;
  acaoLabel: string;
  link: LinkAlvo;
  /** ID do item caso seja uma ocorrência de compra/produção. */
  itemId?: string;
  opId?: string;
  contratoId?: string;
  /** Metadados para diálogos de ação direta */
  quantidade?: number;
  unidade?: string;
  valorPrevisto?: number;
  /** 1 = mais crítico (ver regra de "Faça isso primeiro"). */
  prioridade: number;
};

export type CardDash = {
  key: string;
  label: string;
  valor: number | string;
  tom: "neutro" | "alerta" | "ok" | "info";
  link: LinkAlvo;
};

export type FiltroDashboard = {
  /** "todos" | "hoje" | "7" | "15" | "30" */
  periodo?: string;
  urgencia?: string;
  responsavel?: string;
  modalidade?: string;
  kit?: string;
  status?: string;
};

export type DashboardData = {
  cards: CardDash[];
  compras: CompraDash[];
  comprasPainel: {
    aguardandoOrcamento: number;
    orcamentoRecebido: number;
    prontosAprovacao: number;
    aguardandoAutorizacao: number;
    autorizadas: number;
    realizadas: number;
    aguardandoPagamento: number;
    pagas: number;
    urgentes: number;
    valorPrevisto: number;
    valorAguardandoAutorizacao: number;
    valorAutorizado: number;
    valorComprado: number;
    valorAguardandoPagamento: number;
    valorPago: number;
  };
  itensAOrcar: CompraDash[];
  prontosAprovacao: CompraDash[];
  aguardandoAutorizacao: CompraDash[];
  liberadosCompra: CompraDash[];
  aguardandoPagamento: CompraDash[];
  ordens: OrdemDash[];
  producaoPainel: {
    abertas: number;
    atrasadas: number;
    producaoPendente: number;
    producaoAndamento: number;
    producaoConcluida: number;
    producaoAtiva: number;
    separacaoPendente: number;
    conferenciaPendente: number;
    kitsProntos: number;
    aguardandoConfirmacao: number;
  };
  /** OPs com 0 compras e 0 produções pendentes aguardando confirmação humana. */
  confirmacoesKit: OrdemDash[];

  ordensPrioritarias: OrdemDash[];
  agenda: {
    hoje: OrdemDash[];
    amanha: OrdemDash[];
    proximos7: OrdemDash[];
    quinzena: OrdemDash[];
    proximos30: OrdemDash[];
    devolucoesPrevistas: OrdemDash[];
    devolucoesAtrasadas: OrdemDash[];
  };
  financeiro: {
    solicitacoesPendentes: number;
    valorPendenteAutorizacao: number;
    autorizadasHoje: number;
    valorAutorizadoHoje: number;
    comprasHoje: number;
    pagamentosHoje: number;
    lancamentosHoje: number;
    entradasDia: number;
    saidasDia: number;
    saldoDia: number;
    entradasSemana: number;
    saidasSemana: number;
    saldoSemana: number;
    saldoAtual: number;
  };
  facaPrimeiro: Ocorrencia | null;
  tarefas: Ocorrencia[];
  clientes: Ocorrencia[];
  comprasPend: Ocorrencia[];
  producoesPend: Ocorrencia[];
};

/* ============================ Helpers ============================ */

const num = (v: unknown) => {
  const s = String(v ?? "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const dentroPeriodo = (base: string, periodo?: string) => {
  if (!periodo || periodo === "todos") return true;
  if (!base) return false;
  const hoje = todayISO();
  if (periodo === "hoje") return base === hoje;
  const dias = periodo === "7" ? 7 : periodo === "15" ? 15 : 30;
  return base >= hoje && base <= addDaysISO(dias);
};

function etapaAtualDe(op: OrdemProducao): string {
  const nivel = determineNivelOperacional(op);
  if (nivel === "finalizado") return "Finalizado";
  if (nivel === "kit-pronto") return "Kit pronto";
  if (nivel === "pendente") {
     const p = pendenciasOperacionais(op);
     if (p.compras > 0 && p.producao > 0) return "Compras + Produção";
     if (p.compras > 0) return "Compras";
     return "Produção";
  }
  return "Em aberto";
}

/* ============================ Agregação ============================ */

export function buildDashboard(input: {
  orders: StoredOrder[];
  ops: OrdemProducao[];
  solicitacoes: Solicitacao[];
  lancamentos: Lancamento[];
  filtro?: FiltroDashboard;
}): DashboardData {
  const { orders, ops, lancamentos } = input;
  const solicitacoes = input.solicitacoes || [];
  const f = input.filtro || {};
  const hoje = todayISO();
  const amanha = addDaysISO(1);

  const solPorItem = new Map<string, Solicitacao>();
  const solPorOrigem = new Map<string, Solicitacao>();
  for (const s of solicitacoes) {
    if (s && s.id) {
       if (s.origemItemId) solPorItem.set(s.origemItemId, s);
       // Mapeamento por origem composta (pedido + descricao) para reconciliar legados sem origemItemId
       const key = `${s.pedidoId}-${s.descricao}`.toLowerCase();
       solPorOrigem.set(key, s);
    }
  }

  const orderOf = (id: string) => orders.find((o) => o && o.id === id);


  // Fonte única da verdade dos recebimentos confirmados (exclui caução).
  const lancs = lancamentos || [];
  const recebimentos = indexRecebimentos(lancs);


  /* ---------------- Ordens de Produção ---------------- */

  const ordensTodas: OrdemDash[] = (ops || [])
    .filter((op) => {
      if (!op) return false;
      // Pedido desaparece do Dashboard Operacional se:
      // 1. Está explicitamente Finalizado OU
      // 2. O contrato vinculado já devolveu caução (encerrado comercialmente).
      if (op.status === "Finalizado") return false;
      const order = orderOf(op.contratoId);
      // REGRA NOVA: Confirmar Devolução encerra operacionalmente.
      if (order && (order.details?.devolucaoConfirmada === "Sim" || order.details?.caucaoDevolvida === "Sim")) return false;
      return true;
    })

    .map((op) => {
      const order = orderOf(op.contratoId);
      const d = order?.details;
      const pag = getContractPaymentStatus(order, recebimentos);
      const retirada = toDateISO(d?.dataRetirada) || "";
      const festa = toDateISO(d?.dataEvento) || "";
      const devolucao = toDateISO(d?.dataDevolucao) || "";

      const prazo = prazoDe(retirada, festa);
      const opOps = ops || [];
      const opFull = opOps.find(x => x && x.id === op.id) || op;

      // RECONCILIAÇÃO OP x SOLICITAÇÃO (Evidência mais avançada vence)
      if (opFull.compras) {
        opFull.compras = opFull.compras.map(c => {
          const sol = solPorItem.get(c.id) || solPorOrigem.get(`${op.contratoId}-${c.descricao}`.toLowerCase());
          
          // 1. EVIDÊNCIA MÁXIMA: Lançamento financeiro vinculado diretamente
          const temLancamento = (lancamentos || []).some(l => 
            l.tipo === "Saída" && (
              (c.solicitacaoId && l.origem === `solicitacao-${c.solicitacaoId}`) ||
              (sol?.id && l.origem === `solicitacao-${sol.id}`) ||
              (l.descricao.includes(c.descricao) && l.descricao.includes(c.id.slice(0, 8)))
            )
          );

          if (temLancamento && c.statusCompra !== 'Pago' && c.statusCompra !== 'Compra realizada') {
            return { ...c, comprado: true, statusCompra: 'Compra realizada', valorReal: c.valorReal || c.valorOrcado };
          }

          if (sol) {
            // Se a solicitação está paga, o item na OP deve estar pago.
            if (sol.status === 'lancada' && c.statusCompra !== 'Pago') {
              return { ...c, comprado: true, pago: true, statusCompra: 'Pago', valorReal: sol.valor };
            }
            // Se a solicitação está autorizada, o item na OP deve estar no mínimo autorizado.
            if (sol.status === 'autorizada' && !c.comprado) {
               const idxAtual = ["Aguardando orçamento", "Orçamento recebido", "Aguardando autorização", "Compra autorizada"].indexOf(c.statusCompra || "Aguardando orçamento");
               if (idxAtual < 3) return { ...c, statusCompra: 'Compra autorizada' };
            }
          }
          return c;
        });
      }
      
      const st = stages(opFull);

      const compras = (opFull.compras || []).filter((c) => c && !c.cancelado);
      const pend = pendenciasOperacionais(opFull);

      const responsavel =
        (opFull.producao || []).map((p) => p && String(p.responsavel ?? "")).find(Boolean) ||
        (opFull.compras || []).map((c) => c && String(c.responsavel ?? "")).find(Boolean) ||
        "";

      return {
        comprasPendentes: pend.compras,
        producoesPendentes: pend.producao,
        tudoConcluido: aguardandoConfirmacaoKit(opFull),
        opId: op.id,
        contratoId: op.contratoId,
        numero: op.numero,
        cliente: order?.nome || "—",
        aniversariante: d?.nomeAniversariante,
        tema: order?.tema || "",
        modalidade: order?.modalidade || "",
        kit: order?.plano || "",
        retirada,
        festa,
        devolucao,
        dias: prazo.dias,
        urgencia: prazo.urgencia,
        progresso: progressPercent(op),
        etapaAtual: etapaAtualDe(op),
        atrasada: isAtrasada(op, order),
        responsavel,
        comprasPend: !st[0].done,
        producaoPend: !st[1].done,
        aguardandoConfirmacao: aguardandoConfirmacaoKit(opFull),
        kitPronto: opFull.status === "Kit Pronto",

        semOrcamento: compras.some((c) => compraStatusOf(c) === "Aguardando orçamento" || c.descricao.toLowerCase().includes("jogo")),
        aguardandoAutorizacao: compras.some(
          (c) => compraStatusOf(c) === "Aguardando autorização",
        ),
        autorizadaNaoComprada: compras.some((c) => compraStatusOf(c) === "Compra autorizada"),
        compradaNaoPaga: compras.some((c) => compraStatusOf(c) === "Compra realizada"),
        semSinal: pag.totalRecebido <= 0 && pag.valorTotal > 0 && !pag.origemLegado,
        pagamentoPendente: pag.saldoReceber > 0 && !pag.origemLegado,
        valorTotalContrato: pag.valorTotal,
        totalRecebido: pag.totalRecebido,
        saldoReceber: pag.saldoReceber,
        devolucaoAtrasada:
          !!devolucao &&
          devolucao < hoje &&
          (d?.devolucaoConfirmada || "Não") !== "Sim" &&
          opFull.status !== "Finalizado",
        devolucaoConfirmada: (d?.devolucaoConfirmada || "Não") === "Sim",
        isMontagem: (d?.servicoMontagem || "Não") === "Sim",
      } satisfies OrdemDash;
    });

  const passaFiltroOrdem = (o: OrdemDash) =>
    (!f.urgencia || f.urgencia === "todas" || o.urgencia === f.urgencia) &&
    (!f.modalidade || o.modalidade === f.modalidade) &&
    (!f.kit || o.kit === f.kit) &&
    (!f.responsavel || String(o.responsavel ?? "").toLowerCase().includes(f.responsavel.toLowerCase())) &&
    (!f.status || o.etapaAtual === f.status) &&
    dentroPeriodo(o.retirada || o.festa, f.periodo);

  const ordens = ordensTodas.filter(passaFiltroOrdem);

  /* ---------------- Compras (Lista Geral, em tempo real) ---------------- */

  const comprasBrutas = comprasGlobais(ops || [], orders || []);
  const comprasTodas: CompraDash[] = comprasBrutas.map((l) => {
    const order = l.order;
    const festa = toDateISO(order?.details?.dataEvento) || "";
    const prazo = prazoDe(l.retirada, festa);
    const sol = solPorItem.get(l.item.id);
    return {
      key: l.key,
      opId: l.op.id,
      contratoId: l.op.contratoId,
      numeroOP: l.op.numero,
      itemId: l.item.id,
      descricao: descricaoCompra(l.item),
      quantidade: l.item.quantidade || 1,
      unidade: l.item.unidade || "un",
      cliente: l.cliente,
      fornecedor: l.item.fornecedor || "",
      valorPrevisto: l.valorPrevisto,
      valorReal: l.valorReal,
      formaPagamento: l.item.formaPagamento || "",
      dataCompra: l.item.dataCompra || "",
      status: l.status,
      retirada: l.retirada,
      festa,
      dias: prazo.dias,
      urgencia: prazo.urgencia,
      responsavel: String(l.responsavel ?? ""),
      tema: order?.tema || "",
      modalidade: order?.modalidade || "",
      aniversariante: order?.details?.nomeAniversariante || "",
      solicitacaoId: l.item.solicitacaoId || sol?.id,

      solicitacao: sol,
      orcamentoIncompleto: !l.item.fornecedor || !l.item.valorOrcado,
    } satisfies CompraDash;
  });

  const compras = comprasTodas.filter(
    (c) =>
      (!f.urgencia || f.urgencia === "todas" || c.urgencia === f.urgencia) &&
      (!f.responsavel || String(c.responsavel ?? "").toLowerCase().includes(f.responsavel.toLowerCase())) &&
      dentroPeriodo(c.retirada || c.festa, f.periodo || "30"),
  );

  const porStatus = (s: CompraStatus) => compras.filter((c) => c.status === s);
  const soma = (list: CompraDash[], real = false) =>
    list.reduce((a, c) => a + (real ? c.valorReal || c.valorPrevisto : c.valorPrevisto), 0);

  const ordenar = (list: CompraDash[]) =>
    [...list].sort((a, b) => {
      const ua = URG_PESO[a.urgencia];
      const ub = URG_PESO[b.urgencia];
      if (ua !== ub) return ua - ub;
      return (a.retirada || "9999").localeCompare(b.retirada || "9999");
    });

  const itensAOrcar = ordenar(
    compras.filter((c) => c.status === "Aguardando orçamento" || (c.status === "Orçamento recebido" && c.orcamentoIncompleto)),
  );
  const prontosAprovacao = ordenar(
    compras.filter((c) => c.status === "Orçamento recebido" && !c.orcamentoIncompleto),
  );
  const aguardandoAutorizacao = ordenar(porStatus("Aguardando autorização"));
  const liberadosCompra = ordenar(porStatus("Compra autorizada"));
  const aguardandoPagamento = ordenar(porStatus("Compra realizada"));
  const pagas = porStatus("Pago");

  const comprasPainel = {
    aguardandoOrcamento: porStatus("Aguardando orçamento").length,
    orcamentoRecebido: porStatus("Orçamento recebido").length,
    prontosAprovacao: prontosAprovacao.length,
    aguardandoAutorizacao: aguardandoAutorizacao.length,
    autorizadas: liberadosCompra.length,
    realizadas: aguardandoPagamento.length,
    aguardandoPagamento: aguardandoPagamento.length,
    pagas: pagas.length,
    urgentes: compras.filter((c) => c.urgencia === "urgente" && c.status !== "Pago").length,
    valorPrevisto: soma(compras.filter((c) => c.status !== "Pago")),
    valorAguardandoAutorizacao: soma(aguardandoAutorizacao),
    valorAutorizado: soma(liberadosCompra),
    valorComprado: soma(aguardandoPagamento, true) + soma(pagas, true),
    valorAguardandoPagamento: soma(aguardandoPagamento, true),
    valorPago: soma(pagas, true),
  };

  /* ---------------- Produção ---------------- */

  const producaoItens = ops
    .filter((op) => op.status !== "Finalizado")
    .flatMap((op) => op.producao || []);

  // Contadores refletem apenas itens ATIVOS (item produzido deixa de contar).
  const producaoPainel = {
    abertas: ordens.length,
    atrasadas: ordens.filter((o) => o.atrasada).length,
    producaoPendente: producaoItens.filter((p) => p.status === "Pendente").length,
    producaoAndamento: producaoItens.filter((p) => p.status === "Em Produção").length,
    producaoConcluida: producaoItens.filter((p) => p.status === "Concluído").length,
    producaoAtiva: producaoItens.filter(producaoAtiva).length,
    separacaoPendente: 0,
    conferenciaPendente: 0,

    kitsProntos: ordens.filter((o) => o.kitPronto).length,
    aguardandoConfirmacao: ordens.filter((o) => o.tudoConcluido).length,
  };

  /** OPs sem nenhuma pendência aguardando a confirmação humana de Kit Pronto. */
  const confirmacoesKit = ordens
    .filter((o) => o.tudoConcluido)
    .sort((a, b) => (a.retirada || "9999").localeCompare(b.retirada || "9999"));


  const pesoOrdem = (o: OrdemDash) => {
    if (o.atrasada) return 0;
    if (o.comprasPend) return 1;
    if (o.producaoPend) return 2;
    return 5;

  };

  const ordensPrioritarias = [...ordens]
    .sort((a, b) => {
      const ra = a.retirada || "9999";
      const rb = b.retirada || "9999";
      if (ra !== rb) return ra.localeCompare(rb);
      return pesoOrdem(a) - pesoOrdem(b);
    })
    .slice(0, 12);

  /* ---------------- Agenda ---------------- */

  const entre = (iso: string, ini: string, fim: string) => !!iso && iso >= ini && iso <= fim;
  const agenda = {
    hoje: ordens.filter((o) => o.retirada === hoje),
    amanha: ordens.filter((o) => o.retirada === amanha),
    proximos7: ordens.filter((o) => entre(o.retirada, hoje, addDaysISO(7))),
    quinzena: ordens.filter((o) => entre(o.retirada, hoje, addDaysISO(15))),
    proximos30: ordens.filter((o) => entre(o.retirada, hoje, addDaysISO(30))),
    devolucoesPrevistas: ordens.filter((o) => entre(o.devolucao, hoje, addDaysISO(30))),
    devolucoesAtrasadas: ordens.filter((o) => o.devolucaoAtrasada),
  };

  /* ---------------- Financeiro (somente leitura) ---------------- */

  const semanaIni = addDaysISO(-6);
  const diaDe = (l: Lancamento) => String(l.data ?? "").slice(0, 10);
  const entradasDia = (lancamentos || [])
    .filter((l) => diaDe(l) === hoje && l.tipo === "Entrada")
    .reduce((a, l) => a + parseValor(l.valor), 0);
  const saidasDia = (lancamentos || [])
    .filter((l) => diaDe(l) === hoje && l.tipo === "Saída")
    .reduce((a, l) => a + parseValor(l.valor), 0);
  const entradasSemana = (lancamentos || [])
    .filter((l) => diaDe(l) >= semanaIni && l.tipo === "Entrada")
    .reduce((a, l) => a + parseValor(l.valor), 0);
  const saidasSemana = (lancamentos || [])
    .filter((l) => diaDe(l) >= semanaIni && l.tipo === "Saída")
    .reduce((a, l) => a + parseValor(l.valor), 0);

  const pendentesFin = solicitacoes.filter((s) => s.status === "pendente");
  const autorizadasHoje = solicitacoes.filter(
    (s) => (s.autorizadoEm || "").slice(0, 10) === hoje,
  );
  const lancadasHoje = solicitacoes.filter((s) => (s.lancadoEm || "").slice(0, 10) === hoje);

  const financeiro = {
    solicitacoesPendentes: pendentesFin.length,
    valorPendenteAutorizacao: pendentesFin.reduce((a, s) => a + num(s.valor), 0),
    autorizadasHoje: autorizadasHoje.length,
    valorAutorizadoHoje: autorizadasHoje.reduce((a, s) => a + num(s.valor), 0),
    comprasHoje: comprasTodas.filter((c) => c.dataCompra === hoje).length,
    pagamentosHoje: lancadasHoje.length,
    lancamentosHoje: (lancamentos || []).filter((l) => diaDe(l) === hoje).length,
    entradasDia,
    saidasDia,
    saldoDia: entradasDia - saidasDia,
    entradasSemana,
    saidasSemana,
    saldoSemana: entradasSemana - saidasSemana,
    saldoAtual: recebimentos.saldoAcumulado,
  };

  /* ---------------- Ocorrências (4 Blocos Principais) ---------------- */
  
  const oc: Ocorrencia[] = [];
  const linkOP = (contratoId: string): LinkAlvo => ({
    to: "/admin/producao/$id",
    params: { id: contratoId },
  });

  // 1. Bloco de Compras Pendentes (Apenas Mês Atual + Autorizadas/Urgentes)
  const pushCompraPendente = (c: CompraDash) => {
    if (!compraStatusOf({ id: c.itemId, statusCompra: c.status } as any).includes("autorizada") && c.urgencia !== "urgente") return;
    
    // Filtro Mês Atual: Compras autorizadas têm data de retirada/festa.
    // Dashboard operacional foca no mês corrente.
    if (!dentroPeriodo(c.retirada || c.festa, f.periodo || "30")) return;

    if (c.status === "Compra realizada" || c.status === "Pago") return;
    if (c.solicitacao?.status === "lancada") return;

    let acao = "Registrar compra";
    let link: LinkAlvo = linkOP(c.contratoId);

    if (c.status === "Aguardando orçamento") acao = "Registrar orçamento";
    if (c.status === "Orçamento recebido") acao = "Enviar p/ aprovação";
    if (c.status === "Aguardando autorização") {
      acao = "Ver solicitação";
      link = c.solicitacaoId 
        ? { to: "/admin/solicitacoes/$id", params: { id: c.solicitacaoId } }
        : { to: "/admin/solicitacoes", search: { status: "pendente" } };
    }

    oc.push({
      id: `compra|${c.itemId}`,
      bloco: "compras",
      titulo: c.descricao,
      descricao: `${c.cliente} · Qtd. ${c.quantidade} ${c.unidade} · ${fmtBRL(c.valorPrevisto || 0)}`,
      cliente: c.cliente,
      tema: c.tema,
      modalidade: c.modalidade,
      aniversariante: c.aniversariante,
      pedido: c.numeroOP,
      urgencia: c.urgencia,
      dataLimite: c.retirada || c.festa,
      dias: c.dias,
      acaoLabel: acao,
      link,
      itemId: c.itemId,
      opId: c.opId,
      contratoId: c.contratoId,
      prioridade: c.urgencia === "urgente" ? 10 : 20,
      quantidade: c.quantidade,
      unidade: c.unidade,
      valorPrevisto: c.valorPrevisto,
    });
  };

  comprasTodas.forEach(pushCompraPendente);

  // 2. Bloco de Produções Pendentes (Apenas Mês Atual)
  const producaoPendentes = ordensTodas.flatMap(o => {
    if (!dentroPeriodo(o.retirada || o.festa, f.periodo || "30")) return [];
    const pends = ((ops || []).find(x => x && x.id === o.opId)?.producao || []).filter(p => p && producaoAtiva(p));
    return pends.map(p => ({ o, p }));
  });

  producaoPendentes.forEach(({ o, p }) => {
    oc.push({
      id: `producao|${p.id}`,
      bloco: "producao",
      titulo: p.descricao,
      descricao: `${o.cliente} · OP ${o.numero} · ${p.responsavel || "Sem resp."}`,
      cliente: o.cliente,
      tema: o.tema,
      modalidade: o.modalidade,
      aniversariante: o.aniversariante,
      pedido: o.numero,
      urgencia: o.urgencia,
      dataLimite: o.retirada || o.festa,
      dias: o.dias,
      acaoLabel: "Marcar como produzido",
      link: linkOP(o.contratoId),
      itemId: p.id,
      opId: o.opId,
      contratoId: o.contratoId,
      prioridade: o.urgencia === "urgente" ? 10 : 20,
    });
  });

  // 3. Próximas Tarefas (Ações objetivas)
  confirmacoesKit.forEach(o => {
    oc.push({
      id: `kit-pronto|${o.opId}`,
      bloco: "tarefas",
      titulo: "Confirmar Kit Pronto",
      descricao: `Todos os itens concluídos para ${o.cliente}`,
      cliente: o.cliente,
      tema: o.tema,
      modalidade: o.modalidade,
      aniversariante: o.aniversariante,
      pedido: o.numero,
      urgencia: "urgente",
      dataLimite: o.retirada || o.festa,
      dias: o.dias,
      acaoLabel: "Confirmar Kit Pronto",
      link: linkOP(o.contratoId),
      prioridade: 1,
    });
  });

  ordensTodas.filter(o => o && o.pagamentoPendente && o.urgencia === "urgente" && !o.aguardandoConfirmacao && !o.kitPronto).forEach(o => {
    oc.push({
      id: `pagamento|${o.contratoId}`,
      bloco: "tarefas",
      titulo: o.totalRecebido > 0 ? "Saldo Pendente" : "Aguardando Sinal",
      descricao: `${o.cliente} · Saldo: ${fmtMoedaBR(o.saldoReceber)}`,
      cliente: o.cliente,
      tema: o.tema,
      modalidade: o.modalidade,
      aniversariante: o.aniversariante,
      pedido: o.numero,
      urgencia: "urgente",
      dataLimite: o.retirada || o.festa,
      dias: o.dias,
      acaoLabel: "Ver financeiro",
      link: { to: "/admin/$id", params: { id: o.contratoId } },
      prioridade: 5,
    });
  });

  ordensTodas.filter(o => o && o.devolucaoAtrasada).forEach(o => {
    oc.push({
      id: `devolucao|${o.contratoId}`,
      bloco: "tarefas",
      titulo: "Devolução Atrasada",
      descricao: `${o.cliente} · Era para ${fmtDateBR(o.devolucao)}`,
      cliente: o.cliente,
      tema: o.tema,
      modalidade: o.modalidade,
      aniversariante: o.aniversariante,
      pedido: o.numero,
      urgencia: "urgente",
      dataLimite: o.devolucao,
      dias: o.dias,
      acaoLabel: "Confirmar devolução",
      link: { to: "/admin/$id", params: { id: o.contratoId } },
      prioridade: 2,
    });
  });

  ordensTodas.forEach(o => {
    if (!o) return;
    const isRetiradaProx = (o.retirada === hoje || o.retirada === amanha) && !o.kitPronto && !o.aguardandoConfirmacao;
    const isDevolucaoProx = (o.devolucao === hoje || o.devolucao === amanha) && !o.devolucaoConfirmada;

    if (isRetiradaProx) {
      oc.push({
        id: `retirada|${o.contratoId}`,
        bloco: "tarefas",
        titulo: "Confirmar Retirada",
        descricao: `${o.cliente} · ${o.retirada === hoje ? "HOJE" : "AMANHÃ"}`,
        cliente: o.cliente,
        tema: o.tema,
        modalidade: o.modalidade,
        aniversariante: o.aniversariante,
        pedido: o.numero,
        urgencia: o.retirada === hoje ? "urgente" : "atencao",
        dataLimite: o.retirada,
        dias: o.dias,
        acaoLabel: "Confirmar retirada",
        link: { to: "/admin/$id", params: { id: o.contratoId } },
        prioridade: 3,
      });
    }

    if (isDevolucaoProx) {
      oc.push({
        id: `devolucao-prox|${o.contratoId}`,
        bloco: "tarefas",
        titulo: "Confirmar Devolução",
        descricao: `${o.cliente} · ${o.devolucao === hoje ? "HOJE" : "AMANHÃ"}`,
        cliente: o.cliente,
        tema: o.tema,
        modalidade: o.modalidade,
        aniversariante: o.aniversariante,
        pedido: o.numero,
        urgencia: o.devolucao === hoje ? "urgente" : "atencao",
        dataLimite: o.devolucao,
        dias: o.dias,
        acaoLabel: "Confirmar devolução",
        link: { to: "/admin/$id", params: { id: o.contratoId } },
        prioridade: 4,
      });
    }
  });

  const tarefas = oc.filter(x => x.bloco === "tarefas").sort((a,b) => a.prioridade - b.prioridade);
  const comprasPend = oc.filter(x => x.bloco === "compras").sort((a,b) => {
    const ua = URG_PESO[a.urgencia];
    const ub = URG_PESO[b.urgencia];
    if (ua !== ub) return ua - ub;
    return (a.dataLimite || "9").localeCompare(b.dataLimite || "9");
  });
  const producoesPend = oc.filter(x => x.bloco === "producao").sort((a,b) => {
    const ua = URG_PESO[a.urgencia];
    const ub = URG_PESO[b.urgencia];
    if (ua !== ub) return ua - ub;
    return (a.dataLimite || "9").localeCompare(b.dataLimite || "9");
  });

  const facaPrimeiro = tarefas[0] || null;
  const clientes: Ocorrencia[] = []; // Removido do Dashboard ativo

  const excluir = (list: CompraDash[], etapa: string) => list;

  /* ---------------- Cards ---------------- */

  const prod = (filtro: string): LinkAlvo => ({ to: "/admin/producao", search: { filtro } });
  const etapa = (etapaKey: string): LinkAlvo => ({
    to: "/admin/producao",
    search: { etapa: etapaKey },
  });

  const cards: CardDash[] = [
    { key: "ops", label: "Ordens de Produção abertas", valor: producaoPainel.abertas, tom: "neutro", link: { to: "/admin/producao" } },
    { key: "ops-atr", label: "Ordens atrasadas", valor: producaoPainel.atrasadas, tom: producaoPainel.atrasadas ? "alerta" : "ok", link: etapa("urgentes") },
    { key: "orcar", label: "Itens aguardando orçamento", valor: comprasPainel.aguardandoOrcamento, tom: comprasPainel.aguardandoOrcamento ? "alerta" : "ok", link: prod("sem-orcamento") },
    { key: "orcado", label: "Orçamentos recebidos", valor: comprasPainel.orcamentoRecebido, tom: "info", link: prod("orcamento-recebido") },
    { key: "prontos", label: "Prontos para aprovação", valor: comprasPainel.prontosAprovacao, tom: comprasPainel.prontosAprovacao ? "alerta" : "ok", link: prod("orcamento-recebido") },
    { key: "pend-aut", label: "Solicitações pendentes", valor: financeiro.solicitacoesPendentes, tom: financeiro.solicitacoesPendentes ? "alerta" : "ok", link: { to: "/admin/solicitacoes", search: { status: "pendente" } } },
    { key: "autorizadas", label: "Compras autorizadas", valor: comprasPainel.autorizadas, tom: "info", link: prod("autorizada") },
    { key: "realizadas", label: "Compras realizadas", valor: comprasPainel.realizadas, tom: "info", link: prod("realizada") },
    { key: "pagar", label: "Pagamentos pendentes", valor: comprasPainel.aguardandoPagamento, tom: comprasPainel.aguardandoPagamento ? "alerta" : "ok", link: prod("realizada") },
    { key: "pagos", label: "Itens pagos", valor: comprasPainel.pagas, tom: "ok", link: prod("pago") },
    { key: "prod-pend", label: "Produções pendentes", valor: producaoPainel.producaoPendente, tom: producaoPainel.producaoPendente ? "alerta" : "ok", link: etapa("producao") },
    { key: "prod-and", label: "Produções em andamento", valor: producaoPainel.producaoAndamento, tom: "info", link: etapa("producao") },
    { key: "kits", label: "Kits prontos", valor: producaoPainel.kitsProntos, tom: "ok", link: etapa("kits") },

    { key: "retiradas", label: "Retiradas próximas (7d)", valor: agenda.proximos7.length, tom: "info", link: etapa("retiradas") },
    { key: "dev", label: "Devoluções previstas", valor: agenda.devolucoesPrevistas.length, tom: "neutro", link: { to: "/admin/contratos" } },
    { key: "dev-atr", label: "Devoluções atrasadas", valor: agenda.devolucoesAtrasadas.length, tom: agenda.devolucoesAtrasadas.length ? "alerta" : "ok", link: { to: "/admin/contratos" } },
  ];

  return {
    cards,
    compras,
    comprasPainel,
    itensAOrcar: excluir(itensAOrcar, "orcar"),
    prontosAprovacao: excluir(prontosAprovacao, "aprovacao"),
    aguardandoAutorizacao: excluir(aguardandoAutorizacao, "autorizacao"),
    liberadosCompra: excluir(liberadosCompra, "liberado"),
    aguardandoPagamento: excluir(aguardandoPagamento, "pagamento"),
    ordens,
    producaoPainel,
    confirmacoesKit,
    ordensPrioritarias,
    agenda,
    financeiro,
    facaPrimeiro,
    tarefas,
    clientes,
    comprasPend,
    producoesPend,
  };
}
