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
  ClipboardList, RefreshCw, Search, Check, X, Ban, AlertTriangle, Plus, Loader2,
} from "lucide-react";
import { fmtBRL } from "@/lib/financeiro-api";
import {
  fetchSolicitacoes, autorizarSolicitacao, recusarSolicitacao, cancelarSolicitacao,
  revogarAutorizacao, criarSolicitacao, executarEmLote, type ResultadoLote,
} from "@/lib/solicitacoes-api";

import {
  SOLICITACAO_STATUS, STATUS_LABEL, STATUS_EMOJI, STATUS_CLASS,
  TIPO_LABEL, TIPOS_ATIVOS, ORIGEM_LABEL, ORIGENS_ATIVAS,
  responsavelDe, podeAutorizar, podeRecusar, podeCancelar,
  fmtDataBR, type Solicitacao, type SolicitacaoStatus,
} from "@/lib/solicitacoes-types";
import { CONTAS_PADRAO, FORMAS_PAGAMENTO, CATEGORIAS_DESPESA_PADRAO } from "@/lib/financeiro-api";
import { fetchOrdersFromSheet } from "@/lib/sheets-api";
import { getOrders, hydrateOrdersCache, type StoredOrder } from "@/lib/orders-storage";
import { toDateISO } from "@/lib/date-utils";
import {
  prazoDe, URG_CLASS, URG_EMOJI, URG_LABEL, URG_PESO, type Urgencia4,
} from "@/lib/dashboard-aggregator";
import {
  addDaysISO, todayISO, compraStatusOf, fetchOrdens, type OrdemProducao,
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
          <h1 className="font-serif text-xl text-primary font-bold">Não foi possível abrir a Central de Solicitações</h1>
          <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>Tentar novamente</Button>
        </div>
      </main>
    </AdminShell>
  ),
});

type LoteAcao = "autorizar" | "recusar" | "cancelar";

/** Solicitação + datas lidas do Contrato vinculado (nunca copiadas/armazenadas). */
type SolicitacaoView = Solicitacao & {
  retirada: string;
  festa: string;
  dias: number | null;
  urgencia: Urgencia4;
  cliente: string;
};

const selectCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

function StatusBadge({ status }: { status: SolicitacaoStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${STATUS_CLASS[status]}`}>
      {STATUS_EMOJI[status]} {STATUS_LABEL[status]}
    </span>
  );
}

export function UrgenciaBadge({ nivel }: { nivel: Urgencia4 }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs whitespace-nowrap ${URG_CLASS[nivel]}`}>
      {URG_EMOJI[nivel]} {URG_LABEL[nivel]}
    </span>
  );
}

/** Nome real do item solicitado — nunca o tipo da solicitação, nunca vazio. */
function descricaoItem(s: Solicitacao): string {
  const item = s.itens.find((i) => String(i?.descricao ?? "").trim());
  const bruto = String(item?.descricao ?? "").trim() || String(s.descricao ?? "").trim();
  if (!bruto) return "Item não informado";
  const generico = Object.values(TIPO_LABEL).some(
    (t) => t.toLowerCase() === bruto.toLowerCase(),
  );
  return generico ? "Item não informado" : bruto;
}

/** Identificador curto do pedido para a coluna Pedido / OP. */
function pedidoCurto(id: string): string {
  const v = String(id || "").trim();
  return v.length > 10 ? v.slice(0, 6) : v;
}

/** Prazo em texto (sem "em 0 dias"). */
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
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  // Filtros
  const fStatus = sp.status;
  const fUrgencia = sp.urgencia;
  const q = sp.q;

  const setFStatus = (status: string) => navigate({ search: (prev) => ({ ...prev, status }) });
  const setFUrgencia = (urgencia: string) => navigate({ search: (prev) => ({ ...prev, urgencia }) });
  const setQ = (q: string) => navigate({ search: (prev) => ({ ...prev, q }) });
  const [fTipo, setFTipo] = useState("todos");
  const [fOrigem, setFOrigem] = useState("todas");
  const [fFornecedor, setFFornecedor] = useState("todos");
  const [fCategoria, setFCategoria] = useState("todas");
  const [fCliente, setFCliente] = useState("");
  const [fResponsavel, setFResponsavel] = useState("");
  const [fPedido, setFPedido] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [retDe, setRetDe] = useState("");
  const [retAte, setRetAte] = useState("");
  const [festaDe, setFestaDe] = useState("");
  const [festaAte, setFestaAte] = useState("");
  const [vMin, setVMin] = useState("");
  const [vMax, setVMax] = useState("");
  

  // Diálogos
  const [lote, setLote] = useState<LoteAcao | null>(null);
  const [motivo, setMotivo] = useState("");
  const [resultado, setResultado] = useState<ResultadoLote | null>(null);
  const [novaAberta, setNovaAberta] = useState(false);
  /** Ordens de Produção: fonte da verdade do item operacional de compra. */
  const [ops, setOps] = useState<OrdemProducao[]>([]);
  const [compraAlvo, setCompraAlvo] = useState<RegistrarCompraAlvo | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const rows = await fetchSolicitacoes();
      setList(rows);
      setErro("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar as solicitações.");
    } finally {
      setLoading(false);
    }
    // Falha parcial nos contratos não derruba a fila financeira.
    try {
      setOrders(hydrateOrdersCache(await fetchOrdersFromSheet()));
    } catch {
      setOrders(getOrders());
    }
    try {
      setOps(await fetchOrdens());
    } catch {
      /* OPs indisponíveis — a fila continua visível */
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  /**
   * Mesma ação "Registrar Compra" das outras telas: localiza o item
   * operacional pelo ID persistente (origemItemId) na OP vinculada.
   */
  const findItemOPForSolicitacao = (s: Solicitacao, ops: OrdemProducao[]) => {
    // 1. Vínculo explícito pelo ID da solicitação no item da OP
    for (const op of ops) {
      const item = op.compras?.find(c => c.solicitacaoId === s.id);
      if (item) return { op, item };
    }

    // 2. Vínculo pelo origemItemId (ID persistente do item operacional)
    if (s.origemItemId) {
      for (const op of ops) {
        const item = op.compras?.find(c => c.id === s.origemItemId);
        if (item) return { op, item };
      }
    }

    // 3. Vínculo pelo ID do pedido + descrição do item (fallback seguro)
    const descNormal = s.descricao.toLowerCase();
    for (const op of ops) {
      if (op.contratoId === s.pedidoId || op.numero === s.ordemProducao) {
        const item = op.compras?.find(c => 
          c.descricao.toLowerCase() === descNormal || 
          descNormal.includes(c.descricao.toLowerCase()) ||
          c.descricao.toLowerCase().includes(descNormal)
        );
        if (item) return { op, item };
      }
    }

    return null;
  };

  // Reconciliação de STATUS (sem financeiro): sincroniza no banco, uma única vez
  // por sessão, solicitações autorizadas cujo item na OP já foi comprado.
  const reconciliadas = useRef<Set<string>>(new Set());
  const reconciliarStatus = (id: string, item: { valorReal?: number; fornecedor?: string; dataCompra?: string }, fornecedor?: string) => {
    if (reconciliadas.current.has(id)) return;
    reconciliadas.current.add(id);
    void import("@/lib/solicitacoes-api")
      .then((m) =>
        m.marcarCompradaSemFinanceiro({
          id,
          valorReal: item.valorReal,
          fornecedor: item.fornecedor || fornecedor || "",
          dataCompra: item.dataCompra,
        }),
      )
      .catch(() => {
        /* reconciliação é best-effort — o filtro já esconde o item */
      });
  };

  const alvoCompra = (s: SolicitacaoView): RegistrarCompraAlvo | null => {
    // Só abre o fluxo de compra quem realmente pode avançar:
    //  · autorizada  → registrar a compra;
    //  · comprada    → compra feita sem financeiro, pode registrar no caixa depois.
    // Qualquer outro status (pendente, recusada, cancelada) ou já lançada com
    // lançamento financeiro não abre o fluxo.
    if (s.status !== "autorizada" && s.status !== "comprada") return null;
    if (s.lancamentoId && s.lancamentoId !== "null") return null;

    
    const found = findItemOPForSolicitacao(s, ops);
    if (!found) return null;

    const { op, item } = found;
    
    // REGRA SOBERANA: Não abrir se já estiver Pago no financeiro (idempotência)
    if (item.statusCompra === "Pago") return null;

    return {
      op,
      item,
      order: orders.find((o) => o.id === op.contratoId) || null,
      solicitacao: s,
      cliente: s.cliente,
    };
  };


  // As datas vêm sempre do Contrato vinculado — nada é copiado para a solicitação.
  const views: SolicitacaoView[] = useMemo(() => {
    const byId = new Map(orders.map((o) => [o.id, o]));
    return list.map((s) => {
      const order = byId.get(s.pedidoId);
      const retirada = toDateISO(order?.details?.dataRetirada) || "";
      const festa = toDateISO(order?.details?.dataEvento) || "";
      const p = prazoDe(retirada, festa);
      const pendente = s.status === "pendente" || s.status === "autorizada";
      return {
        ...s,
        retirada,
        festa,
        dias: p.dias,
        urgencia: pendente ? p.urgencia : p.urgencia === "urgente" ? "atencao" : p.urgencia,
        cliente: order?.nome || s.pedidoCliente || "—",
      };
    });
  }, [list, orders]);

  const fornecedores = useMemo(
    () => Array.from(new Set(list.map((s) => s.fornecedor).filter(Boolean))).sort(),
    [list],
  );
  const categorias = useMemo(
    () => Array.from(new Set(list.map((s) => s.categoria).filter(Boolean))).sort(),
    [list],
  );

  const atalhoRetirada = (dias: number) => {
    setRetDe(todayISO());
    setRetAte(addDaysISO(dias));
  };

  const filtradas = useMemo(() => {
    const termo = q.trim().toLowerCase();
    const min = vMin ? Number(vMin.replace(",", ".")) : null;
    const max = vMax ? Number(vMax.replace(",", ".")) : null;
    return views
      .filter((s) => {
        if (fStatus !== "todos") {
          if (s.status !== fStatus) return false;
          // Se filtrando por autorizada, esconder as que já possuem lançamento ou foram compradas na OP
          if (fStatus === "autorizada") {
            if (s.status !== "autorizada") return false;
            // Se já tem ID de lançamento, está paga.
            if (s.lancamentoId && s.lancamentoId !== "null") return false;
            
            // REGRA SOBERANA: Se a OP diz que já comprou, a solicitação sai da fila
            // de ação. Reconciliação de STATUS apenas — uma renderização/filtro
            // NUNCA cria lançamento financeiro.
            const found = findItemOPForSolicitacao(s, ops);
            if (found && (found.item.comprado || found.item.statusCompra === "Compra realizada" || found.item.statusCompra === "Pago")) {
              reconciliarStatus(s.id, found.item, s.fornecedor);
              return false;
            }
          }
        }
        if (fUrgencia !== "todas" && s.urgencia !== fUrgencia) return false;
        if (fTipo !== "todos" && s.tipo !== fTipo) return false;
        if (fOrigem !== "todas" && s.origem !== fOrigem) return false;
        if (fFornecedor !== "todos" && s.fornecedor !== fFornecedor) return false;
        if (fCategoria !== "todas" && s.categoria !== fCategoria) return false;
        if (fCliente && !s.cliente.toLowerCase().includes(fCliente.toLowerCase())) return false;
        if (fResponsavel && !responsavelDe(s).toLowerCase().includes(fResponsavel.toLowerCase())) return false;
        if (fPedido && !`${s.pedidoId} ${s.pedidoCliente} ${s.ordemProducao}`.toLowerCase().includes(fPedido.toLowerCase())) return false;
        const dia = (s.createdAt || "").slice(0, 10);
        if (de && dia < de) return false;
        if (ate && dia > ate) return false;
        if (retDe && (!s.retirada || s.retirada < retDe)) return false;
        if (retAte && (!s.retirada || s.retirada > retAte)) return false;
        if (festaDe && (!s.festa || s.festa < festaDe)) return false;
        if (festaAte && (!s.festa || s.festa > festaAte)) return false;
        if (min != null && s.valor < min) return false;
        if (max != null && s.valor > max) return false;
        if (termo) {
          const alvo = [
            s.descricao, s.fornecedor, s.categoria, s.observacoes,
            s.cliente, s.pedidoCliente, s.pedidoId, s.ordemProducao, s.criadoPorEmail,
          ].join(" ").toLowerCase();
          if (!alvo.includes(termo)) return false;
        }
        return true;
      })
      // Ordenação automática: vencidas → retirada mais próxima → urgentes →
      // pendentes mais antigas → demais.
      .sort((a, b) => {
        const venc = (s: SolicitacaoView) => (s.dias != null && s.dias < 0 ? 0 : 1);
        if (venc(a) !== venc(b)) return venc(a) - venc(b);
        const ra = a.retirada || "9999-12-31";
        const rb = b.retirada || "9999-12-31";
        if (ra !== rb) return ra.localeCompare(rb);
        const ua = URG_PESO[a.urgencia];
        const ub = URG_PESO[b.urgencia];
        if (ua !== ub) return ua - ub;
        const pa = a.status === "pendente" ? 0 : 1;
        const pb = b.status === "pendente" ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return (a.createdAt || "").localeCompare(b.createdAt || "");
      });
  }, [
    views, fStatus, fUrgencia, fTipo, fOrigem, fFornecedor, fCategoria, fCliente,
    fResponsavel, fPedido, de, ate, retDe, retAte, festaDe, festaAte, vMin, vMax, q, ops,
  ]);


  const selecionadas = useMemo(
    () => filtradas.filter((s) => sel[s.id]),
    [filtradas, sel],
  );

  const elegiveis = useMemo(() => {
    if (!lote) return [];
    const pode = lote === "autorizar" ? podeAutorizar : lote === "recusar" ? podeRecusar : podeCancelar;
    return selecionadas.filter(pode);
  }, [lote, selecionadas]);

  const resumoLote = useMemo(() => {
    const total = elegiveis.reduce((a, s) => a + s.valor, 0);
    return {
      qtd: elegiveis.length,
      total,
      categorias: Array.from(new Set(elegiveis.map((s) => s.categoria).filter(Boolean))),
      fornecedores: Array.from(new Set(elegiveis.map((s) => s.fornecedor).filter(Boolean))),
    };
  }, [elegiveis]);

  const totalFiltrado = filtradas.reduce((a, s) => a + s.valor, 0);

  const toggleTodos = (v: boolean) => {
    const next: Record<string, boolean> = {};
    if (v) filtradas.forEach((s) => { next[s.id] = true; });
    setSel(next);
  };

  const executarLote = async () => {
    if (!lote || busy) return;
    if (lote === "recusar" && !motivo.trim()) {
      toast.error("Informe o motivo da recusa.");
      return;
    }
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
      if (res.falhas.length === 0) toast.success(`${res.concluidas.length} solicitação(ões) processada(s).`);
      else toast.warning(`${res.concluidas.length} concluída(s) · ${res.falhas.length} com falha.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell>
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl text-primary flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-gold" /> Central de Solicitações Financeiras
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Toda movimentação passa por aqui. Nenhum lançamento no Fluxo de Caixa é criado sem autorização.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setNovaAberta(true)}>
              <Plus className="h-4 w-4 mr-2" /> Nova solicitação
            </Button>
            <Button variant="outline" onClick={() => load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          </div>
        </header>

        {erro && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 flex items-center justify-between gap-3">
            <p className="text-sm text-amber-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> {erro} Os dados exibidos podem estar desatualizados.
            </p>
            <Button size="sm" variant="outline" onClick={() => load()}>Tentar novamente</Button>
          </div>
        )}

        {/* -------------------------- Filtros -------------------------- */}
        <section className="rounded-xl border border-border bg-card p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label className="text-xs">Status</Label>
            <select className={selectCls} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="todos">Todos</option>
              {SOLICITACAO_STATUS.map((s) => (
                <option key={s} value={s}>{STATUS_EMOJI[s]} {STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Urgência</Label>
            <select className={selectCls} value={fUrgencia} onChange={(e) => setFUrgencia(e.target.value)}>
              <option value="todas">Todas</option>
              <option value="urgente">🔴 Urgente</option>
              <option value="atencao">🟡 Atenção</option>
              <option value="normal">🟢 Normal</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Pesquisar</Label>
            <Input 
              value={q} 
              onChange={(e) => setQ(e.target.value)} 
              placeholder="Descrição, fornecedor, cliente..." 
            />
          </div>
        </section>


        {/* ------------------------ Ações em lote ------------------------ */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {filtradas.length} solicitação(ões) · {fmtBRL(totalFiltrado)}
            {selecionadas.length > 0 && ` · ${selecionadas.length} selecionada(s)`}
          </span>
          <div className="flex-1" />
          <Button size="sm" variant="outline" disabled={!selecionadas.length} onClick={() => setLote("autorizar")}>
            <Check className="h-4 w-4 mr-2" /> Autorizar selecionadas
          </Button>
          <Button size="sm" variant="outline" disabled={!selecionadas.length} onClick={() => setLote("recusar")}>
            <X className="h-4 w-4 mr-2" /> Recusar selecionadas
          </Button>
          <Button size="sm" variant="outline" disabled={!selecionadas.length} onClick={() => setLote("cancelar")}>
            <Ban className="h-4 w-4 mr-2" /> Cancelar selecionadas
          </Button>
        </div>

        {/* --------------------- Fila (desktop) --------------------- */}
        <section className="hidden md:block rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full min-w-[1180px] table-fixed text-sm">
            <colgroup>
              <col className="w-9" />
              <col className="w-[104px]" />
              <col className="w-[84px]" />
              <col className="w-[264px]" />
              <col className="w-[104px]" />
              <col className="w-[160px]" />
              <col className="w-[90px]" />
              <col className="w-[90px]" />
              <col className="w-[140px]" />
              <col className="w-[128px]" />
              <col className="w-[100px]" />
              <col className="w-[70px]" />
            </colgroup>
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="p-2">
                  <Checkbox
                    checked={filtradas.length > 0 && selecionadas.length === filtradas.length}
                    onCheckedChange={(v) => toggleTodos(!!v)}
                    aria-label="Selecionar todas"
                  />
                </th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Urgência</th>
                <th className="pl-4 pr-3 py-2 text-left">Descrição</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-left">Retirada</th>
                <th className="px-3 py-2 text-left">Festa</th>
                <th className="px-3 py-2 text-left">Fornecedor</th>
                <th className="px-3 py-2 text-left">Pedido / OP</th>
                <th className="px-3 py-2 text-left">Dias restantes</th>
                <th className="px-3 py-2 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && list.length === 0 && (
                <tr><td colSpan={12} className="p-6 text-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Carregando...
                </td></tr>
              )}
              {!loading && filtradas.length === 0 && (
                <tr><td colSpan={12} className="p-6 text-center text-muted-foreground">
                  Nenhuma solicitação encontrada com os filtros atuais.
                </td></tr>
              )}
              {filtradas.map((s) => (
                <tr key={s.id} className="border-t border-border/60 hover:bg-muted/20 align-top">
                  <td className="p-2">
                    <Checkbox
                      checked={!!sel[s.id]}
                      onCheckedChange={(v) => setSel((p) => ({ ...p, [s.id]: !!v }))}
                      aria-label="Selecionar solicitação"
                    />
                  </td>
                  <td className="p-2"><StatusBadge status={s.status} /></td>
                  <td className="p-2"><UrgenciaBadge nivel={s.urgencia} /></td>
                  <td className="pl-4 pr-3 py-2">
                    <span
                      className="block font-medium text-foreground line-clamp-3 break-normal [overflow-wrap:normal] [word-break:normal] hyphens-none"
                      title={descricaoItem(s)}
                    >
                      {descricaoItem(s)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-medium whitespace-nowrap tabular-nums">
                    {s.valor > 0
                      ? fmtBRL(s.valor)
                      : <span className="text-muted-foreground font-normal text-xs">Não informado</span>}
                  </td>
                  <td className="px-3 py-2">
                    <span className="block line-clamp-2 break-normal [word-break:normal]" title={s.cliente}>
                      {s.cliente}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">{s.retirada ? fmtDataBR(s.retirada) : "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">{s.festa ? fmtDataBR(s.festa) : "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`block line-clamp-2 break-normal [word-break:normal] ${s.fornecedor ? "" : "text-muted-foreground"}`} title={s.fornecedor || "Não informado"}>
                      {s.fornecedor || "Não informado"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs leading-tight">
                    {s.ordemProducao ? (
                      s.pedidoId ? (
                        <Link
                          to="/admin/producao/$id"
                          params={{ id: s.pedidoId }}
                          className="block text-primary underline truncate"
                        >
                          {s.ordemProducao}
                        </Link>
                      ) : (
                        <span className="block truncate">{s.ordemProducao}</span>
                      )
                    ) : null}
                    {s.pedidoId && (
                      <span className="block text-muted-foreground truncate" title={s.pedidoId}>
                        Pedido #{pedidoCurto(s.pedidoId)}
                      </span>
                    )}
                    {!s.ordemProducao && !s.pedidoId && <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2 text-xs">{prazoTexto(s.dias)}</td>
                  <td className="p-2">
                    <div className="flex flex-col gap-1">
                      {alvoCompra(s) && (
                        <Button
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => setCompraAlvo(alvoCompra(s))}
                        >
                          Registrar Compra
                        </Button>
                      )}
                      {s.status === "autorizada" && !s.lancamentoId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={async () => {
                            if (!confirm("Deseja realmente revogar a autorização desta compra?")) return;
                            try {
                              await revogarAutorizacao(s.id);
                              toast.success("Autorização revogada.");
                              void load(true);
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Falha ao revogar.");
                            }
                          }}
                        >
                          Revogar
                        </Button>
                      )}
                      <Button asChild size="sm" variant="outline" className="h-8 px-2">
                        <Link to="/admin/solicitacoes/$id" params={{ id: s.id }}>Abrir</Link>
                      </Button>

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </section>

        {/* --------------------- Fila (celular) --------------------- */}
        <section className="md:hidden space-y-3">
          {loading && list.length === 0 && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </p>
          )}
          {!loading && filtradas.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma solicitação com os filtros atuais.</p>
          )}
          {filtradas.map((s) => (
            <article key={s.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <StatusBadge status={s.status} />
                <UrgenciaBadge nivel={s.urgencia} />
              </div>
              <p className="font-medium text-primary min-w-0 break-normal">{descricaoItem(s)}</p>
              <p className="text-base font-semibold tabular-nums text-foreground">
                {s.valor > 0 ? fmtBRL(s.valor) : <span className="text-sm font-normal text-muted-foreground">Não informado</span>}
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="col-span-2">Cliente: <b className="text-foreground">{s.cliente}</b></span>
                <span>Retirada: <b className="text-foreground">{s.retirada ? fmtDataBR(s.retirada) : "—"}</b></span>
                <span>Festa: <b className="text-foreground">{s.festa ? fmtDataBR(s.festa) : "—"}</b></span>
                <span className="col-span-2">Fornecedor: <b className="text-foreground">{s.fornecedor || "Não informado"}</b></span>
                <span className="col-span-2">
                  OP:{" "}
                  {s.ordemProducao && s.pedidoId ? (
                    <Link to="/admin/producao/$id" params={{ id: s.pedidoId }} className="text-primary underline">
                      {s.ordemProducao}
                    </Link>
                  ) : (
                    <b className="text-foreground">{s.ordemProducao || "—"}</b>
                  )}
                  {s.pedidoId ? <span> · Pedido #{pedidoCurto(s.pedidoId)}</span> : null}
                </span>
                <span className="col-span-2">Prazo: {prazoTexto(s.dias)}</span>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                {alvoCompra(s) && (
                  <Button size="sm" className="h-10 flex-1" onClick={() => setCompraAlvo(alvoCompra(s))}>
                    Registrar Compra
                  </Button>
                )}
                {s.status === "autorizada" && !s.lancamentoId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-10 text-destructive"
                    onClick={async () => {
                      if (!confirm("Revogar autorização?")) return;
                      try {
                        await revogarAutorizacao(s.id);
                        toast.success("Autorização revogada.");
                        void load(true);
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Falha ao revogar.");
                      }
                    }}
                  >
                    Revogar
                  </Button>
                )}
                <Button asChild size="sm" variant="outline" className="h-10">
                  <Link to="/admin/solicitacoes/$id" params={{ id: s.id }}>Abrir</Link>
                </Button>

              </div>
            </article>

          ))}
        </section>


      </main>

      {/* --------------------- Confirmação do lote --------------------- */}
      <Dialog open={!!lote} onOpenChange={(o) => { if (!o) { setLote(null); setMotivo(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {lote === "autorizar" && "Autorizar solicitações selecionadas"}
              {lote === "recusar" && "Recusar solicitações selecionadas"}
              {lote === "cancelar" && "Cancelar solicitações selecionadas"}
            </DialogTitle>
            <DialogDescription>
              Cada solicitação é processada individualmente, preservando auditoria e validações.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p><b>Quantidade:</b> {resumoLote.qtd}</p>
            <p><b>Valor total:</b> {fmtBRL(resumoLote.total)}</p>
            <p><b>Categorias:</b> {resumoLote.categorias.join(", ") || "—"}</p>
            <p><b>Fornecedores:</b> {resumoLote.fornecedores.join(", ") || "—"}</p>
            {selecionadas.length !== resumoLote.qtd && (
              <p className="text-amber-600 text-xs">
                {selecionadas.length - resumoLote.qtd} solicitação(ões) selecionada(s) não permitem esta ação e serão ignoradas.
              </p>
            )}
            {lote === "autorizar" && (
              <p className="text-xs text-muted-foreground">
                Cada solicitação autorizada gera uma Saída no Fluxo de Caixa.
              </p>
            )}
            {(lote === "recusar" || lote === "cancelar") && (
              <div>
                <Label className="text-xs">
                  Motivo {lote === "recusar" ? "(obrigatório)" : "(opcional)"}
                </Label>
                <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setLote(null); setMotivo(""); }}>Cancelar</Button>
            <Button onClick={executarLote} disabled={busy || resumoLote.qtd === 0}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --------------------- Resultado do lote --------------------- */}
      <Dialog open={!!resultado} onOpenChange={(o) => { if (!o) setResultado(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resultado do processamento</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm max-h-80 overflow-y-auto">
            <p className="text-emerald-600">✅ Concluídas: {resultado?.concluidas.length ?? 0}</p>
            <ul className="text-xs text-muted-foreground list-disc pl-5">
              {resultado?.concluidas.map((c) => <li key={c.id}>{c.descricao || c.id}</li>)}
            </ul>
            {!!resultado?.falhas.length && (
              <>
                <p className="text-destructive">❌ Falhas: {resultado.falhas.length}</p>
                <ul className="text-xs text-destructive/90 list-disc pl-5">
                  {resultado.falhas.map((f) => <li key={f.id}>{f.descricao || f.id} — {f.erro}</li>)}
                </ul>
              </>
            )}
          </div>
          <DialogFooter><Button onClick={() => setResultado(null)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <NovaSolicitacaoDialog
        open={novaAberta}
        onOpenChange={setNovaAberta}
        onCreated={() => load(true)}
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
          void load(true);
        }}
      />
    </AdminShell>
  );
}

/* -------------------------- Nova solicitação -------------------------- */

function NovaSolicitacaoDialog({ open, onOpenChange, onCreated }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    descricao: "", fornecedor: "", categoria: "Fornecedor", conta: "Caixa",
    formaPagamento: "PIX", valor: "", dataPrevista: "", observacoes: "", pedidoId: "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const salvar = async () => {
    if (busy) return;
    if (!form.descricao.trim()) { toast.error("Informe a descrição."); return; }
    setBusy(true);
    try {
      await criarSolicitacao({
        tipo: "compra_materiais",
        origem: "compra_manual",
        ...form,
      });
      toast.success("Solicitação criada e enviada para autorização.");
      onOpenChange(false);
      setForm({
        descricao: "", fornecedor: "", categoria: "Fornecedor", conta: "Caixa",
        formaPagamento: "PIX", valor: "", dataPrevista: "", observacoes: "", pedidoId: "",
      });
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar a solicitação.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova solicitação financeira</DialogTitle>
          <DialogDescription>
            Tipo: Compra de materiais · Origem: Compra Manual (demais tipos serão liberados nas próximas etapas).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="text-xs">Descrição *</Label>
            <Input value={form.descricao} onChange={(e) => set("descricao", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Fornecedor</Label>
            <Input value={form.fornecedor} onChange={(e) => set("fornecedor", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Valor</Label>
            <Input value={form.valor} onChange={(e) => set("valor", e.target.value)} placeholder="0,00" />
          </div>
          <div>
            <Label className="text-xs">Categoria</Label>
            <select className={selectCls} value={form.categoria} onChange={(e) => set("categoria", e.target.value)}>
              {CATEGORIAS_DESPESA_PADRAO.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Conta</Label>
            <select className={selectCls} value={form.conta} onChange={(e) => set("conta", e.target.value)}>
              {CONTAS_PADRAO.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Forma de pagamento</Label>
            <select className={selectCls} value={form.formaPagamento} onChange={(e) => set("formaPagamento", e.target.value)}>
              {FORMAS_PAGAMENTO.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Data prevista</Label>
            <Input type="date" value={form.dataPrevista} onChange={(e) => set("dataPrevista", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Observações</Label>
            <Textarea rows={3} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Criar solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
