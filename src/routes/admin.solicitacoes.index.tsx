import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  ClipboardList, RefreshCw, Check, X, Ban, AlertTriangle, Plus, Loader2, Trash2,
} from "lucide-react";
import { fmtBRL, CONTAS_PADRAO, FORMAS_PAGAMENTO, CATEGORIAS_DESPESA_PADRAO } from "@/lib/financeiro-api";
import {
  fetchSolicitacoes, autorizarSolicitacao, recusarSolicitacao, cancelarSolicitacao,
  revogarAutorizacao, criarSolicitacao, executarEmLote, type ResultadoLote,
} from "@/lib/solicitacoes-api";
import {
  SOLICITACAO_STATUS, STATUS_LABEL, STATUS_EMOJI, STATUS_CLASS,
  TIPO_LABEL, responsavelDe, podeAutorizar, podeRecusar, podeCancelar,
  podeRevogarAutorizacao, REVOGAR_AUTORIZACAO_EXPLICACAO, REMOVER_ITEM_EXPLICACAO,
  fmtDataBR, type Solicitacao, type SolicitacaoStatus,
} from "@/lib/solicitacoes-types";
import {
  contextoFestaDaSolicitacao,
  textoPesquisaSolicitacao,
  resumoFestaDaSolicitacao,
} from "@/lib/solicitacoes-view";
import { removerItemCompraSeguro } from "@/lib/compra-remocao-flow";
import { fetchOrdersFromSheet } from "@/lib/sheets-api";
import { getOrders, hydrateOrdersCache, type StoredOrder } from "@/lib/orders-storage";
import {
  prazoDe, URG_CLASS, URG_EMOJI, URG_LABEL, URG_PESO, type Urgencia4,
} from "@/lib/dashboard-aggregator";
import {
  addDaysISO, todayISO, fetchOrdens, type OrdemProducao, type ItemCompra,
} from "@/lib/producao-api";
import {
  RegistrarCompraDialog, type RegistrarCompraAlvo,
} from "@/components/registrar-compra-dialog";

export const Route = createFileRoute("/admin/solicitacoes/")({
  validateSearch: (search: Record<string, unknown>) => ({
    status: (typeof search.status === "string" ? search.status : "pendente") as string,
    urgencia: (typeof search.urgencia === "string" ? search.urgencia : "todas") as string,
    q: (typeof search.q === "string" ? search.q : "") as string,
  }),
  head: () => ({ meta: [{ title: "Central de Solicitações Financeiras — LHL Festas" }] }),
  component: SolicitacoesPage,
  errorComponent: ({ error }) => (
    <AdminShell>
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6">
          <h1 className="font-serif text-xl font-bold text-primary">Não foi possível abrir a Central de Solicitações</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>Tentar novamente</Button>
        </div>
      </main>
    </AdminShell>
  ),
});

type LoteAcao = "autorizar" | "recusar" | "cancelar";

type SolicitacaoView = Solicitacao & {
  retirada: string;
  festa: string;
  dias: number | null;
  urgencia: Urgencia4;
  cliente: string;
  tema: string;
  modalidade: string;
  plano: string;
  pesquisa: string;
};

type ItemAlvo = { op: OrdemProducao; item: ItemCompra };

const selectCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

function StatusBadge({ status }: { status: SolicitacaoStatus }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${STATUS_CLASS[status]}`}>{STATUS_EMOJI[status]} {STATUS_LABEL[status]}</span>;
}

function UrgenciaBadge({ nivel }: { nivel: Urgencia4 }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${URG_CLASS[nivel]}`}>{URG_EMOJI[nivel]} {URG_LABEL[nivel]}</span>;
}

function descricaoItem(s: Solicitacao): string {
  const item = s.itens.find((i) => String(i?.descricao ?? "").trim());
  const bruto = String(item?.descricao ?? "").trim() || String(s.descricao ?? "").trim();
  if (!bruto) return "Item não informado";
  const generico = Object.values(TIPO_LABEL).some((t) => t.toLowerCase() === bruto.toLowerCase());
  return generico ? "Item não informado" : bruto;
}

function pedidoCurto(id: string): string {
  const v = String(id || "").trim();
  return v.length > 10 ? v.slice(0, 6) : v;
}

function prazoTexto(dias: number | null): string {
  if (dias == null) return "Sem data";
  if (dias < 0) return `Atrasado há ${Math.abs(dias)} dia${Math.abs(dias) > 1 ? "s" : ""}`;
  if (dias === 0) return "Hoje";
  if (dias === 1) return "Amanhã";
  return `Em ${dias} dias`;
}

function SolicitacoesPage() {
  const sp = Route.useSearch();
  const navigate = Route.useNavigate();
  const [list, setList] = useState<Solicitacao[]>([]);
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [ops, setOps] = useState<OrdemProducao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [lote, setLote] = useState<LoteAcao | null>(null);
  const [motivo, setMotivo] = useState("");
  const [resultado, setResultado] = useState<ResultadoLote | null>(null);
  const [novaAberta, setNovaAberta] = useState(false);
  const [compraAlvo, setCompraAlvo] = useState<RegistrarCompraAlvo | null>(null);
  const [retDe, setRetDe] = useState("");
  const [retAte, setRetAte] = useState("");

  const fStatus = sp.status;
  const fUrgencia = sp.urgencia;
  const q = sp.q;
  const setFStatus = (status: string) => navigate({ search: (prev) => ({ ...prev, status }) });
  const setFUrgencia = (urgencia: string) => navigate({ search: (prev) => ({ ...prev, urgencia }) });
  const setQ = (valor: string) => navigate({ search: (prev) => ({ ...prev, q: valor }) });

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [rows, ordens] = await Promise.all([
        fetchSolicitacoes(),
        fetchOrdens().catch(() => [] as OrdemProducao[]),
      ]);
      setList(rows);
      setOps(ordens);
      setErro("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar as solicitações.");
    } finally {
      if (!silent) setLoading(false);
    }
    try {
      setOrders(hydrateOrdersCache(await fetchOrdersFromSheet()));
    } catch {
      setOrders(getOrders());
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const findItemOPForSolicitacao = useCallback((s: Solicitacao): ItemAlvo | null => {
    for (const op of ops) {
      const item = op.compras?.find((c) => c.solicitacaoId === s.id);
      if (item) return { op, item };
    }
    if (s.origemItemId) {
      for (const op of ops) {
        const item = op.compras?.find((c) => c.id === s.origemItemId);
        if (item) return { op, item };
      }
    }
    const desc = String(s.descricao || "").trim().toLowerCase();
    for (const op of ops) {
      if (op.contratoId !== s.pedidoId && op.numero !== s.ordemProducao) continue;
      const item = op.compras?.find((c) => {
        const cd = String(c.descricao || "").trim().toLowerCase();
        return !!desc && !!cd && (cd === desc || desc.includes(cd) || cd.includes(desc));
      });
      if (item) return { op, item };
    }
    return null;
  }, [ops]);

  const reconciliadas = useRef<Set<string>>(new Set());
  const reconciliarStatus = useCallback((s: Solicitacao, item: ItemCompra) => {
    if (reconciliadas.current.has(s.id)) return;
    reconciliadas.current.add(s.id);
    void import("@/lib/solicitacoes-api")
      .then((m) => m.marcarCompradaSemFinanceiro({ id: s.id, valorReal: item.valorReal, fornecedor: item.fornecedor || s.fornecedor || "", dataCompra: item.dataCompra }))
      .catch(() => undefined);
  }, []);

  const views = useMemo<SolicitacaoView[]>(() => {
    const byId = new Map(orders.map((o) => [o.id, o]));
    return list.map((s) => {
      const order = byId.get(s.pedidoId);
      const contexto = contextoFestaDaSolicitacao(s, order);
      const p = prazoDe(contexto.retirada, contexto.festa);
      const pendente = s.status === "pendente" || s.status === "autorizada";
      return {
        ...s,
        ...contexto,
        dias: p.dias,
        urgencia: pendente ? p.urgencia : p.urgencia === "urgente" ? "atencao" : p.urgencia,
        pesquisa: textoPesquisaSolicitacao(s, contexto),
      };
    });
  }, [list, orders]);

  const filtradas = useMemo(() => {
    const termo = q.trim().toLowerCase();
    return views
      .filter((s) => {
        if (fStatus !== "todos" && s.status !== fStatus) return false;
        if (fStatus === "autorizada") {
          if (s.lancamentoId) return false;
          const found = findItemOPForSolicitacao(s);
          if (found && (found.item.comprado || found.item.statusCompra === "Compra realizada" || found.item.statusCompra === "Pago")) {
            reconciliarStatus(s, found.item);
            return false;
          }
        }
        if (fUrgencia !== "todas" && s.urgencia !== fUrgencia) return false;
        if (retDe && (!s.retirada || s.retirada < retDe)) return false;
        if (retAte && (!s.retirada || s.retirada > retAte)) return false;
        if (termo && !s.pesquisa.includes(termo)) return false;
        return true;
      })
      .sort((a, b) => {
        const vencA = a.dias != null && a.dias < 0 ? 0 : 1;
        const vencB = b.dias != null && b.dias < 0 ? 0 : 1;
        if (vencA !== vencB) return vencA - vencB;
        const ra = a.retirada || "9999-12-31";
        const rb = b.retirada || "9999-12-31";
        if (ra !== rb) return ra.localeCompare(rb);
        if (URG_PESO[a.urgencia] !== URG_PESO[b.urgencia]) return URG_PESO[a.urgencia] - URG_PESO[b.urgencia];
        return (a.createdAt || "").localeCompare(b.createdAt || "");
      });
  }, [views, fStatus, fUrgencia, q, retDe, retAte, findItemOPForSolicitacao, reconciliarStatus]);

  const alvoCompra = useCallback((s: SolicitacaoView): RegistrarCompraAlvo | null => {
    if (s.status !== "autorizada" && s.status !== "comprada") return null;
    if (s.lancamentoId) return null;
    const found = findItemOPForSolicitacao(s);
    if (!found || found.item.statusCompra === "Pago") return null;
    return {
      op: found.op,
      item: found.item,
      order: orders.find((o) => o.id === found.op.contratoId) || null,
      solicitacao: s,
      cliente: s.cliente,
    };
  }, [findItemOPForSolicitacao, orders]);

  const removerItem = async (s: SolicitacaoView) => {
    const found = findItemOPForSolicitacao(s);
    if (!found) {
      toast.error("Não foi possível localizar o item desta solicitação na Ordem de Produção.");
      return;
    }
    const aviso = `${REMOVER_ITEM_EXPLICACAO}\n\nItem: ${found.item.descricao}\nTema: ${s.tema}\n\nDeseja continuar?`;
    if (!confirm(aviso)) return;
    try {
      const res = await removerItemCompraSeguro(found.op.id, found.item.id);
      setOps((prev) => prev.map((op) => op.id === res.op.id ? res.op : op));
      toast.success(res.decisao.acao === "excluir" ? "Item removido da operação." : "Item cancelado e histórico preservado.");
      await load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível remover o item.");
    }
  };

  const selecionadas = useMemo(() => filtradas.filter((s) => sel[s.id]), [filtradas, sel]);
  const elegiveis = useMemo(() => {
    if (!lote) return [];
    const pode = lote === "autorizar" ? podeAutorizar : lote === "recusar" ? podeRecusar : podeCancelar;
    return selecionadas.filter(pode);
  }, [lote, selecionadas]);
  const totalFiltrado = filtradas.reduce((a, s) => a + s.valor, 0);

  const toggleTodos = (v: boolean) => {
    const next: Record<string, boolean> = {};
    if (v) filtradas.forEach((s) => { next[s.id] = true; });
    setSel(next);
  };

  const executarLote = async () => {
    if (!lote || busy) return;
    if (lote === "recusar" && !motivo.trim()) { toast.error("Informe o motivo da recusa."); return; }
    setBusy(true);
    try {
      const res = await executarEmLote(elegiveis, (s) => {
        if (lote === "autorizar") return autorizarSolicitacao(s.id);
        if (lote === "recusar") return recusarSolicitacao(s.id, motivo.trim());
        return cancelarSolicitacao(s.id, motivo.trim());
      });
      setResultado(res);
      setLote(null);
      setMotivo("");
      setSel({});
      await load(true);
      if (!res.falhas.length) toast.success(`${res.concluidas.length} solicitação(ões) processada(s).`);
      else toast.warning(`${res.concluidas.length} concluída(s) · ${res.falhas.length} com falha.`);
    } finally {
      setBusy(false);
    }
  };

  const atalhoRetirada = (dias: number) => { setRetDe(todayISO()); setRetAte(addDaysISO(dias)); };

  return (
    <AdminShell>
      <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-8 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-serif text-3xl text-primary"><ClipboardList className="h-6 w-6 text-gold" /> Central de Solicitações</h1>
            <p className="mt-1 text-sm text-muted-foreground">Compra, autorização e pagamento são etapas diferentes. Tema e datas são lidos do contrato atual.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setNovaAberta(true)}><Plus className="mr-2 h-4 w-4" /> Nova solicitação</Button>
            <Button variant="outline" onClick={() => load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar</Button>
          </div>
        </header>

        {erro && <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"><p className="flex items-center gap-2 text-sm text-amber-700"><AlertTriangle className="h-4 w-4" /> {erro}</p><Button size="sm" variant="outline" onClick={() => load()}>Tentar novamente</Button></div>}

        <section className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><Label className="text-xs">Status</Label><select className={selectCls} value={fStatus} onChange={(e) => setFStatus(e.target.value)}><option value="todos">Todos</option>{SOLICITACAO_STATUS.map((s) => <option key={s} value={s}>{STATUS_EMOJI[s]} {STATUS_LABEL[s]}</option>)}</select></div>
          <div><Label className="text-xs">Urgência</Label><select className={selectCls} value={fUrgencia} onChange={(e) => setFUrgencia(e.target.value)}><option value="todas">Todas</option><option value="urgente">🔴 Urgente</option><option value="atencao">🟡 Atenção</option><option value="normal">🟢 Normal</option></select></div>
          <div className="sm:col-span-2"><Label className="text-xs">Pesquisar</Label><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Descrição, tema, cliente, modalidade, fornecedor ou pedido..." /></div>
          <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-2 border-t pt-3"><span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Retirada</span><Button size="sm" variant="outline" onClick={() => atalhoRetirada(7)}>Próximos 7 dias</Button><Button size="sm" variant="outline" onClick={() => atalhoRetirada(15)}>Próximos 15 dias</Button><Button size="sm" variant="ghost" onClick={() => { setRetDe(""); setRetAte(""); }}>Limpar</Button>{retDe && <span className="text-xs text-muted-foreground">{fmtDataBR(retDe)} a {fmtDataBR(retAte)}</span>}</div>
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{filtradas.length} solicitação(ões) · {fmtBRL(totalFiltrado)}{selecionadas.length > 0 && ` · ${selecionadas.length} selecionada(s)`}</span>
          <div className="flex-1" />
          <Button size="sm" variant="outline" disabled={!selecionadas.length} onClick={() => setLote("autorizar")}><Check className="mr-2 h-4 w-4" /> Autorizar</Button>
          <Button size="sm" variant="outline" disabled={!selecionadas.length} onClick={() => setLote("recusar")}><X className="mr-2 h-4 w-4" /> Recusar</Button>
          <Button size="sm" variant="outline" disabled={!selecionadas.length} onClick={() => setLote("cancelar")}><Ban className="mr-2 h-4 w-4" /> Cancelar</Button>
        </div>

        <section className="hidden overflow-x-auto rounded-2xl border border-border bg-card md:block">
          <table className="w-full min-w-[1320px] text-sm">
            <thead className="bg-muted/40 text-muted-foreground"><tr><th className="p-2"><Checkbox checked={filtradas.length > 0 && selecionadas.length === filtradas.length} onCheckedChange={(v) => toggleTodos(!!v)} /></th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Urgência</th><th className="p-3 text-left">Item</th><th className="p-3 text-left">Tema / Festa</th><th className="p-3 text-left">Cliente</th><th className="p-3 text-right">Valor</th><th className="p-3 text-left">Retirada</th><th className="p-3 text-left">Fornecedor</th><th className="p-3 text-left">Pedido / OP</th><th className="p-3 text-left">Prazo</th><th className="p-3 text-left">Ações</th></tr></thead>
            <tbody>
              {loading && !list.length && <tr><td colSpan={12} className="p-8 text-center text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Carregando...</td></tr>}
              {!loading && !filtradas.length && <tr><td colSpan={12} className="p-8 text-center text-muted-foreground">Nenhuma solicitação encontrada.</td></tr>}
              {filtradas.map((s) => {
                const compra = alvoCompra(s);
                const operacional = findItemOPForSolicitacao(s);
                return <tr key={s.id} className="border-t align-top hover:bg-muted/20">
                  <td className="p-2"><Checkbox checked={!!sel[s.id]} onCheckedChange={(v) => setSel((p) => ({ ...p, [s.id]: !!v }))} /></td>
                  <td className="p-2"><StatusBadge status={s.status} /></td>
                  <td className="p-2"><UrgenciaBadge nivel={s.urgencia} /></td>
                  <td className="p-3 font-medium">{descricaoItem(s)}</td>
                  <td className="p-3"><div className="font-semibold text-primary">{s.tema}</div><div className="mt-1 text-xs text-muted-foreground">{resumoFestaDaSolicitacao(s)}</div><div className="mt-1 text-xs text-muted-foreground">Festa: {s.festa ? fmtDataBR(s.festa) : "—"}</div></td>
                  <td className="p-3">{s.cliente}</td>
                  <td className="p-3 text-right font-medium">{s.valor > 0 ? fmtBRL(s.valor) : <span className="text-xs font-normal text-muted-foreground">Não informado</span>}</td>
                  <td className="p-3 text-xs">{s.retirada ? fmtDataBR(s.retirada) : "—"}</td>
                  <td className="p-3">{s.fornecedor || <span className="text-muted-foreground">Não informado</span>}</td>
                  <td className="p-3 text-xs">{s.ordemProducao && s.pedidoId ? <Link to="/admin/producao/$id" params={{ id: s.pedidoId }} className="block text-primary underline">{s.ordemProducao}</Link> : s.ordemProducao || "—"}{s.pedidoId && <span className="block text-muted-foreground">Pedido #{pedidoCurto(s.pedidoId)}</span>}</td>
                  <td className="p-3 text-xs">{prazoTexto(s.dias)}</td>
                  <td className="p-2"><div className="flex min-w-[128px] flex-col gap-1">{compra && <Button size="sm" onClick={() => setCompraAlvo(compra)}>Registrar Compra</Button>}{podeRevogarAutorizacao(s) && <Button size="sm" variant="ghost" className="text-amber-700" title={REVOGAR_AUTORIZACAO_EXPLICACAO} onClick={async () => { if (!confirm(`${REVOGAR_AUTORIZACAO_EXPLICACAO}\n\nDeseja continuar?`)) return; try { await revogarAutorizacao(s.id); toast.success("Autorização revogada. O item continua na operação."); await load(true); } catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao revogar."); } }}>Revogar autorização</Button>}{operacional && s.status !== "lancada" && operacional.item.statusCompra !== "Pago" && <Button size="sm" variant="ghost" className="text-destructive" title={REMOVER_ITEM_EXPLICACAO} onClick={() => void removerItem(s)}><Trash2 className="mr-1 h-3.5 w-3.5" /> Remover item</Button>}<Button asChild size="sm" variant="outline"><Link to="/admin/solicitacoes/$id" params={{ id: s.id }}>Abrir</Link></Button></div></td>
                </tr>;
              })}
            </tbody>
          </table>
        </section>

        <section className="space-y-3 md:hidden">
          {loading && !list.length && <p className="text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Carregando...</p>}
          {!loading && !filtradas.length && <p className="text-sm text-muted-foreground">Nenhuma solicitação com os filtros atuais.</p>}
          {filtradas.map((s) => {
            const compra = alvoCompra(s);
            const operacional = findItemOPForSolicitacao(s);
            return <article key={s.id} className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2"><StatusBadge status={s.status} /><UrgenciaBadge nivel={s.urgencia} /></div>
              <div><p className="font-semibold text-primary">{descricaoItem(s)}</p><p className="mt-1 text-sm font-semibold text-[#651421]">{s.tema}</p><p className="text-xs text-muted-foreground">{resumoFestaDaSolicitacao(s)}</p></div>
              <p className="text-lg font-semibold">{s.valor > 0 ? fmtBRL(s.valor) : "Valor não informado"}</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground"><span className="col-span-2">Cliente: <b className="text-foreground">{s.cliente}</b></span><span>Retirada: <b className="text-foreground">{s.retirada ? fmtDataBR(s.retirada) : "—"}</b></span><span>Festa: <b className="text-foreground">{s.festa ? fmtDataBR(s.festa) : "—"}</b></span><span className="col-span-2">Fornecedor: <b className="text-foreground">{s.fornecedor || "Não informado"}</b></span><span className="col-span-2">Prazo: {prazoTexto(s.dias)}</span></div>
              <div className="flex flex-wrap gap-2 pt-1">{compra && <Button size="sm" className="flex-1" onClick={() => setCompraAlvo(compra)}>Registrar Compra</Button>}{podeRevogarAutorizacao(s) && <Button size="sm" variant="outline" onClick={async () => { if (!confirm(`${REVOGAR_AUTORIZACAO_EXPLICACAO}\n\nDeseja continuar?`)) return; try { await revogarAutorizacao(s.id); toast.success("Autorização revogada."); await load(true); } catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao revogar."); } }}>Revogar autorização</Button>}{operacional && s.status !== "lancada" && operacional.item.statusCompra !== "Pago" && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void removerItem(s)}>Remover item</Button>}<Button asChild size="sm" variant="outline"><Link to="/admin/solicitacoes/$id" params={{ id: s.id }}>Abrir</Link></Button></div>
            </article>;
          })}
        </section>
      </main>

      <Dialog open={!!lote} onOpenChange={(o) => { if (!o) { setLote(null); setMotivo(""); } }}>
        <DialogContent><DialogHeader><DialogTitle>{lote === "autorizar" ? "Autorizar solicitações" : lote === "recusar" ? "Recusar solicitações" : "Cancelar solicitações"}</DialogTitle><DialogDescription>Cada solicitação é processada individualmente e mantém auditoria.</DialogDescription></DialogHeader><div className="space-y-3 text-sm"><p><b>Elegíveis:</b> {elegiveis.length} de {selecionadas.length}</p><p><b>Valor:</b> {fmtBRL(elegiveis.reduce((a, s) => a + s.valor, 0))}</p>{(lote === "recusar" || lote === "cancelar") && <div><Label className="text-xs">Motivo {lote === "recusar" ? "(obrigatório)" : "(opcional)"}</Label><Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} /></div>}</div><DialogFooter><Button variant="outline" onClick={() => setLote(null)}>Voltar</Button><Button onClick={executarLote} disabled={busy || !elegiveis.length}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={!!resultado} onOpenChange={(o) => !o && setResultado(null)}><DialogContent><DialogHeader><DialogTitle>Resultado do processamento</DialogTitle></DialogHeader><div className="space-y-2 text-sm"><p className="text-emerald-600">Concluídas: {resultado?.concluidas.length || 0}</p><p className="text-destructive">Falhas: {resultado?.falhas.length || 0}</p>{resultado?.falhas.map((f) => <p key={f.id} className="text-xs text-destructive">{f.descricao || f.id}: {f.erro}</p>)}</div><DialogFooter><Button onClick={() => setResultado(null)}>Fechar</Button></DialogFooter></DialogContent></Dialog>

      <NovaSolicitacaoDialog open={novaAberta} onOpenChange={setNovaAberta} onCreated={() => load(true)} />
      <RegistrarCompraDialog open={!!compraAlvo} op={compraAlvo?.op} item={compraAlvo?.item} cliente={compraAlvo?.cliente} order={compraAlvo?.order} solicitacao={compraAlvo?.solicitacao} onOpenChange={(open) => !open && setCompraAlvo(null)} onSuccess={(nova) => { setOps((prev) => prev.map((o) => o.id === nova.id ? nova : o)); void load(true); }} />
    </AdminShell>
  );
}

function NovaSolicitacaoDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void; }) {
  const [form, setForm] = useState({ descricao: "", fornecedor: "", categoria: "Fornecedor", conta: "Caixa", formaPagamento: "PIX", valor: "", dataPrevista: "", observacoes: "", pedidoId: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const salvar = async () => {
    if (busy) return;
    if (!form.descricao.trim()) { toast.error("Informe a descrição."); return; }
    setBusy(true);
    try {
      await criarSolicitacao({ tipo: "compra_materiais", origem: "compra_manual", ...form });
      toast.success("Solicitação criada e enviada para autorização.");
      onOpenChange(false);
      setForm({ descricao: "", fornecedor: "", categoria: "Fornecedor", conta: "Caixa", formaPagamento: "PIX", valor: "", dataPrevista: "", observacoes: "", pedidoId: "" });
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar a solicitação.");
    } finally {
      setBusy(false);
    }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Nova solicitação financeira</DialogTitle><DialogDescription>Crie uma necessidade de compra. O lançamento no caixa só acontece depois da compra e do pagamento.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><Label className="text-xs">Descrição *</Label><Input value={form.descricao} onChange={(e) => set("descricao", e.target.value)} /></div><div><Label className="text-xs">Fornecedor</Label><Input value={form.fornecedor} onChange={(e) => set("fornecedor", e.target.value)} /></div><div><Label className="text-xs">Valor</Label><Input value={form.valor} onChange={(e) => set("valor", e.target.value)} placeholder="0,00" /></div><div><Label className="text-xs">Categoria</Label><select className={selectCls} value={form.categoria} onChange={(e) => set("categoria", e.target.value)}>{CATEGORIAS_DESPESA_PADRAO.map((c) => <option key={c} value={c}>{c}</option>)}</select></div><div><Label className="text-xs">Conta</Label><select className={selectCls} value={form.conta} onChange={(e) => set("conta", e.target.value)}>{CONTAS_PADRAO.map((c) => <option key={c} value={c}>{c}</option>)}</select></div><div><Label className="text-xs">Forma de pagamento</Label><select className={selectCls} value={form.formaPagamento} onChange={(e) => set("formaPagamento", e.target.value)}>{FORMAS_PAGAMENTO.map((f) => <option key={f} value={f}>{f}</option>)}</select></div><div><Label className="text-xs">Data prevista</Label><Input type="date" value={form.dataPrevista} onChange={(e) => set("dataPrevista", e.target.value)} /></div><div className="sm:col-span-2"><Label className="text-xs">Observações</Label><Textarea rows={3} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} /></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={salvar} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar solicitação</Button></DialogFooter></DialogContent></Dialog>;
}
