import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { fetchOrdersFromSheet } from "@/lib/sheets-api";
import { fetchLancamentos, type Lancamento } from "@/lib/financeiro-api";
import { fetchOrdens, type OrdemProducao } from "@/lib/producao-api";
import { auditarConsistencia, type AlertaAuditoria } from "@/lib/auditoria-consistencia";
import type { StoredOrder } from "@/lib/orders-storage";

export const Route = createFileRoute("/admin/auditoria")({
  head: () => ({ meta: [{ title: "Auditoria — Admin LHL Festas" }] }),
  component: AuditoriaPage,
});

function AuditoriaPage() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [ops, setOps] = useState<OrdemProducao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "critica" | "atencao" | "info">("todos");

  async function load() {
    setLoading(true);
    try {
      const [os, ls, ps] = await Promise.all([
        fetchOrdersFromSheet({ force: true }),
        fetchLancamentos({ force: true }),
        fetchOrdens(),
      ]);
      setOrders(os);
      setLancamentos(ls);
      setOps(ps);
      setErro("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível executar a auditoria.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const resultado = useMemo(() => auditarConsistencia(orders, lancamentos, ops), [orders, lancamentos, ops]);
  const alertas = useMemo(() => resultado.alertas.filter((a) => filtro === "todos" || a.severidade === filtro), [resultado, filtro]);

  const estilo = (a: AlertaAuditoria) => {
    if (a.severidade === "critica") return { box: "border-red-200 bg-red-50", text: "text-red-800", Icon: ShieldAlert };
    if (a.severidade === "atencao") return { box: "border-amber-200 bg-amber-50", text: "text-amber-800", Icon: AlertTriangle };
    return { box: "border-sky-200 bg-sky-50", text: "text-sky-800", Icon: Info };
  };

  return (
    <AdminShell>
      <div className="mx-auto w-full max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[.18em] text-[#b27b4e]">Controle interno</div>
            <h1 className="mt-2 font-serif text-4xl text-[#651421] sm:text-5xl">Auditoria</h1>
            <p className="mt-2 max-w-3xl text-sm text-[#7b676a]">Leitura automática, sem alterar dados, para encontrar divergências entre contratos, recebimentos e Ordens de Produção.</p>
          </div>
          <Button variant="outline" className="rounded-full bg-white" onClick={() => load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Verificar novamente</Button>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-3xl border border-[#eaded8] bg-white p-5 shadow-sm"><div className="text-[10px] uppercase tracking-wide text-[#9a8588]">Contratos verificados</div><div className="mt-2 font-serif text-3xl text-[#651421]">{resultado.contratosVerificados}</div></div>
          <div className="rounded-3xl border border-[#eaded8] bg-white p-5 shadow-sm"><div className="text-[10px] uppercase tracking-wide text-[#9a8588]">OPs verificadas</div><div className="mt-2 font-serif text-3xl text-[#651421]">{resultado.opsVerificadas}</div></div>
          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm"><div className="text-[10px] uppercase tracking-wide text-red-700">Críticos</div><div className="mt-2 font-serif text-3xl text-red-800">{resultado.criticos}</div></div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm"><div className="text-[10px] uppercase tracking-wide text-amber-700">Atenções</div><div className="mt-2 font-serif text-3xl text-amber-800">{resultado.atencoes}</div></div>
          <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5 shadow-sm"><div className="text-[10px] uppercase tracking-wide text-sky-700">Informativos</div><div className="mt-2 font-serif text-3xl text-sky-800">{resultado.infos}</div></div>
        </div>

        <div className="flex flex-wrap gap-2">
          {([['todos','Todos'],['critica','Críticos'],['atencao','Atenções'],['info','Informativos']] as const).map(([id, label]) => <button key={id} onClick={() => setFiltro(id)} className={`rounded-full px-4 py-2 text-xs font-semibold ${filtro === id ? 'bg-[#651421] text-white' : 'border border-[#eaded8] bg-white text-[#6f5459]'}`}>{label}</button>)}
        </div>

        {erro ? <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800">{erro}</div> : loading ? <div className="flex min-h-64 items-center justify-center gap-2 rounded-3xl border border-[#eaded8] bg-white text-sm text-[#7b676a]"><Loader2 className="h-4 w-4 animate-spin" /> Cruzando dados...</div> : alertas.length === 0 ? <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-700" /><h2 className="mt-3 font-serif text-2xl text-emerald-900">Nenhuma divergência neste filtro</h2><p className="mt-1 text-sm text-emerald-800/70">Os dados verificados estão coerentes com as regras atuais.</p></div> : (
          <div className="grid gap-3 xl:grid-cols-2">
            {alertas.map((a) => {
              const s = estilo(a); const Icon = s.Icon;
              return <article key={a.id} className={`rounded-3xl border p-5 ${s.box}`}><div className="flex items-start gap-3"><Icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.text}`} /><div className="min-w-0 flex-1"><div className={`font-semibold ${s.text}`}>{a.titulo}</div>{(a.cliente || a.tema) && <div className="mt-1 text-xs text-[#705e62]">{a.cliente || "Cliente não identificado"}{a.tema ? ` · ${a.tema}` : ""}</div>}<p className="mt-2 text-sm text-[#705e62]">{a.detalhe}</p>{a.contratoId && <div className="mt-4"><Button asChild size="sm" variant="outline" className="rounded-full bg-white"><Link to="/admin/$id" params={{ id: a.contratoId }}>Abrir contrato</Link></Button></div>}</div></div></article>;
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
