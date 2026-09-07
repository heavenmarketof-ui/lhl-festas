import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, FileText, Loader2, Search, Sparkles, UserRound, Wallet } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchOrdersFromSheet } from "@/lib/sheets-api";
import { formatDateBR, toDateISO } from "@/lib/date-utils";
import type { StoredOrder } from "@/lib/orders-storage";

export const Route = createFileRoute("/admin/festas")({
  head: () => ({ meta: [{ title: "Festas — Admin LHL Festas" }] }),
  component: FestasPage,
});

function money(v: unknown) {
  const raw = String(v ?? "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(raw) || 0;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function norm(v: string) {
  return (v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function FestasPage() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"ativas" | "proximas" | "finalizadas" | "todas">("ativas");

  useEffect(() => {
    fetchOrdersFromSheet({ force: true } as any)
      .then(setOrders)
      .catch((err) => setError(err instanceof Error ? err.message : "Não foi possível carregar as festas."))
      .finally(() => setLoading(false));
  }, []);

  const hoje = new Date().toISOString().slice(0, 10);
  const em30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

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
    return { total: validas.length, futuras: futuras.length, proximas: proximas.length, finalizadas: finalizadas.length };
  }, [orders, hoje, em30]);

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
      .filter((o) => !query || norm(`${o.nome} ${o.tema} ${o.modalidade} ${o.plano} ${o.details?.nomeAniversariante || ""}`).includes(query))
      .sort((a, b) => (toDateISO(a.details?.dataEvento) || "9999").localeCompare(toDateISO(b.details?.dataEvento) || "9999"));
  }, [orders, q, filtro, hoje, em30]);

  return (
    <AdminShell>
      <div className="mx-auto w-full max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[.18em] text-[#b27b4e]">Operação comercial</div>
            <h1 className="mt-2 font-serif text-4xl text-[#651421] sm:text-5xl">Festas</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#7b676a]">Cada festa reúne cliente, data, tema, modalidade, contrato e valores em um único lugar.</p>
          </div>
          <Button asChild className="rounded-full bg-[#651421] text-white hover:bg-[#4a0d18]"><Link to="/admin/agenda">Abrir agenda <CalendarDays className="ml-2 h-4 w-4" /></Link></Button>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Festas registradas", stats.total, FileText],
            ["Festas futuras", stats.futuras, CalendarDays],
            ["Próximos 30 dias", stats.proximas, Sparkles],
            ["Finalizadas", stats.finalizadas, Wallet],
          ].map(([label, value, Icon]) => {
            const C = Icon as typeof FileText;
            return <div key={String(label)} className="rounded-3xl border border-[#e7dad4] bg-white p-5 shadow-sm"><C className="h-5 w-5 text-[#d87982]" /><div className="mt-4 text-3xl font-serif text-[#651421]">{String(value)}</div><div className="mt-1 text-xs text-[#8b7477]">{String(label)}</div></div>;
          })}
        </div>

        <section className="rounded-3xl border border-[#e7dad4] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-xl"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a8588]" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente, aniversariante, tema ou modalidade" className="h-12 rounded-2xl border-[#e3d5cf] pl-11" /></div>
            <div className="flex flex-wrap gap-2">
              {([['ativas','Ativas'],['proximas','Próximos 30 dias'],['finalizadas','Finalizadas'],['todas','Todas']] as const).map(([id, label]) => <button key={id} onClick={() => setFiltro(id)} className={`rounded-full px-4 py-2 text-xs font-semibold ${filtro === id ? 'bg-[#651421] text-white' : 'bg-[#f8efeb] text-[#6f4148]'}`}>{label}</button>)}
            </div>
          </div>
        </section>

        {loading ? <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-[#7b676a]"><Loader2 className="h-4 w-4 animate-spin" /> Carregando festas reais...</div> : error ? <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800"><div className="font-semibold">Não foi possível ler os dados do Apps Script.</div><div className="mt-2 text-sm">{error}</div></div> : festas.length === 0 ? <div className="rounded-3xl border border-[#e7dad4] bg-white p-10 text-center text-[#7b676a]">Nenhuma festa encontrada com este filtro.</div> : (
          <div className="grid gap-4 xl:grid-cols-2">
            {festas.map((o) => {
              const d = o.details;
              const data = toDateISO(d?.dataEvento);
              const finalizada = o.status === "Finalizado" || d?.caucaoDevolvida === "Sim";
              return <article key={o.id} className="rounded-3xl border border-[#e7dad4] bg-white p-5 shadow-[0_12px_35px_rgba(91,17,29,.05)]">
                <div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex items-center gap-2 text-xs text-[#9a7e82]"><CalendarDays className="h-3.5 w-3.5" />{data ? formatDateBR(data) : "Data não definida"}</div><h2 className="mt-2 truncate font-serif text-2xl text-[#651421]">{o.tema || "Festa sem tema"}</h2><div className="mt-1 flex items-center gap-1.5 text-xs text-[#795f63]"><UserRound className="h-3.5 w-3.5" />{o.nome}</div></div><span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${finalizada ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f7e2df] text-[#651421]'}`}>{finalizada ? 'Finalizada' : o.status || 'Em andamento'}</span></div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-[#fbf6f2] p-3"><div className="text-[10px] uppercase tracking-wide text-[#a18479]">Modalidade</div><div className="mt-1 truncate text-sm font-semibold text-[#5b3037]">{o.modalidade || '—'}</div></div><div className="rounded-2xl bg-[#fbf6f2] p-3"><div className="text-[10px] uppercase tracking-wide text-[#a18479]">Kit</div><div className="mt-1 truncate text-sm font-semibold text-[#5b3037]">{o.plano || '—'}</div></div><div className="col-span-2 rounded-2xl bg-[#fbf6f2] p-3 sm:col-span-1"><div className="text-[10px] uppercase tracking-wide text-[#a18479]">Valor</div><div className="mt-1 text-sm font-semibold text-[#5b3037]">{money(d?.valorTotal)}</div></div></div>
                <div className="mt-4 flex justify-end"><Button asChild variant="ghost" className="rounded-full text-[#651421] hover:bg-[#f7e2df]"><Link to="/admin/$id" params={{ id: o.id }}>Abrir festa</Link></Button></div>
              </article>;
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
