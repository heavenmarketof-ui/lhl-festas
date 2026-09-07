import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, RefreshCw, ShieldCheck, WalletCards } from "lucide-react";
import { AdminShell, CalendarLegend } from "@/components/admin-shell";
import { MonthCalendar } from "@/components/MonthCalendar";
import { Button } from "@/components/ui/button";
import { fetchOrdersFromSheet } from "@/lib/sheets-api";
import { fetchOrdens, type OrdemProducao } from "@/lib/producao-api";
import { fetchLancamentos, type Lancamento } from "@/lib/financeiro-api";
import { getOperacaoGateStatus } from "@/lib/operacao-gate";
import { toDateISO } from "@/lib/date-utils";
import type { StoredOrder } from "@/lib/orders-storage";

export const Route = createFileRoute("/admin/agenda")({
  head: () => ({ meta: [{ title: "Agenda — Admin LHL Festas" }] }),
  component: AgendaPage,
});

function AgendaPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [ordens, setOrdens] = useState<OrdemProducao[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  async function load(showSpinner = false) {
    if (showSpinner) setRefreshing(true);
    try {
      const [festas, ops, caixa] = await Promise.all([
        fetchOrdersFromSheet(),
        fetchOrdens().catch(() => [] as OrdemProducao[]),
        fetchLancamentos({ force: true }).catch(() => [] as Lancamento[]),
      ]);
      setOrders(festas);
      setOrdens(ops);
      setLancamentos(caixa);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayISO = useMemo(() => `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`, [today]);
  const in7ISO = useMemo(() => {
    const d = new Date(today.getTime() + 7 * 86400000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, [today]);

  const gateByOrder = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getOperacaoGateStatus>>();
    for (const order of orders) map.set(order.id, getOperacaoGateStatus(order, lancamentos));
    return map;
  }, [orders, lancamentos]);

  // A Agenda é operacional: pré-contrato sem recebimento confirmado não entra nela.
  const ordersLiberadas = useMemo(
    () => orders.filter((o) => o.status !== "Cancelado" && gateByOrder.get(o.id)?.liberada),
    [orders, gateByOrder],
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, StoredOrder[]>();
    for (const order of ordersLiberadas) {
      const iso = toDateISO(order.details?.dataEvento);
      if (!iso) continue;
      const list = map.get(iso) || [];
      list.push(order);
      map.set(iso, list);
    }
    return map;
  }, [ordersLiberadas]);

  const noMesAtual = (o: StoredOrder) => {
    const iso = toDateISO(o.details?.dataEvento);
    if (!iso || o.status === "Cancelado") return false;
    const d = new Date(`${iso}T12:00:00`);
    return d.getMonth() === cursor.getMonth() && d.getFullYear() === cursor.getFullYear();
  };

  const aguardandoSinalList = useMemo(
    () => orders
      .filter((o) => noMesAtual(o) && !gateByOrder.get(o.id)?.liberada)
      .sort((a, b) => (toDateISO(a.details?.dataEvento) || "9999-12-31").localeCompare(toDateISO(b.details?.dataEvento) || "9999-12-31")),
    [orders, gateByOrder, cursor],
  );

  const resumo = useMemo(() => {
    const festasMes = orders.filter(noMesAtual);
    const liberadasMes = festasMes.filter((o) => gateByOrder.get(o.id)?.liberada);
    const proximas7 = liberadasMes.filter((o) => {
      const iso = toDateISO(o.details?.dataEvento);
      return !!iso && iso >= todayISO && iso <= in7ISO;
    }).length;

    return {
      total: festasMes.length,
      liberadas: liberadasMes.length,
      aguardandoSinal: aguardandoSinalList.length,
      proximas7,
    };
  }, [orders, cursor, todayISO, in7ISO, gateByOrder, aguardandoSinalList]);

  return (
    <AdminShell>
      <div className="mx-auto w-full max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[.18em] text-[#b27b4e]">Operação</div>
            <h1 className="mt-2 font-serif text-4xl text-[#651421] sm:text-5xl">Agenda</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#7b676a]">
              Visão operacional das festas com recebimento confirmado. Pré-contrato sem sinal permanece fora da agenda até a liberação financeira.
            </p>
          </div>
          <Button variant="outline" className="h-11 rounded-full border-[#dfd0c9] bg-white" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Atualizar agenda
          </Button>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-3xl border border-[#eaded8] bg-white p-5 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#a18479]">Contratos no mês</div>
            <div className="mt-2 font-serif text-4xl text-[#651421]">{resumo.total}</div>
          </div>
          <div className="rounded-3xl border border-[#d9e8dc] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.16em] text-[#667b6a]"><ShieldCheck className="h-4 w-4" /> Operação liberada</div>
            <div className="mt-2 font-serif text-4xl text-[#651421]">{resumo.liberadas}</div>
          </div>
          <div className="rounded-3xl border border-[#f0dfc4] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.16em] text-[#9a7541]"><WalletCards className="h-4 w-4" /> Aguardando sinal</div>
            <div className="mt-2 font-serif text-4xl text-[#651421]">{resumo.aguardandoSinal}</div>
          </div>
          <div className="rounded-3xl border border-[#eaded8] bg-white p-5 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#a18479]">Próximos 7 dias</div>
            <div className="mt-2 font-serif text-4xl text-[#651421]">{resumo.proximas7}</div>
          </div>
          <div className="rounded-3xl border border-[#eaded8] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.16em] text-[#a18479]"><CalendarDays className="h-4 w-4 text-[#d87982]" /> Legenda</div>
            <CalendarLegend />
          </div>
        </div>

        {aguardandoSinalList.length > 0 && !loading && (
          <section className="rounded-3xl border border-[#ecd9b8] bg-[#fff9ed] p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#815f2d]">
              <WalletCards className="h-4 w-4" /> Aguardando confirmação de recebimento
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {aguardandoSinalList.map((order) => {
                const data = toDateISO(order.details?.dataEvento);
                const tema = String(order.details?.tema || "Tema não informado");
                return (
                  <button
                    key={order.id}
                    type="button"
                    className="rounded-2xl border border-[#ead8b6] bg-white p-3 text-left transition hover:border-[#c89b58] hover:shadow-sm"
                    onClick={() => navigate({ to: "/admin/$id", params: { id: order.id } })}
                  >
                    <div className="font-medium text-[#651421]">{order.nome || "Cliente não informado"}</div>
                    <div className="mt-1 text-xs text-[#806e67]">{tema}</div>
                    <div className="mt-2 text-xs font-medium text-[#9a7541]">Festa: {data ? data.split("-").reverse().join("/") : "sem data"}</div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {loading ? (
          <div className="flex min-h-72 items-center justify-center gap-2 rounded-3xl border border-[#eaded8] bg-white text-sm text-[#7b676a]"><Loader2 className="h-4 w-4 animate-spin" /> Carregando agenda...</div>
        ) : (
          <div className="rounded-3xl border border-[#eaded8] bg-white p-3 shadow-[0_16px_45px_rgba(91,17,29,.06)] sm:p-5">
            <MonthCalendar
              cursor={cursor}
              onPrev={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              onNext={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              onToday={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }}
              eventsByDay={eventsByDay}
              onOpen={(id) => navigate({ to: "/admin/$id", params: { id } })}
              todayISO={todayISO}
              in7ISO={in7ISO}
              ordens={ordens}
            />
          </div>
        )}
      </div>
    </AdminShell>
  );
}
