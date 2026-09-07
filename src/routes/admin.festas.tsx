import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, FileText, Loader2, Search, Sparkles, UserRound, Wallet, BadgeDollarSign } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchOrdersFromSheet } from "@/lib/sheets-api";
import { fetchLancamentos, fmtBRL, type Lancamento } from "@/lib/financeiro-api";
import { indexRecebimentos } from "@/lib/pagamentos";
import { classeStatusFinanceiro, resumoFinanceiroContrato } from "@/lib/contrato-financeiro-view";
import { formatDateBR, toDateISO } from "@/lib/date-utils";
import type { StoredOrder } from "@/lib/orders-storage";

export const Route = createFileRoute("/admin/festas")({
  head: () => ({ meta: [{ title: "Festas — Admin LHL Festas" }] }),
  component: FestasPage,
});

function norm(v: string) {
  return (v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function FestasPage() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"ativas" | "proximas" | "finalizadas" | "todas">("ativas");
  const [financeiro, setFinanceiro] = useState<"todos" | "aguardando" | "parcial" | "quitado">("todos");

  useEffect(() => {
    Promise.all([
      fetchOrdersFromSheet({ force: true } as any),
      fetchLancamentos({ force: true }),
    ])
      .then(([os, ls]) => { setOrders(os); setLancamentos(ls); })
      .catch((err) => setError(err instanceof Error ? err.message : "Não foi possível carregar as festas."))
      .finally(() => setLoading(false));
  }, []);

  const hoje = new Date().toISOString().slice(0, 10);
  const em30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const idx = useMemo(() => indexRecebimentos(lancamentos), [lancamentos]);

  const stats = useMemo(() => {
    const validas = orders.filter((o) => o.status !== "Cancelado");
    const futuras = validas.filter((o) => {
      const d = toDateISO(o.details?.dataEvento);
      return d && d >= hoje;
    });
    const proximas = futuras.filter((o) => {
      const d = toDateISO(o.details?.dataEvento);
      return d && d <= em30;
    });
    const finalizadas = validas.filter((o) => o.status === "Finalizado" || o.details?.caucaoDevolvida === "Sim");
    let aguardandoSinal = 0;
    let saldoReceber = 0;
    for (const o of validas) {
      const f = resumoFinanceiroContrato(o, idx);
      if (f.status === "Aguardando sinal") aguardandoSinal++;
      saldoReceber += f.saldo;
    }
    return { total: validas.length, futuras: futuras.length, proximas: proximas.length, finalizadas: finalizadas.length, aguardandoSinal, saldoReceber };
  }, [orders, idx, hoje, em30]);

  const festas = useMemo(() => {
    const query = norm(q.trim());
    return orders
      .filter((o) => o.status !== "Cancelado")
      .filter((o) => {
        const d = toDateISO(o.details?.dataEvento);
        const finalizada = o.status === "Finalizado" || o.details?.caucaoDevolvida === "Sim";
        if (filtro === "ativas") return !finalizada;
        if (filtro === "proximas") return !!d && d >= hoje && d <= em30 && !finalizada;
        if (filtro === "finalizadas") return finalizada;
        return true;
      })
      .filter((o) => {
        const f = resumoFinanceiroContrato(o, idx);
        if (financeiro === "aguardando") return f.status === "Aguardando sinal";
        if (financeiro === "parcial") return f.status === "Parcial";
        if (financeiro === "quitado") return f.status === "Quitado";
        return true;
      })
      .filter((o) => !query || norm(`${o.nome} ${o.tema} ${o.modalidade} ${o.plano} ${o.details?.nomeAniversariante || ""}`).includes(query))
      .sort((a, b) => (toDateISO(a.details?.dataEvento) || "9999").localeCompare(toDateISO(b.details?.dataEvento) || "9999"));
  }, [orders, q, filtro, financeiro, idx, hoje, em30]);

  return (
    <AdminShell>
      <div className="mx-auto w-full max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[.18em] text-[#b27b4e]">Operação comercial</div>
            <h1 className="mt-2 font-serif text-4xl text-[#651421] sm:text-5xl">Festas</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#7b676a]">Cliente, evento, contrato e situação financeira em uma única visão. Caução aparece separada e nunca reduz o saldo do serviço.</p>
          </div>
          <Button asChild className="rounded-full bg-[#651421] text-white hover:bg-[#4a0d18]"><Link to="/admin/agenda">Abrir agenda <CalendarDays className="ml-2 h-4 w-4" /></Link></Button>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {[
            ["Festas registradas", String(stats.total), FileText],
            ["Festas futuras", String(stats.futuras), CalendarDays],
            ["Próximos 30 dias", String(stats.proximas), Sparkles],
            ["Finalizadas", String(stats.finalizadas), Wallet],
            ["Aguardando sinal", String(stats.aguardandoSinal), BadgeDollarSign],
            ["Saldo a receber", fmtBRL(stats.saldoReceber), Wallet],
          ].map(([label, value, Icon]) => {
            const C = Icon as typeof FileText;
            return <div key={String(label)} className="rounded-3xl border border-[#e7dad4] bg-white p-5 shadow-sm"><C className="h-5 w-5 text-[#d87982]" /><div className="mt-4 text-2xl font-serif text-[#651421]">{String(value)}</div><div className="mt-1 text-xs text-[#8b7477]">{String(label)}</div></div>;
          })}
        </div>

        <section className="rounded-3xl border border-[#e7dad4] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full max-w-xl"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a8588]" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente, aniversariante, tema ou modalidade" className="h-12 rounded-2xl border-[#e3d5cf] pl-11" /></div>
            <div className="flex flex-wrap gap-2">
              {([['ativas','Ativas'],['proximas','Próximos 30 dias'],['finalizadas','Finalizadas'],['todas','Todas']] as const).map(([id, label]) => <button key={id} onClick={() => setFiltro(id)} className={`rounded-full px-4 py-2 text-xs font-semibold ${filtro === id ? 'bg-[#651421] text-white' : 'bg-[#f8efeb] text-[#6f4148]'}`}>{label}</button>)}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-[#eee2dd] pt-3">
            <span className="self-center text-[10px] font-semibold uppercase tracking-[.14em] text-[#9a8588]">Pagamento</span>
            {([['todos','Todos'],['aguardando','Aguardando sinal'],['parcial','Parcial'],['quitado','Quitado']] as const).map(([id, label]) => <button key={id} onClick={() => setFinanceiro(id)} className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${financeiro === id ? 'border-[#651421] bg-[#f7e2df] text-[#651421]' : 'border-[#eaded8] bg-white text-[#80686c]'}`}>{label}</button>)}
          </div>
        </section>

        {loading ? <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-[#7b676a]"><Loader2 className="h-4 w-4 animate-spin" /> Carregando festas reais...</div> : error ? <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800"><div className="font-semibold">Não foi possível ler os dados do Apps Script.</div><div className="mt-2 text-sm">{error}</div></div> : festas.length === 0 ? <div className="rounded-3xl border border-[#e7dad4] bg-white p-10 text-center text-[#7b676a]">Nenhuma festa encontrada com este filtro.</div> : (
          <div className="grid gap-4 xl:grid-cols-2">
            {festas.map((o) => {
              const d = o.details;
              const data = toDateISO(d?.dataEvento);
              const finalizada = o.status === "Finalizado" || d?.caucaoDevolvida === "Sim";
              const fin = resumoFinanceiroContrato(o, idx);
              return <article key={o.id} className="rounded-3xl border border-[#e7dad4] bg-white p-5 shadow-[0_12px_35px_rgba(91,17,29,.05)]">
                <div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex items-center gap-2 text-xs text-[#9a7e82]"><CalendarDays className="h-3.5 w-3.5" />{data ? formatDateBR(data) : "Data não definida"}</div><h2 className="mt-2 truncate font-serif text-2xl text-[#651421]">{o.tema || "Festa sem tema"}</h2><div className="mt-1 flex items-center gap-1.5 text-xs text-[#795f63]"><UserRound className="h-3.5 w-3.5" />{o.nome}</div></div><div className="flex flex-col items-end gap-2"><span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${finalizada ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f7e2df] text-[#651421]'}`}>{finalizada ? 'Finalizada' : o.status || 'Em andamento'}</span><span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${classeStatusFinanceiro(fin.status)}`}>{fin.status}</span></div></div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-[#fbf6f2] p-3"><div className="text-[10px] uppercase tracking-wide text-[#a18479]">Modalidade</div><div className="mt-1 truncate text-sm font-semibold text-[#5b3037]">{o.modalidade || '—'}</div></div><div className="rounded-2xl bg-[#fbf6f2] p-3"><div className="text-[10px] uppercase tracking-wide text-[#a18479]">Kit</div><div className="mt-1 truncate text-sm font-semibold text-[#5b3037]">{o.plano || '—'}</div></div><div className="col-span-2 rounded-2xl bg-[#fbf6f2] p-3 sm:col-span-1"><div className="text-[10px] uppercase tracking-wide text-[#a18479]">Valor contratado</div><div className="mt-1 text-sm font-semibold text-[#5b3037]">{fmtBRL(fin.valorTotal)}</div></div></div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3"><div className="text-[10px] uppercase tracking-wide text-emerald-700/70">Recebido</div><div className="mt-1 text-sm font-semibold text-emerald-800">{fmtBRL(fin.recebido)}</div></div><div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-3"><div className="text-[10px] uppercase tracking-wide text-rose-700/70">Saldo</div><div className="mt-1 text-sm font-semibold text-rose-800">{fmtBRL(fin.saldo)}</div></div><div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3"><div className="text-[10px] uppercase tracking-wide text-amber-700/70">Sinal previsto</div><div className="mt-1 text-sm font-semibold text-amber-800">{fmtBRL(fin.valorSinal)}</div></div><div className="rounded-2xl border border-slate-100 bg-slate-50 p-3"><div className="text-[10px] uppercase tracking-wide text-slate-600">Caução</div><div className="mt-1 text-sm font-semibold text-slate-700">{fmtBRL(fin.caucao)}</div></div></div>
                <div className="mt-4 flex items-center justify-between gap-3"><p className="text-[11px] text-[#9a8588]">{fin.origemLegado ? 'Status baseado em registro histórico do contrato.' : 'Status baseado no Fluxo de Caixa confirmado.'}</p><Button asChild variant="ghost" className="rounded-full text-[#651421] hover:bg-[#f7e2df]"><Link to="/admin/$id" params={{ id: o.id }}>Abrir festa</Link></Button></div>
              </article>;
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
