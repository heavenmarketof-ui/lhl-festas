import { getKitsByModalidade, fmtPreco } from "@/data/kits";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { StoredOrder } from "@/lib/orders-storage";
import { isContratoAtivo, countItensPendentes } from "@/lib/orders-storage";
import { fetchOrdersFromSheet, setOrderStatusOnSheet } from "@/lib/sheets-api";
import { fetchOrdens, inativarOP } from "@/lib/producao-api";
import { fetchSolicitacoes, cancelarSolicitacao } from "@/lib/solicitacoes-api";
import { setCachedSheetOrders } from "@/lib/orders-cache";
import { formatDateBR, toDateISO } from "@/lib/date-utils";
import { fetchLancamentos, type Lancamento } from "@/lib/financeiro-api";
import { getContractPaymentStatus, indexRecebimentos } from "@/lib/pagamentos";
import { AdminShell } from "@/components/admin-shell";

import { Search, FileText, Calendar, User, Sparkles, RefreshCw, Trash2, Copy, CalendarClock } from "lucide-react";

type ContratosSearch = {
  filter?: "todos" | "pendentes" | "finalizados" | "cancelados" | "pgto" | "devolucao" | "andamento";
  q?: string;
};

export const Route = createFileRoute("/admin/contratos")({
  validateSearch: (s: Record<string, unknown>): ContratosSearch => {
    const allowed = ["todos", "pendentes", "finalizados", "cancelados", "pgto", "devolucao", "andamento"];
    const filter = typeof s.filter === "string" && allowed.includes(s.filter) ? (s.filter as ContratosSearch["filter"]) : undefined;
    const q = typeof s.q === "string" ? s.q : undefined;
    return { filter, q };
  },
  component: ContratosPage,
});

function isEmAndamento(status: string) {
  return status?.toLowerCase().replace(/\s+/g, "") === "emandamento";
}

function ContratosPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [query, setQuery] = useState(search.q ?? "");
  const [filterTab, setFilterTab] = useState<NonNullable<ContratosSearch["filter"]>>(search.filter ?? "todos");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toDelete, setToDelete] = useState<StoredOrder | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Sincroniza estado quando a URL muda (cards clicáveis do Dashboard)
  useEffect(() => { if (search.filter) setFilterTab(search.filter); }, [search.filter]);
  useEffect(() => { if (typeof search.q === "string") setQuery(search.q); }, [search.q]);

  async function load(showToast = false) {
    setRefreshing(true);
    try {
      const remote = await fetchOrdersFromSheet();
      setOrders(remote);
      setCachedSheetOrders(remote);
      if (showToast) toast.success("Contratos atualizados.");
    } catch {
      toast.error("Não foi possível carregar contratos da planilha.");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const todayISO = new Date().toISOString().slice(0, 10);
  const tomorrowISO = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  useEffect(() => {
    fetchLancamentos().then(setLancamentos).catch(() => { /* ignore */ });
  }, []);

  // Fonte única da verdade do status de pagamento dos contratos.
  const recebIdx = useMemo(() => indexRecebimentos(lancamentos), [lancamentos]);
  const temSaldo = (o: StoredOrder) => getContractPaymentStatus(o, recebIdx).saldoReceber > 0;

  const stats = useMemo(() => {
    let retiradasHoje = 0, devolucoesHoje = 0, retiradasAmanha = 0, devolucoesAmanha = 0;
    let ativos = 0, pgtoPend = 0, devPend = 0, anuncio = 0;
    for (const o of orders) {
      const d = o.details;
      if (!d) continue;
      if (o.status === "Cancelado") continue;
      if (toDateISO(d.dataRetirada) === todayISO) retiradasHoje++;
      if (toDateISO(d.dataDevolucao) === todayISO) devolucoesHoje++;
      if (toDateISO(d.dataRetirada) === tomorrowISO) retiradasAmanha++;
      if (toDateISO(d.dataDevolucao) === tomorrowISO) devolucoesAmanha++;
      if (isContratoAtivo(o)) ativos++;
      if (temSaldo(o)) pgtoPend++;
      // Devolução pendente: EM ANDAMENTO + retirada já ocorrida + devolução não confirmada
      const retISO = toDateISO(d.dataRetirada);
      if (
        isEmAndamento(o.status) &&
        d.devolucaoConfirmada !== "Sim" &&
        retISO &&
        retISO <= todayISO
      ) devPend++;
      if (d.veioAnuncio === "Sim") anuncio++;
    }
    return { retiradasHoje, devolucoesHoje, retiradasAmanha, devolucoesAmanha, ativos, pgtoPend, devPend, anuncio };
  }, [orders, todayISO, tomorrowISO, recebIdx]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return orders.filter((o) => {
      if (q) {
        const inText =
          o.nome.toLowerCase().includes(q) ||
          o.cpf.toLowerCase().includes(q) ||
          (o.tema || "").toLowerCase().includes(q) ||
          (o.telefone || "").toLowerCase().includes(q) ||
          (o.details?.nomeAniversariante || "").toLowerCase().includes(q) ||
          (o.details?.tipoFesta || "").toLowerCase().includes(q);
        const inPhone = digits && (o.telefone || "").replace(/\D/g, "").includes(digits);
        if (!inText && !inPhone) return false;
      }
      const d = o.details;
      const retISO = toDateISO(d?.dataRetirada);
      switch (filterTab) {
        case "pendentes": return o.status === "Pendente";
        case "andamento": return isContratoAtivo(o);
        case "finalizados": return o.status === "Finalizado";
        case "cancelados": return o.status === "Cancelado";
        case "pgto": return temSaldo(o) && o.status !== "Cancelado";
        case "devolucao":
          return (
            isEmAndamento(o.status) &&
            d?.devolucaoConfirmada !== "Sim" &&
            !!retISO &&
            retISO <= todayISO
          );
        default: return true;
      }
    });
  }, [orders, query, filterTab, todayISO, recebIdx]);

  // Atualiza URL quando o usuário muda filtro/busca (para permitir shareable/back)
  useEffect(() => {
    const nextFilter = filterTab === "todos" ? undefined : filterTab;
    const nextQ = query.trim() ? query.trim() : undefined;
    if (nextFilter !== search.filter || nextQ !== search.q) {
      navigate({ to: "/admin/contratos", search: { filter: nextFilter, q: nextQ }, replace: true });
    }
  }, [filterTab, query]); // eslint-disable-line react-hooks/exhaustive-deps

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await setOrderStatusOnSheet(toDelete.id, "Excluído");
      
      // Limpeza operacional assíncrona (fogo e esqueça com log de erro se falhar)
      const limparOperacional = async () => {
        try {
          const [ops, solicitacoes] = await Promise.all([
            fetchOrdens(),
            fetchSolicitacoes()
          ]);
          
          const opVinculada = ops.find(o => o.contratoId === toDelete.id);
          const solicitacoesVinculadas = solicitacoes.filter(s => 
            s.pedidoId === toDelete.id && s.status !== "lancada" && s.status !== "cancelada"
          );

          await Promise.all([
            ...(opVinculada ? [inativarOP(opVinculada.id)] : []),
            ...solicitacoesVinculadas.map(s => cancelarSolicitacao(s.id, "Contrato Excluído"))
          ]);
        } catch (err) {
          console.error("Erro na limpeza operacional:", err);
        }
      };

      limparOperacional();

      const next = orders.filter((o) => o.id !== toDelete.id);
      setOrders(next);
      setCachedSheetOrders(next);
      toast.success("Contrato excluído.");
      setToDelete(null);
    } catch {
      toast.error("Falha ao excluir contrato.");
    } finally {
      setDeleting(false);
    }

  }

  return (
    <AdminShell>
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl text-primary">Contratos Recebidos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {loading ? "Carregando..." : `${filtered.length} ${filtered.length === 1 ? "pedido" : "pedidos"}`}
              {query && ` para "${query}"`}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por Nome, CPF, Telefone, Tema, Aniversariante ou Tipo..."
                className="pl-10 h-11 rounded-full bg-card"
              />
            </div>
            <Button
              variant="outline"
              className="h-11 rounded-full"
              onClick={() => load(true)}
              disabled={refreshing}
              title="Atualizar Contratos"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""} sm:mr-2`} />
              <span className="hidden sm:inline">Atualizar Contratos</span>
            </Button>
          </div>
        </div>

        {!loading && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <StatCard label="Contratos Ativos" value={stats.ativos} onClick={() => setFilterTab("andamento")} />
              <StatCard label="Pagamentos Pendentes" value={stats.pgtoPend} tone={stats.pgtoPend > 0 ? "warn" : "ok"} onClick={() => setFilterTab("pgto")} />
              <StatCard label="Devoluções Pendentes" value={stats.devPend} tone={stats.devPend > 0 ? "warn" : "ok"} onClick={() => setFilterTab("devolucao")} />
              <StatCard label="Vindos de Anúncio" value={stats.anuncio} />
            </div>

            <section className="rounded-2xl bg-card border border-border/60 p-4 sm:p-5 mb-6">
              <h2 className="text-sm font-medium text-primary flex items-center gap-2 mb-3">
                <CalendarClock className="h-4 w-4 text-gold" /> Agenda
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <AgendaItem label="Retiradas Hoje" value={stats.retiradasHoje} />
                <AgendaItem label="Devoluções Hoje" value={stats.devolucoesHoje} />
                <AgendaItem label="Retiradas Amanhã" value={stats.retiradasAmanha} />
                <AgendaItem label="Devoluções Amanhã" value={stats.devolucoesAmanha} />
              </div>
            </section>

            <QuickMessages />

            <div className="flex flex-wrap gap-2 mb-5">
              {([
                ["todos", "Todos"],
                ["pendentes", "Pendentes"],
                ["andamento", "Em Andamento"],
                ["finalizados", "Finalizados"],
                ["cancelados", "Cancelados"],
                ["pgto", "Pagamento Pendente"],
                ["devolucao", "Devolução Pendente"],
              ] as const).map(([k, lbl]) => (
                <button
                  key={k}
                  onClick={() => setFilterTab(k)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${filterTab === k ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-primary"}`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </>
        )}

        {loading ? null : filtered.length === 0 ? (
          <EmptyState hasQuery={!!query} />
        ) : (
          <div className="grid gap-4">
            {filtered.map((o) => (
              <OrderCard key={o.id} order={o} onDelete={() => setToDelete(o)} />
            ))}
          </div>
        )}
      </main>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ATENÇÃO</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir este contrato?
              <br />
              Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}

function OrderCard({ order, onDelete }: { order: StoredOrder; onDelete: () => void }) {
  const sentAt = new Date(order.createdAt).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
  const eventDate = formatDateBR(order.details?.dataEvento);
  const badgeCls =
    order.status === "Finalizado"
      ? "bg-gold/20 text-gold-foreground border border-gold/40"
      : "bg-primary/15 text-primary border border-primary/20";
  return (
    <article className="group rounded-2xl bg-card border border-border/60 p-5 sm:p-6 shadow-sm hover:shadow-[var(--shadow-soft)] transition-shadow">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h3 className="font-serif text-xl text-primary truncate">{order.nome || "—"}</h3>
            <Badge className={`${badgeCls} rounded-full font-normal`}>{order.status}</Badge>
          </div>
          {(order.details?.nomeAniversariante || order.details?.tipoFesta) && (
            <p className="text-xs text-muted-foreground mb-2 truncate">
              {order.details?.tipoFesta && <span>{order.details.tipoFesta}</span>}
              {order.details?.nomeAniversariante && <span> · Aniversariante: <span className="text-foreground font-medium">{order.details.nomeAniversariante}</span>{order.details?.idadeAniversariante ? ` (${order.details.idadeAniversariante})` : ""}</span>}
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-6 text-sm">
            <InfoRow icon={<Sparkles className="h-3.5 w-3.5 text-gold" />} label="Tema" value={order.tema} />
            <InfoRow icon={<User className="h-3.5 w-3.5 text-gold" />} label="Modalidade" value={order.modalidade} />
            <InfoRow icon={<FileText className="h-3.5 w-3.5 text-gold" />} label="Kit" value={order.plano} />
            <InfoRow icon={<Calendar className="h-3.5 w-3.5 text-gold" />} label="Data do Evento" value={eventDate} />
          </div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-3">
            Enviado em {sentAt}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Button asChild className="rounded-full bg-[image:var(--gradient-elegant)] text-primary-foreground border-0 hover:opacity-95">
            <Link to="/admin/$id" params={{ id: order.id }}>
              <FileText className="h-4 w-4 mr-2" /> Gerenciar Contrato
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={onDelete}
            className="rounded-full text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" /> Excluir
          </Button>
        </div>
      </div>
    </article>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        {icon} {label}
      </p>
      <p className="text-foreground truncate mt-0.5">{value || "—"}</p>
    </div>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="text-center py-20 rounded-2xl border border-dashed border-border bg-card/50">
      <p className="font-serif text-xl text-primary">
        {hasQuery ? "Nenhum pedido encontrado" : "Nenhum contrato ainda"}
      </p>
      <p className="text-sm text-muted-foreground mt-2">
        {hasQuery
          ? "Tente buscar por outro nome ou CPF."
          : "Quando um cliente enviar o formulário, ele aparecerá aqui."}
      </p>
    </div>
  );
}

function StatCard({ label, value, tone = "neutral", onClick }: { label: string; value: number; tone?: "neutral" | "warn" | "ok"; onClick?: () => void }) {
  const color = tone === "warn" ? "text-destructive" : "text-primary";
  const base = "text-left w-full rounded-2xl bg-card border border-border/60 p-4 shadow-sm";
  const interactive = onClick ? " transition-colors hover:border-primary/60 hover:bg-primary/5 cursor-pointer" : "";
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp className={base + interactive} onClick={onClick} type={onClick ? "button" : undefined}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-serif text-3xl mt-1 ${color}`}>{value}</p>
    </Comp>
  );
}

function AgendaItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/50 px-3 py-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-serif text-lg text-primary">{value}</span>
    </div>
  );
}

const listaKits = (m: "festa-na-mesa" | "peg-monte") =>
  getKitsByModalidade(m)
    .map((k) => `• ${k.nome}: ${fmtPreco(k.preco)}`)
    .join("\n");

const QUICK_MESSAGES: { titulo: string; texto: string }[] = [
  {
    titulo: "Como funciona",
    texto:
      "Olá! Tudo bem? 😊\n\nNa LHL Festas trabalhamos com duas modalidades:\n\n• Festa na Mesa — decoração compacta para a mesa principal.\n• Peg & Monte — cenário completo para você retirar e montar em minutos.\n\nCada modalidade tem seus kits oficiais.\n\nQuer que eu envie os valores e os temas disponíveis?",
  },
  {
    titulo: "Valores e reserva",
    texto:
      `Nossos valores:\n\n*Festa na Mesa*\n${listaKits("festa-na-mesa")}\n\n*Peg & Monte*\n${listaKits("peg-monte")}\n\nPara reservar a data, é necessário sinal de 50% e preenchimento do formulário no nosso site. O restante é pago na retirada.`,
  },

  {
    titulo: "Retirada e devolução",
    texto: "A retirada e a devolução são combinadas conforme a data do seu evento.\n\n• Período de uso: 24 horas a partir do horário de retirada.\n• Devolução fora do prazo pode gerar cobrança adicional.\n• As peças devem ser devolvidas higienizadas e nas mesmas condições.",
  },
  {
    titulo: "Política de sinal e caução",
    texto: "*Sinal:* 30% do valor total para reservar a data. O sinal não é devolvido em caso de cancelamento.\n\n*Caução:* valor de garantia pago na retirada e devolvido integralmente na devolução, desde que as peças estejam em perfeito estado e dentro do prazo.\n\nQualquer avaria ou atraso pode ser descontado da caução.",
  },
];

function QuickMessages() {
  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Mensagem "${label}" copiada!`);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };
  return (
    <section className="rounded-2xl bg-card border border-border/60 p-4 sm:p-5 mb-6">
      <h2 className="text-sm font-medium text-primary flex items-center gap-2 mb-3">
        <Copy className="h-4 w-4 text-gold" /> Mensagens Rápidas
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {QUICK_MESSAGES.map((m) => (
          <Button
            key={m.titulo}
            variant="outline"
            className="justify-start h-auto py-2.5 rounded-xl text-left"
            onClick={() => copy(m.texto, m.titulo)}
          >
            <Copy className="h-3.5 w-3.5 mr-2 shrink-0" />
            <span className="truncate">{m.titulo}</span>
          </Button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">Clique para copiar. O envio pelo WhatsApp continua manual.</p>
    </section>
  );
}
