import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { fetchOrdersFromSheet } from "@/lib/sheets-api";
import { fetchLancamentos, type Lancamento } from "@/lib/financeiro-api";
import { fetchOrdens, type OrdemProducao } from "@/lib/producao-api";
import { getOperacaoGateStatus } from "@/lib/operacao-gate";
import { toDateISO } from "@/lib/date-utils";
import type { StoredOrder } from "@/lib/orders-storage";

export const Route = createFileRoute("/admin/operacao")({
  head: () => ({ meta: [{ title: "Central de Operações — LHL Festas" }] }),
  component: OperacaoPage,
});

type Linha = {
  order: StoredOrder;
  op?: OrdemProducao;
  liberada: boolean;
  recebido: number;
  motivo: string;
  evento: string;
  retirada: string;
};

function br(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : "—";
}

function OperacaoPage() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [ops, setOps] = useState<OrdemProducao[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [pedidos, ordens, fluxo] = await Promise.all([
        fetchOrdersFromSheet({ force: true }),
        fetchOrdens().catch(() => [] as OrdemProducao[]),
        fetchLancamentos({ force: true }),
      ]);
      setOrders(pedidos);
      setOps(ordens);
      setLancamentos(fluxo);
      setErro("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar a operação.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const linhas = useMemo<Linha[]>(() => {
    return orders
      .filter((o) => o.status !== "Cancelado" && o.status !== "Finalizado")
      .map((order) => {
        const gate = getOperacaoGateStatus(order, lancamentos);
        return {
          order,
          op: ops.find((op) => op.contratoId === order.id),
          liberada: gate.liberada,
          recebido: gate.totalRecebido,
          motivo: gate.motivo,
          evento: toDateISO(order.details?.dataEvento) || "",
          retirada: toDateISO(order.details?.dataRetirada) || "",
        };
      })
      .sort((a, b) => (a.retirada || a.evento || "9999").localeCompare(b.retirada || b.evento || "9999"));
  }, [orders, ops, lancamentos]);

  const liberadas = linhas.filter((l) => l.liberada);
  const aguardando = linhas.filter((l) => !l.liberada);

  const Card = ({ l }: { l: Linha }) => (
    <article className="rounded-2xl border border-[#eaded8] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[#4a2730]">{l.order.nome}</p>
          <p className="mt-1 text-sm text-[#7b676a]">{l.order.tema || "Tema não informado"}</p>
          <p className="mt-1 text-xs text-[#9a7d81]">{l.order.modalidade || "—"}{l.order.plano ? ` · ${l.order.plano}` : ""}</p>
        </div>
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <Link to="/admin/$id" params={{ id: l.order.id }}>Abrir contrato</Link>
        </Button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl bg-[#fbf6f2] p-3"><span className="block text-[#9a7d81]">Retirada</span><b className="text-[#5e3940]">{br(l.retirada)}</b></div>
        <div className="rounded-xl bg-[#fbf6f2] p-3"><span className="block text-[#9a7d81]">Festa</span><b className="text-[#5e3940]">{br(l.evento)}</b></div>
      </div>
      {l.op ? <p className="mt-3 text-xs text-[#8f777b]">{l.op.numero} · {l.op.status}</p> : <p className="mt-3 text-xs text-amber-700">Ordem de Produção ainda não vinculada.</p>}
    </article>
  );

  return (
    <AdminShell>
      <div className="mx-auto w-full max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[.18em] text-[#b27b4e]">Operação</div>
            <h1 className="mt-2 font-serif text-4xl text-[#651421] sm:text-5xl">Central de Operações</h1>
            <p className="mt-2 max-w-3xl text-sm text-[#7b676a]">Somente contratos com recebimento confirmado entram na operação. Pré-contrato e caução não liberam compras, produção ou preparação.</p>
          </div>
          <Button variant="outline" className="h-11 rounded-full border-[#dfd0c9] bg-white" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </header>

        {erro && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{erro}</div>}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-[#eaded8] bg-white p-5 shadow-sm"><div className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#a18479]">Contratos em aberto</div><div className="mt-2 font-serif text-4xl text-[#651421]">{linhas.length}</div></div>
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.16em] text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Operação liberada</div><div className="mt-2 font-serif text-4xl text-emerald-800">{liberadas.length}</div></div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.16em] text-amber-700"><AlertTriangle className="h-4 w-4" /> Aguardando sinal</div><div className="mt-2 font-serif text-4xl text-amber-800">{aguardando.length}</div></div>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 rounded-3xl border border-[#eaded8] bg-white text-sm text-[#7b676a]"><Loader2 className="h-4 w-4 animate-spin" /> Carregando operação...</div>
        ) : (
          <>
            <section className="space-y-3">
              <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-700" /><h2 className="font-serif text-2xl text-[#651421]">Operação liberada</h2><span className="text-sm text-[#8b7478]">({liberadas.length})</span></div>
              {liberadas.length === 0 ? <div className="rounded-2xl border border-dashed border-[#dfd0c9] bg-white p-6 text-sm text-[#8b7478]">Nenhum contrato liberado no momento.</div> : <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{liberadas.map((l) => <Card key={l.order.id} l={l} />)}</div>}
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-700" /><h2 className="font-serif text-2xl text-[#651421]">Aguardando sinal</h2><span className="text-sm text-[#8b7478]">({aguardando.length})</span></div>
              <p className="text-sm text-[#7b676a]">Estes contratos permanecem visíveis para acompanhamento, mas ficam fora da fila operacional até existir recebimento confirmado.</p>
              {aguardando.length === 0 ? <div className="rounded-2xl border border-dashed border-[#dfd0c9] bg-white p-6 text-sm text-[#8b7478]">Nenhum contrato aguardando sinal.</div> : <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{aguardando.map((l) => <Card key={l.order.id} l={l} />)}</div>}
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}
