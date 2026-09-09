import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { fetchOrdersFromSheet } from "@/lib/sheets-api";
import { fetchLancamentos, fmtBRL, type Lancamento } from "@/lib/financeiro-api";
import { fetchOrdens, type OrdemProducao } from "@/lib/producao-api";
import { getOperacaoGateStatus } from "@/lib/operacao-gate";
import { indexRecebimentos } from "@/lib/pagamentos";
import { classeStatusFinanceiro, resumoFinanceiroContrato, type ContratoFinanceiroView } from "@/lib/contrato-financeiro-view";
import { toDateISO } from "@/lib/date-utils";
import type { StoredOrder } from "@/lib/orders-storage";

export const Route = createFileRoute("/admin/operacao")({
  head: () => ({ meta: [{ title: "Central de Operações — LHL Festas" }] }),
  component: OperacaoPage,
});

type Linha = {
  order: StoredOrder;
  op?: OrdemProducao;
  preparacaoLiberada: boolean;
  quitado: boolean;
  motivo: string;
  motivoFinanceiro: string;
  evento: string;
  retirada: string;
  financeiro: ContratoFinanceiroView;
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
  const idx = useMemo(() => indexRecebimentos(lancamentos), [lancamentos]);

  const linhas = useMemo<Linha[]>(() => orders
    .filter((o) => o.status !== "Cancelado" && o.status !== "Finalizado" && o.status !== "Excluído")
    .map((order) => {
      const gate = getOperacaoGateStatus(order, lancamentos);
      return {
        order,
        op: ops.find((op) => op.contratoId === order.id),
        preparacaoLiberada: gate.preparacaoLiberada,
        quitado: gate.quitado,
        motivo: gate.motivo,
        motivoFinanceiro: gate.motivoEntrega,
        evento: toDateISO(order.details?.dataEvento) || "",
        retirada: toDateISO(order.details?.dataRetirada) || "",
        financeiro: resumoFinanceiroContrato(order, idx),
      };
    })
    .sort((a, b) => (a.retirada || a.evento || "9999").localeCompare(b.retirada || b.evento || "9999")), [orders, ops, lancamentos, idx]);

  const aguardando = linhas.filter((l) => !l.preparacaoLiberada);
  const preparandoComSaldo = linhas.filter((l) => l.preparacaoLiberada && !l.quitado);
  const quitados = linhas.filter((l) => l.preparacaoLiberada && l.quitado);
  const totais = useMemo(() => linhas.reduce((a, l) => ({ recebido: a.recebido + l.financeiro.recebido, saldo: a.saldo + l.financeiro.saldo }), { recebido: 0, saldo: 0 }), [linhas]);

  const Card = ({ l }: { l: Linha }) => (
    <article className="rounded-2xl border border-[#eaded8] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[#4a2730]">{l.order.nome}</p>
          <p className="mt-1 text-sm text-[#7b676a]">{l.order.tema || "Tema não informado"}</p>
          <p className="mt-1 text-xs text-[#9a7d81]">{l.order.modalidade || "—"}{l.order.plano ? ` · ${l.order.plano}` : ""}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${classeStatusFinanceiro(l.financeiro.status)}`}>{l.financeiro.status}</span>
          <Button asChild size="sm" variant="outline" className="rounded-full"><Link to="/admin/$id" params={{ id: l.order.id }}>Abrir contrato</Link></Button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl bg-[#fbf6f2] p-3"><span className="block text-[#9a7d81]">Retirada</span><b className="text-[#5e3940]">{br(l.retirada)}</b></div>
        <div className="rounded-xl bg-[#fbf6f2] p-3"><span className="block text-[#9a7d81]">Festa</span><b className="text-[#5e3940]">{br(l.evento)}</b></div>
        <div className="rounded-xl bg-emerald-50 p-3"><span className="block text-emerald-700/70">Recebido</span><b className="text-emerald-800">{fmtBRL(l.financeiro.recebido)}</b></div>
        <div className="rounded-xl bg-rose-50 p-3"><span className="block text-rose-700/70">Saldo</span><b className="text-rose-800">{fmtBRL(l.financeiro.saldo)}</b></div>
      </div>
      {l.op ? <p className="mt-3 text-xs text-[#8f777b]">{l.op.numero} · {l.op.status}</p> : l.preparacaoLiberada ? <p className="mt-3 text-xs text-amber-700">Ordem de Produção ainda não vinculada.</p> : null}
      {!l.preparacaoLiberada && <p className="mt-2 text-[11px] text-amber-700">{l.motivo}</p>}
      {l.preparacaoLiberada && !l.quitado && <p className="mt-2 text-[11px] font-medium text-rose-700">{l.motivoFinanceiro}</p>}
      {l.preparacaoLiberada && l.quitado && <p className="mt-2 text-[11px] font-medium text-emerald-700">Pagamento quitado.</p>}
    </article>
  );

  return (
    <AdminShell>
      <div className="mx-auto w-full max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[.18em] text-[#b27b4e]">Operação</div>
            <h1 className="mt-2 font-serif text-4xl text-[#651421] sm:text-5xl">Central de Operações</h1>
            <p className="mt-2 max-w-3xl text-sm text-[#7b676a]">O sinal libera compras, produção e preparação. O saldo financeiro permanece visível para controle da equipe, sem bloquear tecnicamente retirada, entrega ou montagem. Caução não conta como pagamento da festa.</p>
          </div>
          <Button variant="outline" className="h-11 rounded-full border-[#dfd0c9] bg-white" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </header>

        {erro && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{erro}</div>}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-3xl border border-[#eaded8] bg-white p-5 shadow-sm"><div className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#a18479]">Contratos em aberto</div><div className="mt-2 font-serif text-4xl text-[#651421]">{linhas.length}</div></div>
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.16em] text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Quitados</div><div className="mt-2 font-serif text-4xl text-emerald-800">{quitados.length}</div></div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.16em] text-amber-700"><ShieldCheck className="h-4 w-4" /> Em preparação c/ saldo</div><div className="mt-2 font-serif text-4xl text-amber-800">{preparandoComSaldo.length}</div></div>
          <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.16em] text-emerald-700"><Wallet className="h-4 w-4" /> Recebido</div><div className="mt-2 font-serif text-2xl text-emerald-800">{fmtBRL(totais.recebido)}</div></div>
          <div className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.16em] text-rose-700"><Wallet className="h-4 w-4" /> Saldo a receber</div><div className="mt-2 font-serif text-2xl text-rose-800">{fmtBRL(totais.saldo)}</div></div>
        </div>

        {loading ? <div className="flex min-h-64 items-center justify-center gap-2 rounded-3xl border border-[#eaded8] bg-white text-sm text-[#7b676a]"><Loader2 className="h-4 w-4 animate-spin" /> Carregando operação...</div> : <>
          <section className="space-y-3"><div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-700" /><h2 className="font-serif text-2xl text-[#651421]">Quitados</h2><span className="text-sm text-[#8b7478]">({quitados.length})</span></div>{quitados.length === 0 ? <div className="rounded-2xl border border-dashed border-[#dfd0c9] bg-white p-6 text-sm text-[#8b7478]">Nenhum contrato quitado no momento.</div> : <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{quitados.map((l) => <Card key={l.order.id} l={l} />)}</div>}</section>
          <section className="space-y-3"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-amber-700" /><h2 className="font-serif text-2xl text-[#651421]">Em preparação — saldo pendente</h2><span className="text-sm text-[#8b7478]">({preparandoComSaldo.length})</span></div><p className="text-sm text-[#7b676a]">Sinal confirmado: a preparação pode seguir. O saldo é exibido apenas para acompanhamento da equipe.</p>{preparandoComSaldo.length === 0 ? <div className="rounded-2xl border border-dashed border-[#dfd0c9] bg-white p-6 text-sm text-[#8b7478]">Nenhum contrato nesta etapa.</div> : <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{preparandoComSaldo.map((l) => <Card key={l.order.id} l={l} />)}</div>}</section>
          <section className="space-y-3"><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-700" /><h2 className="font-serif text-2xl text-[#651421]">Aguardando sinal</h2><span className="text-sm text-[#8b7478]">({aguardando.length})</span></div><p className="text-sm text-[#7b676a]">Sem recebimento confirmado: contrato fica fora da preparação operacional.</p>{aguardando.length === 0 ? <div className="rounded-2xl border border-dashed border-[#dfd0c9] bg-white p-6 text-sm text-[#8b7478]">Nenhum contrato aguardando sinal.</div> : <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{aguardando.map((l) => <Card key={l.order.id} l={l} />)}</div>}</section>
        </>}
      </div>
    </AdminShell>
  );
}
