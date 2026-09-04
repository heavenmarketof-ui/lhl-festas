// ============================================================================
// CENTRAL DE PRODUÇÃO — centro operacional único da LHL Festas.
// Compras (é a Lista Geral de Compras em tempo real), produção, separação,
// conferência, kits prontos, alertas e prioridades. Nada é "gerado": tudo é
// derivado das Ordens de Produção no momento da leitura.
// ============================================================================

import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AdminShell,
  CalendarLegend,
  PriorityDot,
  orderCalendarLevel,
} from "@/components/admin-shell";
import { fetchOrdersFromSheet } from "@/lib/sheets-api";
import { hydrateOrdersCache, getOrders, fmtBRL, type StoredOrder } from "@/lib/orders-storage";
import { toDateISO } from "@/lib/date-utils";
import { downloadCSV, toCSV } from "@/lib/financeiro-api";
import { fetchSolicitacoesPorItem } from "@/lib/solicitacoes-api";
import {
  STATUS_BADGE_LABEL,
  STATUS_CLASS,
  STATUS_EMOJI,
  type Solicitacao,
} from "@/lib/solicitacoes-types";
import { mudarEtapaCompra } from "@/lib/compras-flow";
import {
  ConfirmarKitDialog,
  type ConfirmarKitAlvo,
} from "@/components/confirmar-kit-dialog";
import {
  RegistrarCompraDialog,
  type RegistrarCompraAlvo,
} from "@/components/registrar-compra-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  fetchOrdens,
  withTimeout,
  stages,
  progressPercent,
  
  urgenciaFrom,
  diasAte,
  compraStatusOf,
  isAtrasada,

  pendenciasDaOP,
  prioridadeOrdem,
  compraConcluida,
  aguardandoConfirmacaoKit,
  comprasGlobais,
  aplicaFiltroCompra,
  proximaEtapaCompra,
  etapaAnteriorCompra,
  descricaoCompra,
  addDaysISO,
  todayISO,
  fmtDateBR,
  FILTROS_COMPRA,
  COMPRA_ACAO_LABEL,
  COMPRA_BLOQUEIO_MENSAGEM,
  COMPRA_STATUS_CLASS,
  COMPRA_STATUS_EMOJI,
  COMPRA_STATUS_MENSAGEM,
  OP_STATUS,
  OP_STATUS_CLASS,
  OP_STATUS_EMOJI,
  URGENCIA_EMOJI,
  type CompraGlobal,
  type CompraStatus,
  type FiltroCompraKey,

  type OrdemProducao,
  type Urgencia,
} from "@/lib/producao-api";
import {
  Factory,
  Search,
  AlertTriangle,
  ShoppingCart,
  Loader2,
  CalendarClock,
  Download,
  Printer,
  RefreshCw,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { MonthCalendar } from "@/components/MonthCalendar";

export const Route = createFileRoute("/admin/producao/")({
  validateSearch: (search: Record<string, unknown>) => ({
    filtro: typeof search.filtro === "string" ? search.filtro : "",
    etapa: typeof search.etapa === "string" ? search.etapa : "",
    q: typeof search.q === "string" ? search.q : "",
  }),
  component: CentralProducao,
  head: () => ({ meta: [{ title: "Central de Produção — LHL Festas" }] }),
});


type Row = {
  op: OrdemProducao;
  order?: StoredOrder;
  pct: number;
  urg: Urgencia;
  atrasada: boolean;
  retirada: string;
};

type FiltroEtapa =
  | "todas"
  | "producao"
  | "kits"
  | "urgentes"
  | "retiradas";

/* ------------------- Filtro rápido por período (UX) ------------------- */

type PeriodoKey = "hoje" | "semana" | "proxima" | "todas";

const PERIODOS: { key: PeriodoKey; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "semana", label: "Esta Semana" },
  { key: "proxima", label: "Próxima Semana" },
  { key: "todas", label: "Todas" },
];

/** Intervalo de datas de retirada considerado pelo filtro. `null` = sem limite. */
function periodoRange(key: PeriodoKey): { de: string; ate: string } | null {
  const hoje = todayISO();
  if (key === "hoje") return { de: hoje, ate: hoje };
  if (key === "todas") return null;
  const base = new Date(`${hoje}T00:00:00`);
  const ateDomingo = (7 - base.getDay()) % 7;
  if (key === "semana") return { de: hoje, ate: addDaysISO(ateDomingo, base) };
  return { de: addDaysISO(ateDomingo + 1, base), ate: addDaysISO(ateDomingo + 7, base) };
}

/* --------------------- Prioridade automática (UX) --------------------- */

type PrioridadeInfo = { emoji: string; label: string; cls: string };

function prioridadeRetirada(retirada: string): PrioridadeInfo {
  const dias = diasAte(retirada);
  if (dias == null) return { emoji: "⚪", label: "Sem data de retirada", cls: "text-muted-foreground" };
  if (dias < 0) return { emoji: "🔴", label: "Retirada atrasada", cls: "text-red-600" };
  if (dias === 0) return { emoji: "🔴", label: "Alta prioridade · Hoje", cls: "text-red-600" };
  if (dias === 1) return { emoji: "🟠", label: "Prioridade alta · Amanhã", cls: "text-orange-600" };
  if (dias <= 7) return { emoji: "🟡", label: `Prioridade média · ${dias} dias`, cls: "text-yellow-600" };
  return { emoji: "🟢", label: `Tranquilo · ${dias} dias`, cls: "text-emerald-600" };
}

/** Como a retirada aparece no card: Hoje / Amanhã / data. */
function retiradaLabel(retirada: string): string {
  const dias = diasAte(retirada);
  if (dias == null) return "—";
  if (dias === 0) return "Hoje";
  if (dias === 1) return "Amanhã";
  return fmtDateBR(retirada);
}

/* ---------------------- Alertas automáticos (UX) ---------------------- */

/** Retirada até amanhã com produção ainda pendente. */
function alertaProducaoAtrasada(op: OrdemProducao, retirada: string): boolean {
  const dias = diasAte(retirada);
  if (dias == null || dias > 1) return false;
  if (op.status === "Finalizado") return false;
  return (op.producao || []).some((p) => p.status === "Pendente");
}

/** Retirada até amanhã com compra ainda em "Aguardando orçamento". */
function alertaCompraAtrasada(op: OrdemProducao, retirada: string): boolean {
  const dias = diasAte(retirada);
  if (dias == null || dias > 1) return false;
  if (op.status === "Finalizado") return false;
  return (op.compras || []).some(
    (c) => !c.cancelado && compraStatusOf(c) === "Aguardando orçamento",
  );
}


function CentralProducao() {
  const sp = Route.useSearch();
  const [loading, setLoading] = useState(true);
  const [ops, setOps] = useState<OrdemProducao[]>([]);
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<Record<string, Solicitacao>>({});
  const [busyKey, setBusyKey] = useState("");
  /** Alvo da ação única "Registrar Compra". */
  const [compraAlvo, setCompraAlvo] = useState<RegistrarCompraAlvo | null>(null);
  /** Alvo da confirmação humana de Kit Pronto. */
  const [kitAlvo, setKitAlvo] = useState<ConfirmarKitAlvo | null>(null);

  const [busca, setBusca] = useState(sp.q || "");
  const [filtroCompra, setFiltroCompra] = useState<FiltroCompraKey>(
    (FILTROS_COMPRA.some((x) => x.key === sp.filtro)
      ? (sp.filtro as FiltroCompraKey)
      : "pendentes") as FiltroCompraKey,
  );
  const [periodo, setPeriodo] = useState<PeriodoKey>("todas");
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [filtroEtapa, setFiltroEtapa] = useState<FiltroEtapa>(
    (["producao", "kits", "urgentes", "retiradas"].includes(sp.etapa)
      ? sp.etapa
      : "todas") as FiltroEtapa,
  );


  const [fStatus, setFStatus] = useState("");
  const [fModalidade, setFModalidade] = useState("");
  const [fKit, setFKit] = useState("");
  const [fResponsavel, setFResponsavel] = useState("");
  const [fFornecedor, setFFornecedor] = useState("");
  const [fTema, setFTema] = useState("");
  const [fCliente, setFCliente] = useState("");
  const [fUrgencia, setFUrgencia] = useState("");
  const [fRetiradaDe, setFRetiradaDe] = useState("");
  const [fRetiradaAte, setFRetiradaAte] = useState("");

  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      const [sheetOrders, ordensProd, sols] = await Promise.all([
        withTimeout(fetchOrdersFromSheet()),
        fetchOrdens(),
        fetchSolicitacoesPorItem().catch(() => ({}))
      ]);
      
      const list = hydrateOrdersCache(sheetOrders);
      setOrders(list);
      setOps(ordensProd);
      setSolicitacoes(sols);
    } catch (err) {
      console.error("Central de Produção Load Error:", err);
      // Fallback para cache se disponível
      const list = getOrders();
      if (list.length) setOrders(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Voltar de uma Ordem de Produção ou da fila financeira reflete na hora.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void carregar(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [carregar]);

  const rows: Row[] = useMemo(() => {
    return ops.map((op) => {
      const order = orders.find((o) => o.id === op.contratoId);
      const retirada =
        toDateISO(order?.details?.dataRetirada) || toDateISO(order?.details?.dataEvento) || "";
      return {
        op,
        order,
        pct: progressPercent(op),
        urg: urgenciaFrom(retirada),
        atrasada: isAtrasada(op, order),
        retirada,
      };
    });
  }, [ops, orders]);

  const abertas = useMemo(() => rows.filter((r) => r.op.status !== "Finalizado"), [rows]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return abertas
      .filter((r) => {
        const o = r.order;
        if (fStatus && r.op.status !== fStatus) return false;
        if (fModalidade && (o?.modalidade || "") !== fModalidade) return false;
        if (fKit && (o?.plano || "") !== fKit) return false;
        if (fTema && !(o?.tema || "").toLowerCase().includes(fTema.toLowerCase())) return false;
        if (fCliente && !(o?.nome || "").toLowerCase().includes(fCliente.toLowerCase()))
          return false;
        if (fUrgencia && r.urg !== fUrgencia) return false;
        if (
          !r.op.producao.some((p) =>
            String(p.responsavel ?? "").toLowerCase().includes(fResponsavel.toLowerCase()),
          )
        )
          return false;
        if (
          fFornecedor &&
          !r.op.compras.some((c) => String(c.fornecedor ?? "").toLowerCase().includes(fFornecedor.toLowerCase()))
        )
          return false;
        if (fRetiradaDe && (!r.retirada || r.retirada < fRetiradaDe)) return false;
        if (fRetiradaAte && (!r.retirada || r.retirada > fRetiradaAte)) return false;
        if (filtroEtapa === "producao" && stages(r.op)[1].done) return false;
        if (filtroEtapa === "kits" && r.op.status !== "Kit Pronto") return false;
        if (filtroEtapa === "urgentes" && r.urg !== "Muito Urgente" && !r.atrasada) return false;
        if (
          filtroEtapa === "retiradas" &&
          (!r.retirada || r.retirada < todayISO() || r.retirada > addDaysISO(7))
        )
          return false;

        if (q) {
          const blob = [
            o?.nome,
            o?.tema,
            o?.modalidade,
            o?.plano,
            o?.details?.nomeAniversariante,
            r.op.numero,
            r.op.status,
            ...r.op.compras.map((c) => `${c.descricao} ${c.fornecedor ?? ""} ${c.observacao ?? ""}`),
            ...r.op.producao.map((p) => `${p.descricao} ${p.responsavel ?? ""} ${p.observacao ?? ""}`),
            
          ]
            .join(" ")
            .toLowerCase();
          if (!blob.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const pa = prioridadeOrdem(a.op, a.order);
        const pb = prioridadeOrdem(b.op, b.order);
        if (pa !== pb) return pa - pb;
        return (a.retirada || "9999").localeCompare(b.retirada || "9999");
      });
  }, [
    abertas,
    busca,
    filtroEtapa,
    fStatus,
    fModalidade,
    fKit,
    fTema,
    fCliente,
    fUrgencia,
    fResponsavel,
    fFornecedor,
    fRetiradaDe,
    fRetiradaAte,
  ]);

  /* ---------- Lista Geral de Compras (tempo real) ---------- */

  const comprasTodas = useMemo(() => comprasGlobais(ops, orders), [ops, orders]);

  const compras = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return comprasTodas.filter((l) => {
      if (!aplicaFiltroCompra(l, filtroCompra)) return false;
      if (fCliente && !String(l.cliente ?? "").toLowerCase().includes(fCliente.toLowerCase())) return false;
      if (
        fFornecedor &&
        !(l.item.fornecedor || "").toLowerCase().includes(fFornecedor.toLowerCase())
      )
        return false;
      if (fUrgencia && l.urgencia !== fUrgencia) return false;
      if (fRetiradaDe && (!l.retirada || l.retirada < fRetiradaDe)) return false;
      if (fRetiradaAte && (!l.retirada || l.retirada > fRetiradaAte)) return false;
      if (q) {
        const blob =
          `${l.item.descricao} ${l.item.fornecedor} ${l.item.observacao} ${l.cliente} ${l.op.numero}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [
    comprasTodas,
    filtroCompra,
    busca,
    fCliente,
    fFornecedor,
    fUrgencia,
    fRetiradaDe,
    fRetiradaAte,
  ]);

  const totalCompras = useMemo(
    () => compras.reduce((a, l) => a + (l.valorReal || l.valorPrevisto), 0),
    [compras],
  );

  const avancar = async (
    l: CompraGlobal,
    destino: Parameters<typeof mudarEtapaCompra>[0]["status"],
  ) => {
    setBusyKey(l.key);
    try {
      const res = await mudarEtapaCompra({
        op: l.op,
        itemId: l.item.id,
        status: destino,
        order: l.order,
        solicitacao: solicitacoes[l.item.id],
      });
      setOps((prev) => prev.map((o) => (o.id === res.op.id ? res.op : o)));
      toast.success(res.mensagem);
      // Sincroniza a fila financeira e os indicadores imediatamente.
      try {
        setSolicitacoes(await fetchSolicitacoesPorItem());
      } catch {
        /* fila indisponível */
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar a etapa.");
    } finally {
      setBusyKey("");
    }
  };

  const exportarCompras = () => {
    const csv = toCSV(
      compras.map((l) => ({
        material: descricaoCompra(l.item),
        quantidade: `${l.item.quantidade || 0} ${l.item.unidade || "un"}`,
        fornecedor: l.item.fornecedor || "",
        cliente: l.cliente,
        pedido: l.op.numero,
        retirada: fmtDateBR(l.retirada),
        previsto: l.valorPrevisto.toFixed(2),
        real: l.valorReal.toFixed(2),
        status: l.status,
        responsavel: l.responsavel,
        urgencia: l.urgencia,
      })),
      [
        { key: "material", label: "Material" },
        { key: "quantidade", label: "Quantidade" },
        { key: "fornecedor", label: "Fornecedor" },
        { key: "cliente", label: "Cliente" },
        { key: "pedido", label: "Pedido" },
        { key: "retirada", label: "Retirada" },
        { key: "previsto", label: "Valor previsto" },
        { key: "real", label: "Valor real" },
        { key: "status", label: "Status" },
        { key: "responsavel", label: "Responsável" },
        { key: "urgencia", label: "Urgência" },
      ],
    );
    downloadCSV(`lista-compras-${todayISO()}.csv`, csv);
  };

  const kpis = useMemo(() => {
    const comprasPend = abertas.filter((r) => !stages(r.op)[0].done).length;
    const prodPend = abertas.filter((r) => !stages(r.op)[1].done).length;
    const aguardandoConfirmacao = abertas.filter((r) => aguardandoConfirmacaoKit(r.op)).length;
    const kitsProntos = rows.filter((r) => r.op.status === "Kit Pronto").length;
    const valorCompras = comprasTodas.reduce((a, l) => a + (l.valorReal || l.valorPrevisto), 0);
    const valorComprado = comprasTodas
      .filter((l) => compraConcluida(l.item))
      .reduce((a, l) => a + (l.valorReal || l.valorPrevisto), 0);
    return {
      abertas: abertas.length,
      atrasadas: abertas.filter((r) => r.atrasada).length,
      aguardandoAprovacao: comprasTodas.filter((l) => l.status === "Aguardando autorização").length,
      comprasPend,
      prodPend,
      aguardandoConfirmacao,
      kitsProntos,
      valorCompras,
      valorComprado,
    };
  }, [abertas, rows, comprasTodas]);


  /* ---------- Filtro rápido por período (data de retirada) ---------- */

  const range = useMemo(() => periodoRange(periodo), [periodo]);
  const noPeriodo = useCallback(
    (retirada: string) => {
      if (!range) return true;
      if (!retirada) return false;
      return retirada >= range.de && retirada <= range.ate;
    },
    [range],
  );

  const rowsPeriodo = useMemo(() => {
    return abertas
      .filter((r) => noPeriodo(r.retirada))
      .sort((a, b) => {
        const pa = prioridadeOrdem(a.op, a.order);
        const pb = prioridadeOrdem(b.op, b.order);
        if (pa !== pb) return pa - pb;
        return (a.retirada || "9999").localeCompare(b.retirada || "9999");
      });
  }, [abertas, noPeriodo]);

  const blocos = useMemo(() => {
    const hoje = todayISO();
    const faca = rowsPeriodo.filter(
      (r) => r.atrasada || alertaCompraAtrasada(r.op, r.retirada) || alertaProducaoAtrasada(r.op, r.retirada),
    );
    // OPs sem pendências aparecem apenas em "Confirmar Kit Pronto".
    const confirmar = rowsPeriodo.filter((r) => aguardandoConfirmacaoKit(r.op));
    const semConfirmar = rowsPeriodo.filter((r) => !aguardandoConfirmacaoKit(r.op));
    return {
      faca,
      retiradasHoje: rowsPeriodo.filter((r) => r.retirada === hoje),
      producoes: semConfirmar.filter((r) => !stages(r.op)[1].done),
      confirmar,
      prontos: rows.filter((r) => r.op.status === "Kit Pronto" && noPeriodo(r.retirada)),
    };
  }, [rowsPeriodo, rows, noPeriodo]);


  const comprasLiberadas = useMemo(
    () =>
      comprasTodas.filter((l) => l.status === "Compra autorizada" && noPeriodo(l.retirada)),
    [comprasTodas, noPeriodo],
  );

  const quinzena = useMemo(() => {
    const ini = todayISO();
    const fim = addDaysISO(15);
    return rows.filter((r) => r.retirada && r.retirada >= ini && r.retirada <= fim);
  }, [rows]);

  const filtradasPeriodo = useMemo(
    () => filtradas.filter((r) => noPeriodo(r.retirada)),
    [filtradas, noPeriodo],
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, StoredOrder[]>();
    for (const o of orders) {
      if (!o || o.status === "Cancelado") continue;
      const iso = toDateISO(o.details?.dataRetirada) || toDateISO(o.details?.dataEvento);
      if (!iso) continue;
      const arr = map.get(iso) ?? [];
      arr.push(o);
      map.set(iso, arr);
    }
    return map;
  }, [orders]);

  if (loading) {
    return (
      <AdminShell>
        <main className="mx-auto max-w-6xl px-4 py-16 flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando Central de Produção...
        </main>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl text-primary flex items-center gap-2">
              <Factory className="h-6 w-6 text-gold" /> Central de Produção
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Operação integrada: {kpis.abertas} OPs abertas · {kpis.atrasadas} atrasadas
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-10 rounded-full"
              onClick={() => carregar(true)}
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button asChild className="h-10 rounded-full">
              <Link to="/admin/solicitacoes" search={{ status: "pendente", urgencia: "todas", q: "" }}>
                Lista de Compras
              </Link>
            </Button>
          </div>
        </header>

        {/* 📅 CALENDÁRIO (PRIORIDADE 1) */}
        <MonthCalendar
          cursor={monthCursor}
          onPrev={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
          onNext={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
          onToday={() => {
            const d = new Date();
            setMonthCursor(new Date(d.getFullYear(), d.getMonth(), 1));
          }}
          eventsByDay={eventsByDay}
          onOpen={(id) => (window.location.href = `/admin/${id}`)}
          todayISO={todayISO()}
          in7ISO={addDaysISO(7)}
          ordens={ops}
        />

        {/* Filtro rápido por período — vale para todos os blocos */}
        <section className="flex flex-wrap items-center gap-2 print:hidden">
          <span className="text-xs text-muted-foreground mr-1">Período de retirada:</span>
          {PERIODOS.map((p) => (
            <Chip key={p.key} active={periodo === p.key} onClick={() => setPeriodo(p.key)}>
              {p.label}
            </Chip>
          ))}
        </section>




        {/* ⚠ Faça isso primeiro */}
        <Bloco
          titulo="Faça isso primeiro"
          emoji="⚠"
          total={blocos.faca.length}
          tone="red"
          vazio="Nenhum risco operacional no período."
        >
          {blocos.faca.map((r) => (
            <CardPedido key={r.op.id} row={r} />
          ))}
        </Bloco>

        {/* 🚚 Retiradas de Hoje */}
        <Bloco
          titulo="Retiradas de Hoje"
          emoji="🚚"
          total={blocos.retiradasHoje.length}
          vazio="Nenhuma retirada para hoje."
        >
          {blocos.retiradasHoje.map((r) => (
            <CardPedido key={r.op.id} row={r} />
          ))}
        </Bloco>

        {/* 💰 Compras Liberadas */}
        <Bloco
          titulo="Compras Liberadas"
          emoji="💰"
          total={comprasLiberadas.length}
          vazio="Nenhuma compra autorizada aguardando registro."
        >
          {comprasLiberadas.map((l) => (
            <CompraLinha
              key={l.key}
              linha={l}
              solicitacao={solicitacoes[l.item.id]}
              busy={busyKey === l.key}
              onAvancar={(s) => void avancar(l, s)}
               onRegistrarCompra={() => setCompraAlvo({ 
                 op: l.op, 
                 item: {
                   ...l.item,
                   valorReal: l.item.valorReal || l.item.valorOrcado || 0
                 }, 
                 order: l.order, 
                 solicitacao: solicitacoes[l.item.id] ?? null, 
                 cliente: l.cliente 
               })}
            />
          ))}
        </Bloco>

        {/* 🎨 Produções Pendentes */}
        <Bloco
          titulo="Produções Pendentes"
          emoji="🎨"
          total={blocos.producoes.length}
          vazio="Nenhuma produção pendente no período."
        >
          {blocos.producoes.map((r) => (
            <CardPedido key={r.op.id} row={r} />
          ))}
        </Bloco>


        {/* 🎉 Confirmar Kit Pronto — sem compras nem produções pendentes */}
        <Bloco
          titulo="Confirmar Kit Pronto"
          emoji="🎉"
          total={blocos.confirmar.length}
          tone="green"
          vazio="Nenhuma OP aguardando confirmação."
        >
          {blocos.confirmar.map((r) => (
            <div key={r.op.id} className="space-y-2">
              <CardPedido row={r} />
              <Button
                size="sm"
                className="rounded-full"
                onClick={() =>
                  setKitAlvo({
                    op: r.op,
                    cliente: r.order?.nome,
                    origem: "Central de Produção",
                  })
                }
              >
                Confirmar Kit Pronto
              </Button>
            </div>
          ))}
        </Bloco>

        {/* ✅ Pedidos Prontos */}
        <Bloco
          titulo="Pedidos Prontos"
          emoji="✅"
          total={blocos.prontos.length}
          tone="green"
          vazio="Nenhum kit pronto no período."
        >
          {blocos.prontos.map((r) => (
            <CardPedido key={r.op.id} row={r} />
          ))}
        </Bloco>

        {/* Indicadores */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 print:hidden">
          <Kpi label="Ordens abertas" value={kpis.abertas} />
          <Kpi label="Ordens atrasadas" value={kpis.atrasadas} tone="red" />
          <Kpi label="Compras pendentes" value={kpis.comprasPend} tone="orange" />
          <Kpi label="Aguardando aprovação" value={kpis.aguardandoAprovacao} tone="orange" />
          <Kpi label="Produções pendentes" value={kpis.prodPend} tone="orange" />
          <Kpi label="Aguardando confirmação" value={kpis.aguardandoConfirmacao} tone="purple" />
          <Kpi label="Kits prontos" value={kpis.kitsProntos} tone="purple" />

          <Kpi label="Total em compras" value={fmtBRL(kpis.valorCompras)} />
          <Kpi label="Total já comprado" value={fmtBRL(kpis.valorComprado)} />
        </section>

        {/* Busca e filtros */}
        <section className="rounded-2xl bg-card border border-border/60 p-5 space-y-3 print:hidden">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Busca global: cliente, tema, material, fornecedor..."
              className="pl-9 h-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTROS_COMPRA.map((f) => (
              <Chip
                key={f.key}
                active={filtroCompra === f.key && filtroEtapa === "todas"}
                onClick={() => {
                  setFiltroCompra(f.key);
                  setFiltroEtapa("todas");
                }}
              >
                {f.label}
              </Chip>
            ))}
            {(
              [
                ["producao", "Produção"],
                ["kits", "Kits prontos"],

                ["urgentes", "Urgentes"],
                ["retiradas", "Próximas retiradas"],
              ] as [FiltroEtapa, string][]
            ).map(([key, label]) => (
              <Chip
                key={key}
                active={filtroEtapa === key}
                onClick={() => setFiltroEtapa(filtroEtapa === key ? "todas" : key)}
              >
                {label}
              </Chip>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <Input
              value={fCliente}
              onChange={(e) => setFCliente(e.target.value)}
              placeholder="Cliente"
              className="h-9"
            />
            <Input
              value={fTema}
              onChange={(e) => setFTema(e.target.value)}
              placeholder="Tema"
              className="h-9"
            />
            <select
              value={fModalidade}
              onChange={(e) => setFModalidade(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Modalidade</option>
              {Array.from(new Set(orders.map((o) => o.modalidade).filter(Boolean))).map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <select
              value={fKit}
              onChange={(e) => setFKit(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Kit</option>
              {Array.from(new Set(orders.map((o) => o.plano).filter(Boolean))).map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <select
              value={fStatus}
              onChange={(e) => setFStatus(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Status da OP</option>
              {OP_STATUS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <Input
              value={fResponsavel}
              onChange={(e) => setFResponsavel(e.target.value)}
              placeholder="Responsável"
              className="h-9"
            />
            <Input
              value={fFornecedor}
              onChange={(e) => setFFornecedor(e.target.value)}
              placeholder="Fornecedor"
              className="h-9"
            />
            <select
              value={fUrgencia}
              onChange={(e) => setFUrgencia(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Urgência</option>
              <option>Muito Urgente</option>
              <option>Urgente</option>
              <option>Normal</option>
            </select>
            <div>
              <Label className="text-[10px] text-muted-foreground">Retirada de</Label>
              <Input
                type="date"
                value={fRetiradaDe}
                onChange={(e) => setFRetiradaDe(e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">até</Label>
              <Input
                type="date"
                value={fRetiradaAte}
                onChange={(e) => setFRetiradaAte(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </section>

        {/* ---------------- Lista Geral de Compras ---------------- */}
        <section className="rounded-2xl bg-card border border-border/60 p-5 space-y-3 print:border-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-primary flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-gold" /> Lista Geral de Compras
              <span className="text-xs text-muted-foreground font-normal">
                · {compras.length} item(ns) · {fmtBRL(totalCompras)}
              </span>
            </h2>
            <div className="flex gap-2 print:hidden">
              <Button size="sm" variant="outline" onClick={exportarCompras}>
                <Download className="h-4 w-4 mr-2" /> Exportar CSV
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" /> Imprimir / PDF
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {compras.map((l) => (
              <CompraLinha
                key={l.key}
                linha={l}
                solicitacao={solicitacoes[l.item.id]}
                busy={busyKey === l.key}
                onAvancar={(s) => void avancar(l, s)}
                 onRegistrarCompra={() => setCompraAlvo({ 
                   op: l.op, 
                   item: {
                     ...l.item,
                     valorReal: l.item.valorReal || l.item.valorOrcado || 0
                   }, 
                   order: l.order, 
                   solicitacao: solicitacoes[l.item.id] ?? null, 
                   cliente: l.cliente 
                 })}
              />
            ))}
            {compras.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">
                Nenhum material com os filtros atuais. Cadastre materiais na Ordem de Produção da
                festa.
              </p>
            )}
          </div>
        </section>

        {/* Próxima quinzena */}
        <section className="rounded-2xl bg-card border border-border/60 p-5 print:hidden">
          <h2 className="text-sm font-medium text-primary flex items-center gap-2 mb-3">
            <CalendarClock className="h-4 w-4 text-gold" /> Próxima Quinzena
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
            <Mini label="Reservas" value={quinzena.length} />
            <Mini
              label="Kits prontos"
              value={quinzena.filter((r) => r.op.status === "Kit Pronto").length}
            />
            <Mini
              label="Compras pend."
              value={quinzena.filter((r) => !stages(r.op)[0].done).length}
            />
            <Mini
              label="Produções pend."
              value={quinzena.filter((r) => !stages(r.op)[1].done).length}
            />



          </div>
        </section>

        {/* Ordens de Produção abertas */}
        <section className="space-y-2 print:hidden">
          <p className="text-xs text-muted-foreground">
            {filtradasPeriodo.length} ordem(ns) aberta(s)
          </p>
          {filtradasPeriodo.map((r) => (
            <CardPedido key={r.op.id} row={r} detalhado />
          ))}
          {filtradasPeriodo.length === 0 && (
            <p className="text-sm text-muted-foreground rounded-2xl bg-card border border-border/60 p-6 text-center">
              Nenhuma ordem aberta com os filtros atuais.
            </p>
          )}
        </section>
      </main>

      <ConfirmarKitDialog
        alvo={kitAlvo}
        onClose={() => setKitAlvo(null)}
        onAtualizado={(nova) => setOps((prev) => prev.map((o) => (o.id === nova.id ? nova : o)))}
      />

      <RegistrarCompraDialog
        open={!!compraAlvo}
        op={compraAlvo?.op}
        item={compraAlvo?.item}
        cliente={compraAlvo?.cliente}
        order={compraAlvo?.order}
        solicitacao={compraAlvo?.solicitacao}
        onOpenChange={(open) => !open && setCompraAlvo(null)}
        onSuccess={(nova) => {
          setOps((prev) => prev.map((o) => (o.id === nova.id ? nova : o)));
          void fetchSolicitacoesPorItem().then(setSolicitacoes).catch(() => {});
        }}
      />
    </AdminShell>
  );
}


/* ============================ Subcomponentes ============================ */

/** Bloco operacional com contador automático. */
function Bloco({
  titulo,
  emoji,
  total,
  vazio,
  tone,
  children,
}: {
  titulo: string;
  emoji: string;
  total: number;
  vazio: string;
  tone?: "red" | "green";
  children: React.ReactNode;
}) {
  const border =
    tone === "red"
      ? "border-red-500/40 bg-red-500/5"
      : tone === "green"
        ? "border-emerald-500/40 bg-emerald-500/5"
        : "border-border/60 bg-card";
  return (
    <section className={`rounded-2xl border p-5 space-y-3 print:hidden ${border}`}>
      <h2 className="text-sm font-medium text-primary flex items-center gap-2">
        <span aria-hidden>{emoji}</span> {titulo}
        <span className="text-xs text-muted-foreground font-normal">({total})</span>
      </h2>
      {total === 0 ? <p className="text-sm text-muted-foreground">{vazio}</p> : <div className="space-y-2">{children}</div>}
    </section>
  );
}

/** Card resumo operacional de um pedido (Ordem de Produção). */
function CardPedido({ row, detalhado = false }: { row: Row; detalhado?: boolean }) {
  const { op, order, retirada } = row;
  const prio = prioridadeRetirada(retirada);
  const st = stages(op);
  const comprasPend = st[0].total - st[0].concluidos;
  const producaoPend = st[1].total - st[1].concluidos;
  const alertaProd = alertaProducaoAtrasada(op, retirada);
  const alertaComp = alertaCompraAtrasada(op, retirada);
  const p = pendenciasDaOP(op);

  return (
    <Link
      to="/admin/producao/$id"
      params={{ id: op.contratoId }}
      className="block rounded-xl bg-card border border-border/60 p-4 hover:border-primary transition-colors"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">{op.numero}</p>
          <p className="font-medium text-primary">{order?.nome || "Contrato removido"}</p>
          <p className="text-xs text-muted-foreground">
            Tema: {order?.tema || "—"}
            {order?.modalidade ? ` · ${order.modalidade}` : ""}
            {order?.plano ? ` · ${order.plano}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">Retirada: {retiradaLabel(retirada)}</p>
          <p className={`text-[11px] mt-0.5 ${prio.cls}`}>
            {prio.emoji} {prio.label}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] ${OP_STATUS_CLASS[op.status]}`}
          >
            {OP_STATUS_EMOJI[op.status]} {op.status}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {URGENCIA_EMOJI[row.urg]} {row.urg}
          </span>
          {row.atrasada && <span className="text-[11px] text-red-600">🔴 Atrasada</span>}
        </div>
      </div>

      {(alertaProd || alertaComp) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {alertaProd && (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-0.5 text-[11px] text-red-600">
              <AlertTriangle className="h-3 w-3" /> PRODUÇÃO ATRASADA
            </span>
          )}
          {alertaComp && (
            <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/40 bg-orange-500/10 px-2.5 py-0.5 text-[11px] text-orange-600">
              <AlertTriangle className="h-3 w-3" /> COMPRA ATRASADA
            </span>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <Mini label="Compras" value={comprasPend > 0 ? comprasPend : st[0].total} />
        <Mini label="Produção" value={producaoPend > 0 ? producaoPend : st[1].total} />
        <Mini label="Progresso" value={row.pct} />
      </div>

      <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-[image:var(--gradient-elegant)]" style={{ width: `${row.pct}%` }} />
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
        {st.map((s) => (
          <span key={s.key} className={s.done ? "text-emerald-600" : ""}>
            {s.label} {s.done ? "✔" : "✖"}
          </span>
        ))}
      </div>

      {detalhado && (p.compras.length > 0 || p.producao.length > 0) && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {p.compras.length > 0 && <>Comprar: {p.compras.slice(0, 4).join(", ")}. </>}
          {p.producao.length > 0 && <>Produzir: {p.producao.slice(0, 4).join(", ")}.</>}
        </p>
      )}

      <p className="mt-2 text-[11px] text-primary underline">Abrir Ordem de Produção</p>
    </Link>
  );
}

/** Calendário mensal das retiradas com as ordens em aberto. */
function CalendarioRetiradas({ rows }: { rows: Row[] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const hoje = todayISO();
  const in7 = addDaysISO(7);

  const porDia = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      if (!r.retirada) continue;
      const arr = map.get(r.retirada) || [];
      arr.push(r);
      map.set(r.retirada, arr);
    }
    return map;
  }, [rows]);

  const cells: Array<{ iso: string; day: number } | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      iso: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      day: d,
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <section className="rounded-2xl bg-card border border-border/60 p-4 sm:p-5 print:hidden">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-primary flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-gold" /> Calendário de retiradas
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-full text-[11px]"
            onClick={() => {
              const d = new Date();
              setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
            }}
          >
            Hoje
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-serif text-lg text-primary capitalize min-w-[150px] text-center">
            {cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((w) => (
          <div key={w} className="text-center py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c) return <div key={`v-${i}`} className="min-h-[62px] rounded-lg" />;
          const dia = porDia.get(c.iso) || [];
          return (
            <div
              key={c.iso}
              className={`min-h-[62px] rounded-lg border p-1 text-left ${
                c.iso === hoje ? "border-primary bg-primary/5" : "border-border/60"
              }`}
            >
              <p className="text-[10px] text-muted-foreground">{c.day}</p>
              <div className="space-y-0.5">
                {dia.slice(0, 3).map((r) => (
                  <Link
                    key={r.op.id}
                    to="/admin/producao/$id"
                    params={{ id: r.op.contratoId }}
                    title={`${r.order?.nome || r.op.numero} — ${r.op.status}`}
                    className="flex items-center gap-1 truncate text-[10px] text-primary hover:underline"
                  >
                    {/* Mesma regra de cor/legenda do Calendário do Dashboard. */}
                    <PriorityDot
                      level={
                        r.order
                          ? orderCalendarLevel(r.order, hoje, in7, r.op)
                          : null
                      }
                    />
                    <span className="truncate">{r.order?.nome || r.op.numero}</span>
                  </Link>
                ))}
                {dia.length > 3 && (
                  <p className="text-[10px] text-muted-foreground">+{dia.length - 3}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <CalendarLegend />
    </section>
  );
}



function CompraLinha({
  linha,
  solicitacao,
  busy,
  onAvancar,
  onRegistrarCompra,
}: {
  linha: CompraGlobal;
  solicitacao?: Solicitacao;
  busy: boolean;
  onAvancar: (s: Parameters<typeof mudarEtapaCompra>[0]["status"]) => void;
  /** Ação única "Registrar Compra" — a mesma do Dashboard, Solicitações e OP. */
  onRegistrarCompra: () => void;
}) {
  const { item, status } = linha;
  const [confirmar, setConfirmar] = useState<CompraStatus | null>(null);
  const proxima = proximaEtapaCompra(item);
  const anterior = etapaAnteriorCompra(item);
  const aguardando = status === "Aguardando autorização";
  const liberado = solicitacao?.status === "autorizada" || solicitacao?.status === "lancada";

  return (
    <div className="rounded-xl border border-border/60 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] ${COMPRA_STATUS_CLASS[status]}`}
        >
          {COMPRA_STATUS_EMOJI[status]} {status}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {URGENCIA_EMOJI[linha.urgencia]} {linha.urgencia}
        </span>
        {solicitacao && (
          <Link
            to="/admin/solicitacoes/$id"
            params={{ id: solicitacao.id }}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${STATUS_CLASS[solicitacao.status]}`}
          >
            {STATUS_EMOJI[solicitacao.status]} {STATUS_BADGE_LABEL[solicitacao.status]}
          </Link>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground">
          {COMPRA_STATUS_MENSAGEM[status]}
        </span>
      </div>

      <div className="grid gap-1 sm:grid-cols-6 text-sm">
        <Campo label="Material" value={descricaoCompra(item)} className="sm:col-span-2" />
        <Campo label="Quantidade" value={`${item.quantidade || 0} ${item.unidade || "un"}`} />
        <Campo label="Fornecedor" value={item.fornecedor || "—"} />
        <Campo label="Cliente" value={linha.cliente} />
        <Campo label="Pedido" value={linha.op.numero} />
        <Campo label="Retirada" value={fmtDateBR(linha.retirada)} />
        <Campo label="Valor previsto" value={fmtBRL(linha.valorPrevisto)} />
        <Campo label="Valor real" value={linha.valorReal ? fmtBRL(linha.valorReal) : "—"} />
        <Campo label="Responsável" value={linha.responsavel} />
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        {proxima && (
          <Button
            size="sm"
            disabled={busy || (aguardando && !liberado)}
            title={aguardando && !liberado ? COMPRA_BLOQUEIO_MENSAGEM : undefined}
            onClick={() =>
              proxima === "Compra realizada"
                ? onRegistrarCompra()
                : proxima === "Pago"
                  ? setConfirmar(proxima)
                  : onAvancar(proxima)
            }
            className="rounded-full bg-[image:var(--gradient-elegant)] text-primary-foreground border-0"
          >
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {aguardando && !liberado ? "Marcar compra realizada" : COMPRA_ACAO_LABEL[status]}
          </Button>
        )}
        {aguardando && !liberado && (
          <span className="text-[11px] text-orange-600">{COMPRA_BLOQUEIO_MENSAGEM}</span>
        )}

        {anterior && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAvancar(anterior)}>
            Voltar para “{anterior}”
          </Button>
        )}
        <Button asChild size="sm" variant="outline" className="ml-auto">
          <Link to="/admin/producao/$id" params={{ id: linha.op.contratoId }}>
            Abrir Ordem de Produção
          </Link>
        </Button>
      </div>

      <Dialog open={!!confirmar} onOpenChange={(o) => !o && setConfirmar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmar === "Pago" ? "Registrar pagamento" : "Confirmar compra realizada"}
            </DialogTitle>
            <DialogDescription>
              {confirmar === "Pago"
                ? "O lançamento de Saída será criado no Fluxo de Caixa, vinculado a esta compra. O sistema impede duplicidade."
                : "Confirme que a compra foi efetivada. Para ajustar fornecedor, valor ou data, use a Ordem de Produção."}
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-1">
            <p><b>Material:</b> {descricaoCompra(item)}</p>
            <p><b>Fornecedor:</b> {item.fornecedor || "—"}</p>
            <p><b>Valor:</b> {fmtBRL(linha.valorReal || linha.valorPrevisto)}</p>
            <p><b>Cliente:</b> {linha.cliente}</p>
            <p><b>Ordem de Produção:</b> {linha.op.numero}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmar(null)}>Voltar</Button>
            <Button
              disabled={busy}
              onClick={() => {
                const destino = confirmar;
                setConfirmar(null);
                if (destino) onAvancar(destino);
              }}
            >
              {confirmar === "Pago" ? "Registrar pagamento" : "Confirmar compra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Campo({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground/90">{value}</p>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "red" | "orange" | "purple";
}) {
  const color =
    tone === "red"
      ? "text-red-600"
      : tone === "orange"
        ? "text-orange-600"
        : tone === "purple"
          ? "text-purple-600"
          : "text-primary";
  return (
    <div className="rounded-2xl bg-card border border-border/60 p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`font-serif text-2xl ${color}`}>{value}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 p-3">
      <p className="text-xl font-serif text-primary">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
