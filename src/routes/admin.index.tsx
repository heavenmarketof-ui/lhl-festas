import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CalendarDays,
  AlertTriangle,
  Flame,
  ShoppingCart,
  Factory,
  Wallet,
  ArrowRight,
  PackageCheck,
  ClipboardCheck,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { StoredOrder } from "@/lib/orders-storage";
import { fetchOrdersFromSheet } from "@/lib/sheets-api";
import { setCachedSheetOrders } from "@/lib/orders-cache";
import { toDateISO, formatDateBR } from "@/lib/date-utils";
import {
  AdminShell,
  PriorityDot,
  orderCalendarLevel,
  CalendarLegend,
} from "@/components/admin-shell";

import { SectionBoundary } from "@/components/section-boundary";
import { MonthCalendar } from "@/components/MonthCalendar";


import { fetchLancamentos, fmtBRL, type Lancamento } from "@/lib/financeiro-api";
import { fetchPatrimonioFromSheet, type PatrimonioItem } from "@/lib/patrimonio-api";
import { fetchSolicitacoes } from "@/lib/solicitacoes-api";
import type { Solicitacao } from "@/lib/solicitacoes-types";
import {
  fetchOrdens,
  progressPercent,
  pendenciasDaOP,
  isAtrasada,
  conferenciaCompleta,
  compraStatusOf,
  valorPrevistoCompra,
  type ItemCompra,
  type ItemProducao,
  type OrdemProducao,
} from "@/lib/producao-api";
import { RegistrarCompraDialog } from "@/components/registrar-compra-dialog";
import {
  ConfirmarKitDialog,
  type ConfirmarKitAlvo,
} from "@/components/confirmar-kit-dialog";
import {
  buildDashboard,
  textoDias,
  URG_CLASS,
  URG_EMOJI,
  URG_LABEL,
  type CardDash,
  type CompraDash,
  type LinkAlvo,
  type Ocorrencia,
  type OrdemDash,
  type Urgencia4,
  type DashboardData,
} from "@/lib/dashboard-aggregator";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard Operacional — LHL Festas" },
      {
        name: "description",
        content:
          "Central de operações da LHL Festas: prioridades do dia, compras, produção e financeiro em um só lugar.",
      },
    ],
  }),
  component: CentralPage,
});

function firstName(nome: string) {
  return (nome || "").trim().split(/\s+/)[0] || "—";
}




/** Link tipado de forma solta — os alvos vêm do agregador. */
function AlvoLink({
  link,
  children,
  className,
}: {
  link: LinkAlvo;
  children: React.ReactNode;
  className?: string;
}) {
  const props = link as unknown as Record<string, unknown>;
  return (
    <Link {...(props as any)} className={className}>
      {children}
    </Link>
  );
}

function UrgBadge({ nivel }: { nivel: Urgencia4 }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] whitespace-nowrap ${URG_CLASS[nivel]}`}
    >
      {URG_EMOJI[nivel]} {URG_LABEL[nivel]}
    </span>
  );
}

function CentralPage() {
  const isMobile = useIsMobile();
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [patrimonio, setPatrimonio] = useState<PatrimonioItem[]>([]);
  const [ordensProducao, setOrdensProducao] = useState<OrdemProducao[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const navigate = useNavigate();
  const [compraAlvo, setCompraAlvo] = useState<{ op: OrdemProducao; item: ItemCompra; cliente: string } | null>(null);

  // Filtros globais do painel
  const [periodo, setPeriodo] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [urgencia, setUrgencia] = useState("todas");
  const [responsavel, setResponsavel] = useState("");
  const [modalidade, setModalidade] = useState("");
  const [kit, setKit] = useState("");

  const loadingRef = useRef(false);

  const load = useCallback(async (showToast = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setRefreshing(true);
    try {
      const [remote, lanc, pat, ops, sols] = await Promise.all([
        fetchOrdersFromSheet(),
        fetchLancamentos().catch(() => [] as Lancamento[]),
        fetchPatrimonioFromSheet().catch(() => [] as PatrimonioItem[]),
        fetchOrdens().catch(() => [] as OrdemProducao[]),
        fetchSolicitacoes().catch(() => [] as Solicitacao[]),
      ]);
      setOrdensProducao(ops);
      setOrders(remote);
      setLancamentos(lanc);
      setPatrimonio(pat);
      setSolicitacoes(sols);
      setCachedSheetOrders(remote);
      if (showToast) toast.success("Dados atualizados.");
    } catch (err) {
      console.error("Dashboard Load Error:", err);
      toast.error("Não foi possível carregar todos os dados.");
    } finally {
      setRefreshing(false);
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Atualização automática — sem refresh manual.
  useEffect(() => {
    const t = setInterval(() => void load(), 90000); // 90s para evitar excesso de requisições
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const dash = useMemo(
    () =>
      buildDashboard({
        orders,
        ops: ordensProducao,
        solicitacoes,
        lancamentos,
        filtro: { periodo: "todos", urgencia, responsavel, modalidade, kit },
      }),
    [orders, ordensProducao, solicitacoes, lancamentos, periodo, urgencia, responsavel, modalidade, kit],
  );

  const modalidades = useMemo(
    () => Array.from(new Set(orders.map((o) => o.modalidade).filter(Boolean))).sort(),
    [orders],
  );
  const kits = useMemo(
    () => Array.from(new Set(orders.map((o) => o.plano).filter(Boolean))).sort(),
    [orders],
  );

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayISOv = useMemo(
    () =>
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
    [today],
  );
  const in7ISO = useMemo(() => {
    const d = new Date(today.getTime() + 7 * 86400000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, [today]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, StoredOrder[]>();
    for (const o of orders) {
      if (o.status === "Cancelado") continue;
      const iso = toDateISO(o.details?.dataEvento);
      if (!iso) continue;
      const arr = map.get(iso) ?? [];
      arr.push(o);
      map.set(iso, arr);
    }
    return map;
  }, [orders]);

  const selectCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

  return (
    <AdminShell>
      <RegistrarCompraDialog 
        open={!!compraAlvo}
        op={compraAlvo?.op}
        item={compraAlvo?.item}
        cliente={compraAlvo?.cliente}
        solicitacao={solicitacoes.find(s => s.origemItemId === compraAlvo?.item.id)}
        onOpenChange={(open) => !open && setCompraAlvo(null)}
        onSuccess={(op) => {
          setOrdensProducao(prev => prev.map(x => x.id === op.id ? op : x));
          void load(true);
        }}
      />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl text-primary">Painel da Josi</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {loading
                ? "Sincronizando operação..."
                : "Seu resumo operacional simplificado."}
            </p>
          </div>
          <Button
            variant="outline"
            className="h-10 rounded-full"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""} mr-2`} />
            Atualizar
          </Button>
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
          onOpen={(id) => navigate({ to: "/admin/$id", params: { id } })}
          todayISO={todayISOv}
          in7ISO={in7ISO}
          ordens={ordensProducao}
        />

        {/* BLOCO DE ALERTA CRÍTICO (FACA PRIMEIRO) */}
        {dash.facaPrimeiro && (
          <section className="rounded-2xl border border-red-500/40 bg-red-500/5 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <Flame className="h-5 w-5 text-red-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-red-700 uppercase tracking-wider">Faça isso primeiro</h2>
                <p className="text-sm text-red-900 font-medium truncate">{dash.facaPrimeiro.titulo}</p>
                <p className="text-xs text-red-700/80 truncate">{dash.facaPrimeiro.descricao}</p>
              </div>
              <Button asChild size="sm" className="rounded-full bg-red-600 hover:bg-red-700 text-white border-0 shrink-0">
                <AlvoLink link={dash.facaPrimeiro.link}>{dash.facaPrimeiro.acaoLabel}</AlvoLink>
              </Button>
            </div>
          </section>
        )}

        {/* --------------------- ALERTA KIT PRONTO (SE EXISTIR) --------------------- */}
        {dash.confirmacoesKit && dash.confirmacoesKit.length > 0 && !isMobile && (
          <ConfirmarKitBloco 
            dash={dash} 
            ordens={ordensProducao} 
            onAtualizado={(op) => setOrdensProducao(prev => prev.map(x => x.id === op.id ? op : x))} 
          />
        )}

        {/* --------------------- BLOCOS DE AÇÃO (GRID) --------------------- */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* BLOCO 1: PRÓXIMAS TAREFAS */}
          <SectionBloco 
            titulo="Próximas Tarefas" 
            icone={<ClipboardCheck className="h-5 w-5 text-gold" />}
            itens={dash.tarefas}
            vazio="Nenhuma tarefa crítica pendente."
          />

          {/* BLOCO 2: COMPRAS AUTORIZADAS (MÊS ATUAL) */}
          <SectionBloco 
            titulo={`Compras Autorizadas — ${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date()).toUpperCase()}`} 
            icone={<ShoppingCart className="h-5 w-5 text-gold" />}
            itens={dash.comprasPend}
            vazio="Tudo comprado para este mês!"
            onRegistrarCompra={(o) => {
              const op = ordensProducao.find(x => x.id === o.opId);
              const item = op?.compras.find(x => x.id === o.itemId);
              if (op && item) {
                setCompraAlvo({ op, item, cliente: o.cliente });
              }
            }}
          />

          {/* BLOCO 3: PRODUÇÕES PENDENTES (MÊS ATUAL) */}
          <SectionBloco 
            titulo={`Produções Pendentes — ${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date()).toUpperCase()}`} 
            icone={<Factory className="h-5 w-5 text-gold" />}
            itens={dash.producoesPend}
            vazio="Fábrica em dia para este mês!"
            onMarcarProduzido={async (item) => {
              if (item.opId && item.itemId) {
                try {
                  const { updateItemProducaoStatus } = await import("@/lib/producao-api");
                  const opFinal = await updateItemProducaoStatus(item.opId, item.itemId, "Concluído");
                  setOrdensProducao(prev =>
                    prev.some(x => x.id === opFinal.id)
                      ? prev.map(x => (x.id === opFinal.id ? opFinal : x))
                      : [opFinal, ...prev],
                  );
                  toast.success("Item marcado como produzido!");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Erro ao atualizar produção.");
                }
              }
            }}

          />
        </div>

        {/* --------------------- FINANCEIRO RESUMIDO (MÊS ATUAL) --------------------- */}
        <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
           <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-primary flex items-center gap-2">
                <Wallet className="h-4 w-4 text-gold" /> Financeiro — {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date()).toUpperCase()}
              </h2>
              <Button asChild size="sm" variant="ghost" className="rounded-full">
                <Link to="/admin/financeiro" search={{ tab: "dashboard" }}>Ver Detalhes</Link>
              </Button>
           </div>
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Mini label={`Entradas em ${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date())}`} valor={fmtBRL(dash.financeiro.entradasSemana)} />
              <Mini label={`Saídas em ${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date())}`} valor={fmtBRL(dash.financeiro.saidasSemana)} />
              <Mini label="A Receber Total" valor={fmtBRL(dash.ordens.reduce((s,o) => s + o.saldoReceber, 0))} />
              <Mini label="Saldo Atual em Conta" valor={fmtBRL(dash.financeiro.saldoAtual)} />
           </div>
        </section>

      </main>
    </AdminShell>
  );
}

function SectionBloco({ 
  titulo, 
  icone, 
  itens, 
  vazio,
  onRegistrarCompra,
  onMarcarProduzido,
}: { 
  titulo: string; 
  icone: React.ReactNode; 
  itens: Ocorrencia[]; 
  vazio: string;
  onRegistrarCompra?: (c: Ocorrencia) => void;
  onMarcarProduzido?: (c: Ocorrencia) => void;
}) {
  const isCompraBloco = titulo.includes("Compras");
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
      <div className="flex items-center gap-2 border-b border-border/40 pb-3">
        {icone}
        <h2 className="font-medium text-primary">{titulo}</h2>
        <Badge variant="secondary" className="ml-auto rounded-full">{itens.length}</Badge>
      </div>
      
      {itens.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">{vazio}</p>
      ) : (
        <div className="space-y-3">
          {itens.slice(0, 15).map((o) => (
            <div key={o.id} className="flex flex-col gap-2 p-3 rounded-xl border border-border/60 bg-background/50 group">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                     <UrgBadge nivel={o.urgencia} />
                     <span className="text-sm font-bold uppercase truncate">{o.cliente}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-medium truncate mt-0.5">
                    {o.aniversariante ? `${o.aniversariante} · ` : ""}{o.tema || "Sem tema"} • {o.modalidade || "Sem modalidade"}
                  </p>
                  <p className="text-[10px] text-primary font-semibold">
                    Festa: {o.dataLimite ? formatDateBR(o.dataLimite) : "—"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2 mt-1">
                <div className="text-[10px] text-muted-foreground/80 leading-tight">
                  <p className="font-semibold text-foreground/90 uppercase">{o.titulo}</p>
                  {o.bloco === "compras" && (
                    <p className="text-primary font-medium">Qtd. {o.quantidade} · {fmtBRL(o.valorPrevisto || 0)}</p>
                  )}
                  {o.bloco !== "compras" && <p>{textoDias(o.dias)}</p>}
                </div>

                {o.acaoLabel === "Registrar compra" ? (
                  <Button 
                    size="sm" 
                    className="rounded-full h-8 px-4 font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => onRegistrarCompra?.(o)}
                  >
                    Registrar Compra
                  </Button>
                ) : o.acaoLabel === "Marcar como produzido" ? (
                   <Button 
                    size="sm" 
                    className="rounded-full h-8 px-4 font-bold bg-primary text-white hover:bg-primary/90"
                    onClick={() => onMarcarProduzido?.(o)}
                  >
                    Marcar Produzido
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="outline" className="rounded-full h-8 px-4 font-bold">
                    <AlvoLink link={o.link}>{o.acaoLabel}</AlvoLink>
                  </Button>
                )}
              </div>
            </div>
          ))}
          {itens.length > 15 && (
            <p className="text-[11px] text-center text-muted-foreground pt-1">
              +{itens.length - 15} tarefas adicionais
            </p>
          )}
        </div>
      )}
    </section>
  );
}


function Mini({ label, valor }: { label: string; valor: number | string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-serif text-lg text-primary">{valor}</p>
    </div>
  );
}

function DashCard({ card }: { card: CardDash }) {
  const tom =
    card.tom === "alerta"
      ? "border-destructive/40 hover:border-destructive"
      : card.tom === "ok"
        ? "border-emerald-500/30 hover:border-emerald-500"
        : "border-border/60 hover:border-primary";
  return (
    <AlvoLink
      link={card.link}
      className={`block rounded-2xl bg-card border p-3 shadow-sm transition-colors hover:bg-primary/5 ${tom}`}
    >
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{card.label}</p>
      <p
        className={`font-serif text-2xl mt-1 ${card.tom === "alerta" ? "text-destructive" : "text-primary"}`}
      >
        {card.valor}
      </p>
    </AlvoLink>
  );
}

function ConfirmarKitBloco({
  dash,
  ordens,
  onAtualizado,
}: {
  dash: DashboardData;
  ordens: OrdemProducao[];
  onAtualizado: (op: OrdemProducao) => void;
}) {
  const [alvo, setAlvo] = useState<ConfirmarKitAlvo | null>(null);
  const lista = dash.confirmacoesKit;
  if (!lista.length) return null;

  return (
    <section className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4 sm:p-5 space-y-3">
      <h2 className="text-sm font-medium text-emerald-700 flex items-center gap-2">
        <PackageCheck className="h-4 w-4" /> Todos os itens concluídos. Confirmar Kit Pronto?
      </h2>
      <ul className="space-y-2">
        {lista.map((o) => (
          <li
            key={o.opId}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm text-foreground truncate">
                {o.cliente} · {o.numero}
              </p>
              <p className="text-xs text-muted-foreground">
                {o.comprasPendentes === 0 && o.producoesPendentes === 0
                  ? "Compras e produções concluídas"
                  : ""}
                {o.retirada ? ` · Retirada ${o.retirada}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="ghost" size="sm" className="rounded-full">
                <Link to="/admin/producao/$id" params={{ id: o.contratoId }}>
                  Abrir OP
                </Link>
              </Button>
              <Button
                size="sm"
                className="rounded-full"
                onClick={() => {
                  const op = ordens.find((x) => x.id === o.opId);
                  if (op) setAlvo({ op, cliente: o.cliente, origem: "Dashboard" });
                }}
              >
                Confirmar Kit Pronto
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <ConfirmarKitDialog
        alvo={alvo}
        onClose={() => setAlvo(null)}
        onAtualizado={(op) => {
          onAtualizado(op);
          setAlvo(null);
        }}
      />
    </section>
  );
}

function OrdensLista({ ordens }: { ordens: OrdemDash[] }) {
  if (ordens.length === 0)
    return <p className="text-sm text-muted-foreground">Nenhuma ordem de produção aberta.</p>;
  return (
    <div className="grid gap-2">
      {ordens.map((o) => (
        <div
          key={o.opId}
          className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/50 px-3 py-2.5"
        >
          <UrgBadge nivel={o.urgencia} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-primary truncate">{o.cliente}</span>
              <span className="text-xs text-muted-foreground truncate">{o.numero}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {o.etapaAtual} · {o.progresso}% ·{" "}
              {o.retirada ? `retirada ${formatDateBR(o.retirada)}` : "sem retirada"} ·{" "}
              {textoDias(o.dias)}
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="rounded-full shrink-0">
            <Link to="/admin/producao/$id" params={{ id: o.contratoId }}>
              Abrir OP
            </Link>
          </Button>
        </div>
      ))}
    </div>
  );
}




