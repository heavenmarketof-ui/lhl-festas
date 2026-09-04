import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Flame,
  ShoppingCart,
  CalendarDays,
  HeartPulse,
  Sparkles,
  FileText,
  Wallet,
  Package,
  Users,
  PlusCircle,
  DollarSign,
  Home,
  TrendingUp,
  Megaphone,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StoredOrder } from "@/lib/orders-storage";
import { fmtBRL, countItensPendentes } from "@/lib/orders-storage";
import { toDateISO } from "@/lib/date-utils";
import { parseValor, type Lancamento } from "@/lib/financeiro-api";
import { getContractPaymentStatus, indexRecebimentos } from "@/lib/pagamentos";
import type { PatrimonioItem } from "@/lib/patrimonio-api";

type QuickActionProps = { to: string; search?: any; icon: React.ReactNode; label: string };
type ActionDest = "/admin/producao" | "/admin/contratos" | "/admin/financeiro";

/* ------------------------------ helpers ------------------------------ */

function parseNum(v: unknown): number {
  if (v == null) return 0;
  const s = String(v)
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
function firstName(nome: string) {
  return (nome || "").trim().split(/\s+/)[0] || "";
}
function greeting(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function daysDiff(iso: string, todayISO: string): number {
  if (!iso) return 9999;
  const a = new Date(`${iso}T00:00:00`).getTime();
  const b = new Date(`${todayISO}T00:00:00`).getTime();
  return Math.floor((a - b) / 86400000);
}
function pct(current: number, prev: number): { text: string; up: boolean | null } {
  if (prev === 0 && current === 0) return { text: "estável", up: null };
  if (prev === 0) return { text: "novo período", up: true };
  const d = ((current - prev) / Math.abs(prev)) * 100;
  const s = `${d >= 0 ? "+" : ""}${d.toFixed(0)}%`;
  return { text: s, up: d >= 0 };
}
function isCaucao(cat: string, desc: string) {
  const s = `${cat} ${desc}`.toLowerCase();
  return s.includes("caução") || s.includes("caucao");
}
function capitalize(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

type PeriodKey = "1" | "7" | "15" | "30";
const PERIODS: { key: PeriodKey; label: string; days: number }[] = [
  { key: "1", label: "Hoje", days: 0 },
  { key: "7", label: "7 dias", days: 7 },
  { key: "15", label: "15 dias", days: 15 },
  { key: "30", label: "30 dias", days: 30 },
];

type Alert = {
  id: string;
  orderId: string;
  text: string;
  severity: "red" | "yellow";
  score: number;
};
type Compra = { orderId: string; nome: string; tema: string; itens: string[] };

/* ============================================================
   JosiPanel — assistente operacional (topo da Central)
   ============================================================ */

export function JosiPanel({
  orders,
  lancamentos,
  patrimonio: _patrimonio,
}: {
  orders: StoredOrder[];
  lancamentos: Lancamento[];
  patrimonio: PatrimonioItem[];
}) {
  const [period, setPeriod] = useState<PeriodKey>("7");
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayISO = useMemo(() => toISO(today), [today]);

  const periodDays = PERIODS.find((p) => p.key === period)?.days ?? 7;
  const endISO = useMemo(
    () => toISO(new Date(today.getTime() + periodDays * 86400000)),
    [today, periodDays],
  );

  const activeOrders = useMemo(() => orders.filter((o) => o.status !== "Cancelado"), [orders]);
  // Regra central de status financeiro (fonte única: recebimentos confirmados).
  const recebIdx = useMemo(() => indexRecebimentos(lancamentos), [lancamentos]);
  const saldoDe = (o: StoredOrder) => getContractPaymentStatus(o, recebIdx).saldoReceber;

  const scoped = useMemo(() => {
    let retiradas = 0,
      devolucoes = 0,
      kitsMontar = 0,
      checklistPendentes = 0;
    let receber = 0,
      eventos = 0;
    const compras: Compra[] = [];
    for (const o of activeOrders) {
      const d = o.details;
      if (!d) continue;
      const evtISO = toDateISO(d.dataEvento);
      const retISO = toDateISO(d.dataRetirada);
      const devISO = toDateISO(d.dataDevolucao);
      const inRange = (iso: string | null) => !!iso && iso >= todayISO && iso <= endISO;

      if (inRange(retISO)) retiradas++;
      if (inRange(devISO)) devolucoes++;
      if (inRange(evtISO)) {
        eventos++;
        if (d.kitSeparado !== "Sim") kitsMontar++;
        if (d.checklistMontado !== "Sim") checklistPendentes++;
        receber += saldoDe(o);
        const obs = (d.observacoesInternas || "").trim();
        if (obs && countItensPendentes(obs) > 0) {
          const itens = obs
            .split(/\r?\n|;|•|·/g)
            .map((s) => s.trim())
            .filter(Boolean);
          if (itens.length)
            compras.push({ orderId: o.id, nome: o.nome || "—", tema: o.tema || "", itens });
        }
      }
    }
    return { retiradas, devolucoes, kitsMontar, checklistPendentes, receber, eventos, compras };
  }, [activeOrders, todayISO, endISO]);

  const alerts = useMemo<Alert[]>(() => {
    const out: Alert[] = [];
    for (const o of activeOrders) {
      const d = o.details;
      if (!d) continue;
      const evtISO = toDateISO(d.dataEvento);
      const displayName = firstName(d.nomeAniversariante || o.nome) || "cliente";
      const inRange = evtISO && evtISO >= todayISO && evtISO <= endISO;
      const diff = evtISO ? daysDiff(evtISO, todayISO) : 9999;

      if (inRange) {
        if (diff <= 1 && d.kitSeparado !== "Sim")
          out.push({
            id: `${o.id}-kit`,
            orderId: o.id,
            severity: "red",
            score: 100 - diff,
            text: `Evento de ${displayName} ${diff === 0 ? "é hoje" : "é amanhã"} e o kit ainda não foi separado.`,
          });
        if (diff <= 1 && d.checklistMontado !== "Sim")
          out.push({
            id: `${o.id}-chk`,
            orderId: o.id,
            severity: "red",
            score: 95 - diff,
            text: `Evento de ${displayName} ${diff === 0 ? "é hoje" : "é amanhã"} e o checklist não está montado.`,
          });
        if (diff <= 1 && saldoDe(o) > 0)
          out.push({
            id: `${o.id}-pgto`,
            orderId: o.id,
            severity: "red",
            score: 90 - diff,
            text: `Pagamento final pendente para o evento de ${displayName} ${diff === 0 ? "hoje" : "amanhã"}.`,
          });
        if (diff <= 3 && diff > 1 && d.checklistMontado !== "Sim")
          out.push({
            id: `${o.id}-chk3`,
            orderId: o.id,
            severity: "yellow",
            score: 60 - diff,
            text: `Evento de ${displayName} em ${diff} dias sem checklist montado.`,
          });
        if (diff <= 2 && diff > 1 && d.kitSeparado !== "Sim")
          out.push({
            id: `${o.id}-kit2`,
            orderId: o.id,
            severity: "yellow",
            score: 55 - diff,
            text: `Evento de ${displayName} em ${diff} dias sem kit separado.`,
          });
        if (!(d.fotoDecoracaoUrl || "").trim())
          out.push({
            id: `${o.id}-foto`,
            orderId: o.id,
            severity: "yellow",
            score: 40 - diff,
            text: `Contrato de ${displayName} sem foto da decoração cadastrada.`,
          });
        if (!(d.nomeAniversariante || "").trim())
          out.push({
            id: `${o.id}-aniv`,
            orderId: o.id,
            severity: "yellow",
            score: 20,
            text: `Contrato de ${o.nome || "cliente"} sem aniversariante informado.`,
          });
        if (!(d.tipoFesta || "").trim())
          out.push({
            id: `${o.id}-tipo`,
            orderId: o.id,
            severity: "yellow",
            score: 18,
            text: `Contrato de ${displayName} sem tipo de festa definido.`,
          });
      }
      if (evtISO && diff < 0 && d.caucaoRecebida === "Sim" && d.caucaoDevolvida !== "Sim")
        out.push({
          id: `${o.id}-caucao`,
          orderId: o.id,
          severity: "yellow",
          score: 30,
          text: `Caução do contrato de ${displayName} ainda não foi devolvida.`,
        });
    }
    return out.sort((a, b) => b.score - a.score);
  }, [activeOrders, todayISO, endISO]);

  // Deduplicação total do Dashboard: a prioridade sai da lista de alertas e
  // as próximas ações nunca repetem um contrato já citado acima.
  const prioridade = alerts[0];
  const alertas = useMemo(() => {
    const vistos = new Set(prioridade ? [prioridade.orderId] : []);
    return alerts.slice(1).filter((a) => {
      if (vistos.has(a.orderId)) return false;
      vistos.add(a.orderId);
      return true;
    });
  }, [alerts, prioridade]);
  const alertasToShow = showAllAlerts ? alertas : alertas.slice(0, 6);

  /** Tarefas futuras do período — agregadas, sem repetir prioridade/alertas. */
  const proximasAcoes = useMemo(() => {
    const out: {
      id: string;
      text: string;
      to: ActionDest;
    }[] = [];
    if (scoped.kitsMontar)
      out.push({
        id: "kits",
        to: "/admin/producao",
        text: `${scoped.kitsMontar} ${scoped.kitsMontar === 1 ? "kit para montar" : "kits para montar"} na Central de Produção.`,
      });
    if (scoped.compras.length)
      out.push({
        id: "compras",
        to: "/admin/producao",
        text: `${scoped.compras.length} ${scoped.compras.length === 1 ? "contrato com item pendente" : "contratos com itens pendentes"} — resolva na Central de Produção.`,
      });
    if (scoped.checklistPendentes)
      out.push({
        id: "checklists",
        to: "/admin/contratos",
        text: `${scoped.checklistPendentes} ${scoped.checklistPendentes === 1 ? "checklist a montar" : "checklists a montar"}.`,
      });
    if (scoped.retiradas)
      out.push({
        id: "retiradas",
        to: "/admin/contratos",
        text: `${scoped.retiradas} ${scoped.retiradas === 1 ? "retirada programada" : "retiradas programadas"}.`,
      });
    if (scoped.devolucoes)
      out.push({
        id: "devolucoes",
        to: "/admin/contratos",
        text: `${scoped.devolucoes} ${scoped.devolucoes === 1 ? "devolução programada" : "devoluções programadas"}.`,
      });
    if (scoped.receber > 0)
      out.push({
        id: "receber",
        to: "/admin/financeiro",
        text: `${fmtBRL(scoped.receber)} para receber neste período.`,
      });
    return out;
  }, [scoped]);

  const recomendacao = useMemo(() => {
    if (proximasAcoes.length) return "Nenhuma urgência: siga as próximas ações abaixo.";
    return "Aproveite para divulgar seus melhores temas nas redes sociais.";
  }, [proximasAcoes]);

  const resumoLinhas = useMemo(() => {
    const partes: string[] = [];
    if (scoped.retiradas)
      partes.push(`${scoped.retiradas} ${scoped.retiradas === 1 ? "retirada" : "retiradas"}`);
    if (scoped.devolucoes)
      partes.push(`${scoped.devolucoes} ${scoped.devolucoes === 1 ? "devolução" : "devoluções"}`);
    if (scoped.kitsMontar)
      partes.push(
        `${scoped.kitsMontar} ${scoped.kitsMontar === 1 ? "kit para montar" : "kits para montar"}`,
      );
    if (scoped.checklistPendentes)
      partes.push(
        `${scoped.checklistPendentes} ${scoped.checklistPendentes === 1 ? "checklist pendente" : "checklists pendentes"}`,
      );
    if (scoped.receber > 0) partes.push(`${fmtBRL(scoped.receber)} para receber`);
    if (scoped.compras.length)
      partes.push(
        `${scoped.compras.length} ${scoped.compras.length === 1 ? "pendência de compra" : "pendências de compra"}`,
      );
    const periodLabel = periodDays === 0 ? "Hoje" : `Nos próximos ${periodDays} dias`;
    if (!partes.length)
      return [`${periodLabel} sua operação está organizada. Nenhuma pendência urgente.`];
    return [`${periodLabel} você possui:`, ...partes.map((p) => `• ${p}`)];
  }, [scoped, periodDays]);

  const nomeUsuario = "Josi";
  const dataLabel = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });

  return (
    <section className="mb-6 space-y-4">
      {/* Cabeçalho */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif text-xl sm:text-2xl text-primary">
              🌸 {greeting(now.getHours())}, {nomeUsuario}!
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Hoje é {dataLabel}.</p>
            <div className="mt-3 space-y-1 text-sm text-foreground/90">
              {resumoLinhas.map((l, i) => (
                <p key={i}>{l}</p>
              ))}
            </div>
          </div>
          <div className="flex gap-1 rounded-full border border-border/60 bg-background/60 p-1 shrink-0">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  period === p.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <MiniStat icon="📦" label="Kits" value={scoped.kitsMontar} />
          <MiniStat icon="📋" label="Checklists" value={scoped.checklistPendentes} />
          <MiniStat icon="🚗" label="Retiradas" value={scoped.retiradas} />
          <MiniStat icon="🏠" label="Devoluções" value={scoped.devolucoes} />
          <MiniStat icon="💰" label="A receber" value={fmtBRL(scoped.receber)} />
          <MiniStat icon="🛒" label="Compras" value={scoped.compras.length} />
        </div>
      </div>

      {/* Ações rápidas */}
      <div className="flex flex-wrap gap-2">
        <QuickAction
          to="/reserva"
          icon={<PlusCircle className="h-3.5 w-3.5" />}
          label="Novo Contrato"
        />
        <QuickAction
          to="/admin/contratos"
          icon={<FileText className="h-3.5 w-3.5" />}
          label="Contratos"
        />
        <QuickAction
          to="/admin/financeiro"
          search={{ tab: "dashboard" }}
          icon={<Wallet className="h-3.5 w-3.5" />}
          label="Financeiro"
        />
        <QuickAction
          to="/admin/patrimonio"
          icon={<Package className="h-3.5 w-3.5" />}
          label="Patrimônio"
        />
        <QuickAction to="/" icon={<Home className="h-3.5 w-3.5" />} label="Reserva Online" />
      </div>

      {/* 1. PRIORIDADE DO DIA — uma única ação, nunca repetida abaixo */}
      <div
        className={`rounded-2xl border p-4 sm:p-5 ${prioridade ? "border-red-300 bg-red-50/60" : "border-emerald-300 bg-emerald-50/60"}`}
      >
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
          {prioridade ? (
            <>
              <Flame className="h-4 w-4 text-red-600" />{" "}
              <span className="text-red-700">🔴 Prioridade do Dia</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-emerald-600" />{" "}
              <span className="text-emerald-700">🟢 Tudo em ordem</span>
            </>
          )}
        </h3>
        {prioridade ? (
          <>
            <p className="text-sm text-foreground/90 mb-3">{prioridade.text}</p>
            <Button asChild size="sm" className="rounded-full">
              <Link to="/admin/$id" params={{ id: prioridade.orderId }}>
                <FileText className="h-3.5 w-3.5 mr-1.5" /> Abrir Contrato
              </Link>
            </Button>
          </>
        ) : (
          <p className="text-sm text-emerald-700">{recomendacao}</p>
        )}
      </div>

      {/* 2. ALERTAS — apenas problemas diferentes da prioridade */}
      {alertas.length > 0 && (
        <div className="rounded-2xl border border-yellow-300 bg-yellow-50/50 p-4 sm:p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-yellow-800">
            <AlertTriangle className="h-4 w-4" /> Alertas ({alertas.length})
          </h3>
          <div className="grid gap-2">
            {alertasToShow.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/70 px-3 py-2"
              >
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${a.severity === "red" ? "bg-red-500" : "bg-yellow-500"}`}
                />
                <p className="text-sm text-foreground/90 flex-1 min-w-0">{a.text}</p>
                <Button asChild size="sm" variant="outline" className="rounded-full">
                  <Link to="/admin/$id" params={{ id: a.orderId }}>
                    <FileText className="h-3.5 w-3.5 mr-1.5" /> Abrir
                  </Link>
                </Button>
              </div>
            ))}
          </div>
          {alertas.length > 6 && (
            <button
              onClick={() => setShowAllAlerts((v) => !v)}
              className="mt-3 text-xs font-medium text-primary hover:underline"
            >
              {showAllAlerts ? "Mostrar menos" : `Ver mais (${alertas.length - 6})`}
            </button>
          )}
        </div>
      )}

      {/* 3. PRÓXIMAS AÇÕES — tarefas futuras, sem repetir prioridade nem alertas */}
      {proximasAcoes.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-primary">
            <CalendarDays className="h-4 w-4 text-gold" /> Próximas ações
          </h3>
          <ul className="space-y-1.5 text-sm text-foreground/90">
            {proximasAcoes.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <span className="text-muted-foreground">•</span>
                <span className="flex-1 min-w-0">{p.text}</span>
                <Button asChild size="sm" variant="ghost" className="rounded-full h-7 text-xs">
                  <Link to={p.to}>Abrir</Link>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ============================================================
   HealthPanel — Saúde da Empresa (bloco gerencial)
   ============================================================ */

export function HealthPanel({
  orders,
  lancamentos,
  patrimonio,
}: {
  orders: StoredOrder[];
  lancamentos: Lancamento[];
  patrimonio: PatrimonioItem[];
}) {
  const activeOrders = useMemo(() => orders.filter((o) => o.status !== "Cancelado"), [orders]);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayISO = useMemo(() => toISO(today), [today]);

  const saldo = useMemo(() => {
    let s = 0;
    for (const l of lancamentos)
      s += l.tipo === "Entrada" ? parseValor(l.valor) : -parseValor(l.valor);
    return s;
  }, [lancamentos]);

  const contasReceber = useMemo(() => {
    const idx = indexRecebimentos(lancamentos);
    let s = 0;
    for (const o of activeOrders) s += getContractPaymentStatus(o, idx).saldoReceber;
    return s;
  }, [activeOrders, lancamentos]);

  const patrimonioTotal = useMemo(() => {
    let s = 0;
    for (const p of patrimonio) s += parseNum(p.valorAquisicao) * (Number(p.quantidade) || 1);
    return s;
  }, [patrimonio]);

  const eventos30 = useMemo(() => {
    const end = toISO(new Date(today.getTime() + 30 * 86400000));
    let c = 0;
    for (const o of activeOrders) {
      const iso = toDateISO(o.details?.dataEvento);
      if (iso && iso >= todayISO && iso <= end) c++;
    }
    return c;
  }, [activeOrders, today, todayISO]);

  return (
    <section className="rounded-2xl bg-card border border-border/60 p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-primary flex items-center gap-2 mb-3">
        <HeartPulse className="h-4 w-4 text-gold" /> Saúde da Empresa
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        <HealthCard
          icon={<Wallet className="h-4 w-4" />}
          label="Saldo em Conta"
          value={fmtBRL(saldo)}
          tone={saldo >= 0 ? "ok" : "warn"}
        />
        <HealthCard
          icon={<DollarSign className="h-4 w-4" />}
          label="A Receber"
          value={fmtBRL(contasReceber)}
        />
        <HealthCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Saldo Previsto"
          value={fmtBRL(saldo + contasReceber)}
          tone="ok"
        />
        <HealthCard
          icon={<CalendarDays className="h-4 w-4" />}
          label="Eventos (30d)"
          value={String(eventos30)}
        />
        <HealthCard
          icon={<Package className="h-4 w-4" />}
          label="Patrimônio Total"
          value={fmtBRL(patrimonioTotal)}
        />
      </div>
    </section>
  );
}

/* ============================================================
   IntelCenter — Centro de Inteligência da LHL (bloco estratégico)
   ============================================================ */

export function IntelCenter({
  orders,
  lancamentos,
  patrimonio,
}: {
  orders: StoredOrder[];
  lancamentos: Lancamento[];
  patrimonio: PatrimonioItem[];
}) {
  const [open, setOpen] = useState(false);
  const activeOrders = useMemo(() => orders.filter((o) => o.status !== "Cancelado"), [orders]);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayISO = useMemo(() => toISO(today), [today]);

  const saldo = useMemo(() => {
    let s = 0;
    for (const l of lancamentos)
      s += l.tipo === "Entrada" ? parseValor(l.valor) : -parseValor(l.valor);
    return s;
  }, [lancamentos]);

  const contasReceber = useMemo(() => {
    const idx = indexRecebimentos(lancamentos);
    let s = 0;
    for (const o of activeOrders) s += getContractPaymentStatus(o, idx).saldoReceber;
    return s;
  }, [activeOrders, lancamentos]);

  const comercial = useMemo(() => {
    const now = new Date();
    const monthY = now.getFullYear();
    const monthM = now.getMonth();
    const start30 = toISO(new Date(today.getTime() - 30 * 86400000));
    const start60 = toISO(new Date(today.getTime() - 60 * 86400000));
    const startYear = `${monthY}-01-01`;

    const count = (arr: string[]) => {
      const map = new Map<string, number>();
      for (const k of arr) {
        const key = (k || "").trim();
        if (!key) continue;
        map.set(key, (map.get(key) ?? 0) + 1);
      }
      return [...map.entries()].sort((a, b) => b[1] - a[1]);
    };

    const temas30: string[] = [],
      temas60: string[] = [],
      temasAno: string[] = [];
    const planosAno: string[] = [],
      modalidadesAno: string[] = [];
    let ticketSum = 0,
      ticketCount = 0;
    let contratosMes = 0;
    let receitaMes = 0,
      receitaMesAnterior = 0;
    const clientes = new Map<string, number>();
    const recentClients = new Map<string, string[]>();

    for (const o of activeOrders) {
      const d = o.details;
      if (!d) continue;
      const evtISO = toDateISO(d.dataEvento);
      if (!evtISO) continue;
      if (evtISO >= start30 && evtISO <= todayISO && o.tema) temas30.push(o.tema);
      if (evtISO >= start60 && evtISO <= todayISO && o.tema) temas60.push(o.tema);
      if (evtISO >= startYear && evtISO <= todayISO) {
        if (o.tema) temasAno.push(o.tema);
        if (o.plano) planosAno.push(o.plano);
        if (o.modalidade) modalidadesAno.push(o.modalidade);
        const v = parseNum(d.valorTotal);
        if (v > 0) {
          ticketSum += v;
          ticketCount++;
        }
      }
      const evtDate = new Date(`${evtISO}T00:00:00`);
      if (evtDate.getFullYear() === monthY && evtDate.getMonth() === monthM) {
        contratosMes++;
        receitaMes += parseNum(d.valorTotal);
      }
      const prevY = monthM === 0 ? monthY - 1 : monthY;
      const prevM = monthM === 0 ? 11 : monthM - 1;
      if (evtDate.getFullYear() === prevY && evtDate.getMonth() === prevM) {
        receitaMesAnterior += parseNum(d.valorTotal);
      }
      const nome = (o.nome || "").trim().toLowerCase();
      if (nome) {
        clientes.set(nome, (clientes.get(nome) ?? 0) + 1);
        const arr = recentClients.get(nome) ?? [];
        arr.push(evtISO);
        recentClients.set(nome, arr);
      }
    }
    const topClientes = [...clientes.entries()].sort((a, b) => b[1] - a[1]);
    const recorrentes = topClientes.filter(([, n]) => n >= 2).length;
    const novos = topClientes.filter(([, n]) => n === 1).length;
    const inativos = [...recentClients.entries()].filter(([, dates]) => {
      const last = dates.sort().slice(-1)[0];
      return last && daysDiff(todayISO, last) > 365;
    });
    return {
      temaTop30: count(temas30)[0],
      temaTop60: count(temas60)[0],
      temaTopAno: count(temasAno)[0],
      planoTop: count(planosAno)[0],
      modalidadeTop: count(modalidadesAno)[0],
      ticketMedio: ticketCount ? ticketSum / ticketCount : 0,
      contratosMes,
      receitaMes,
      receitaMesAnterior,
      topClientes,
      recorrentes,
      novos,
      inativos,
    };
  }, [activeOrders, today, todayISO]);

  const financeiro = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const py = m === 0 ? y - 1 : y;
    const pm = m === 0 ? 11 : m - 1;

    let recMes = 0,
      despMes = 0,
      recAnt = 0,
      despAnt = 0;
    for (const l of lancamentos) {
      if (isCaucao(l.categoria, l.descricao)) continue;
      const iso = (l.data || "").slice(0, 10);
      if (!iso) continue;
      const dt = new Date(`${iso}T00:00:00`);
      const val = parseValor(l.valor);
      if (dt.getFullYear() === y && dt.getMonth() === m) {
        if (l.tipo === "Entrada") recMes += val;
        else despMes += val;
      } else if (dt.getFullYear() === py && dt.getMonth() === pm) {
        if (l.tipo === "Entrada") recAnt += val;
        else despAnt += val;
      }
    }
    return {
      recMes,
      despMes,
      lucroMes: recMes - despMes,
      lucroAnt: recAnt - despAnt,
      recPct: pct(recMes, recAnt),
      despPct: pct(despMes, despAnt),
      lucroPct: pct(recMes - despMes, recAnt - despAnt),
    };
  }, [lancamentos]);

  const patrInsights = useMemo(() => {
    const usages: { text: string; iso: string }[] = [];
    for (const o of activeOrders) {
      const d = o.details;
      const iso = toDateISO(d?.dataEvento) || "";
      const text =
        `${o.tema || ""} ${d?.observacoesInternas || ""} ${d?.observacoes || ""}`.toLowerCase();
      if (text.trim()) usages.push({ text, iso });
    }
    const findLast = (name: string): string | null => {
      const n = name.toLowerCase();
      let last: string | null = null;
      for (const u of usages)
        if (u.text.includes(n) && u.iso && (!last || u.iso > last)) last = u.iso;
      return last;
    };
    const parados: { nome: string; dias: number }[] = [];
    const populares: { nome: string; usos: number }[] = [];
    for (const p of patrimonio) {
      if (!p.nome) continue;
      const n = p.nome.toLowerCase();
      let usos = 0;
      for (const u of usages) if (u.text.includes(n)) usos++;
      populares.push({ nome: p.nome, usos });
      const last = findLast(p.nome);
      if (last) {
        const dias = daysDiff(todayISO, last);
        if (dias > 60) parados.push({ nome: p.nome, dias });
      }
    }
    parados.sort((a, b) => b.dias - a.dias);
    populares.sort((a, b) => b.usos - a.usos);
    return {
      parados: parados.slice(0, 5),
      populares: populares.filter((p) => p.usos > 0).slice(0, 5),
    };
  }, [activeOrders, patrimonio, todayISO]);

  return (
    <section className="rounded-2xl border border-border/60 bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-3 text-left"
      >
        <span className="text-sm font-semibold text-primary flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-gold" /> 📊 Centro de Inteligência da LHL
        </span>
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3">
          <IntelBlock
            title="📈 Insights Comerciais"
            icon={<TrendingUp className="h-4 w-4 text-gold" />}
          >
            <IntelList
              items={[
                comercial.temaTop30 &&
                  `O tema "${comercial.temaTop30[0]}" foi o mais alugado nos últimos 30 dias (${comercial.temaTop30[1]}x).`,
                comercial.temaTop60 &&
                  `Nos últimos 60 dias, o destaque é "${comercial.temaTop60[0]}" (${comercial.temaTop60[1]}x).`,
                comercial.temaTopAno &&
                  `Tema mais alugado do ano: "${comercial.temaTopAno[0]}" (${comercial.temaTopAno[1]}x).`,
                comercial.planoTop &&
                  `O ${comercial.planoTop[0]} continua sendo o mais vendido (${comercial.planoTop[1]} contratos).`,
                comercial.modalidadeTop &&
                  `Modalidade mais escolhida: ${comercial.modalidadeTop[0]} (${comercial.modalidadeTop[1]}x).`,
                comercial.ticketMedio > 0 &&
                  `O ticket médio atual é ${fmtBRL(comercial.ticketMedio)}.`,
                `Contratos com evento neste mês: ${comercial.contratosMes}.`,
                `Faturamento do mês: ${fmtBRL(comercial.receitaMes)} (${pct(comercial.receitaMes, comercial.receitaMesAnterior).text} vs. mês anterior).`,
                comercial.recorrentes > 0 &&
                  `Clientes recorrentes identificados: ${comercial.recorrentes}.`,
                comercial.novos > 0 && `Novos clientes: ${comercial.novos}.`,
              ]}
            />
          </IntelBlock>

          <IntelBlock
            title="💰 Insights Financeiros"
            icon={<Wallet className="h-4 w-4 text-gold" />}
          >
            <IntelList
              items={[
                `Receitas do mês: ${fmtBRL(financeiro.recMes)} (${financeiro.recPct.text}).`,
                `Despesas do mês: ${fmtBRL(financeiro.despMes)} (${financeiro.despPct.text}).`,
                `Lucro estimado do mês: ${fmtBRL(financeiro.lucroMes)} (${financeiro.lucroPct.text}).`,
                `Saldo em conta: ${fmtBRL(saldo)}.`,
                `Contas a receber: ${fmtBRL(contasReceber)}.`,
                `Saldo previsto: ${fmtBRL(saldo + contasReceber)}.`,
                financeiro.despPct.up === true &&
                  financeiro.recPct.up === false &&
                  "⚠ Alerta: despesas crescendo enquanto receitas caem. Reveja gastos do mês.",
              ]}
            />
          </IntelBlock>

          {(patrInsights.parados.length > 0 || patrInsights.populares.length > 0) && (
            <IntelBlock
              title="📦 Insights do Acervo"
              icon={<Package className="h-4 w-4 text-gold" />}
            >
              <IntelList
                items={[
                  ...patrInsights.parados.map(
                    (p) =>
                      `"${p.nome}" está sem utilização há ${p.dias} dias. Sugestão: divulgar nas redes sociais.`,
                  ),
                  ...patrInsights.populares
                    .slice(0, 3)
                    .map(
                      (p) =>
                        `"${p.nome}" foi bastante utilizado (${p.usos}x). Avalie comprar uma segunda unidade ou itens complementares.`,
                    ),
                ]}
              />
            </IntelBlock>
          )}

          {comercial.topClientes.length > 0 && (
            <IntelBlock
              title="👥 Insights de Clientes"
              icon={<Users className="h-4 w-4 text-gold" />}
            >
              <IntelList
                items={[
                  comercial.topClientes[0] &&
                    `${capitalize(comercial.topClientes[0][0])} já contratou ${comercial.topClientes[0][1]}x. Sugestão: oferecer um desconto especial.`,
                  comercial.recorrentes > 0 &&
                    `Você possui ${comercial.recorrentes} ${comercial.recorrentes === 1 ? "cliente recorrente" : "clientes recorrentes"}.`,
                  comercial.novos > 0 &&
                    `${comercial.novos} ${comercial.novos === 1 ? "novo cliente" : "novos clientes"} este ano.`,
                  comercial.inativos.length > 0 &&
                    `${comercial.inativos.length} ${comercial.inativos.length === 1 ? "cliente sem retornar" : "clientes sem retornar"} há mais de 12 meses. Vale enviar uma mensagem.`,
                ]}
              />
            </IntelBlock>
          )}

          <IntelBlock
            title="📣 Ideias para Divulgação"
            icon={<Megaphone className="h-4 w-4 text-gold" />}
          >
            <IntelList
              items={[
                comercial.temaTop30 &&
                  `O tema "${comercial.temaTop30[0]}" está em alta. Faça uma postagem sobre esse tema.`,
                patrInsights.parados[0] &&
                  `O item "${patrInsights.parados[0].nome}" está há ${patrInsights.parados[0].dias} dias sem aluguel. Vale divulgar novamente.`,
                comercial.planoTop &&
                  `O ${comercial.planoTop[0]} está vendendo bem. Considere destacar esse kit nas redes sociais.`,
              ]}
            />
          </IntelBlock>
        </div>
      )}
    </section>
  );
}

/* ------------------------------ small parts ------------------------------ */

function MiniStat({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-background/60 border border-border/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </p>
      <p className="font-serif text-lg text-primary leading-tight mt-0.5">{value}</p>
    </div>
  );
}

function QuickAction({ to, search, icon, label }: QuickActionProps) {
  return (
    <Button asChild size="sm" variant="outline" className="rounded-full h-9">
      <Link to={to as any} search={search}>
        {icon}
        <span className="ml-1.5">{label}</span>
      </Link>
    </Button>
  );
}

function IntelBlock({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-2xl border border-border/60 bg-background/40 group">
      <summary className="cursor-pointer list-none p-4 sm:p-5 flex items-center gap-2">
        <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-0 -rotate-90 transition-transform" />
        <span className="text-sm font-semibold text-primary flex items-center gap-2">
          {icon} {title}
        </span>
      </summary>
      <div className="px-4 sm:px-5 pb-4 sm:pb-5">{children}</div>
    </details>
  );
}

function IntelList({ items }: { items: Array<string | false | null | undefined> }) {
  const filtered = items.filter(Boolean) as string[];
  if (filtered.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem dados suficientes ainda.</p>;
  }
  return (
    <ul className="grid gap-1.5 text-sm text-foreground/90">
      {filtered.map((t, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" /> {t}
        </li>
      ))}
    </ul>
  );
}

function HealthCard({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "neutral" | "ok" | "warn";
}) {
  const color =
    tone === "warn" ? "text-destructive" : tone === "ok" ? "text-emerald-700" : "text-primary";
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <span className="text-gold">{icon}</span> {label}
      </p>
      <p className={`font-serif text-xl mt-1 ${color}`}>{value}</p>
    </div>
  );
}
