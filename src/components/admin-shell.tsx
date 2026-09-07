import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { type OrdemProducao, pendenciasOperacionais, isAtrasada } from "@/lib/producao-api";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Eye,
  Home,
  FileText,
  Wallet,
  Package,
  Lock,
  Factory,
  LogOut,
  ClipboardCheck,
  Menu,
  X,
  Users,
  CalendarDays,
  Database,
} from "lucide-react";
import { useState } from "react";
import logo from "@/assets/lhl-logo.png";
import type { StoredOrder } from "@/lib/orders-storage";
import { countItensPendentes } from "@/lib/orders-storage";
import { toDateISO } from "@/lib/date-utils";
import { signOutAdmin, useAdminSession } from "@/lib/auth-session";
import { SectionBoundary } from "@/components/section-boundary";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { email } = useAdminSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const previewReadOnly = import.meta.env.DEV && String(import.meta.env.VITE_ADMIN_WRITES || "").toLowerCase() !== "true";

  const active = (prefix: string, exact = false) => exact ? pathname === prefix || pathname === `${prefix}/` : pathname.startsWith(prefix);

  const nav = [
    { label: "Hoje", to: "/admin", icon: Home, exact: true, desc: "Operação do dia" },
    { label: "Clientes", to: "/admin/clientes", icon: Users, desc: "Histórico por pessoa" },
    { label: "Festas", to: "/admin/contratos", icon: FileText, desc: "Contratos e eventos" },
    { label: "Agenda", to: "/admin/agenda", icon: CalendarDays, desc: "Calendário de festas" },
    { label: "Produção", to: "/admin/producao", icon: Factory, desc: "Kits, compras e preparação", search: { filtro: "pendentes", etapa: "todas", q: "" } },
    { label: "Financeiro", to: "/admin/financeiro", icon: Wallet, desc: "Entradas e saídas", search: { tab: "dashboard" } },
    { label: "Gestão", to: "/admin/gestao", icon: BarChart3, desc: "Indicadores do negócio" },
    { label: "Patrimônio", to: "/admin/patrimonio", icon: Package, desc: "Acervo e bens" },
  ] as const;

  const secondary = [
    { label: "Solicitações", to: "/admin/solicitacoes", icon: ClipboardCheck, search: { status: "pendente", urgencia: "todas", q: "" } },
    { label: "Itens exclusivos", to: "/admin/itens-exclusivos", icon: Lock },
  ] as const;

  const NavItem = ({ item }: { item: (typeof nav)[number] | (typeof secondary)[number] }) => {
    const Icon = item.icon;
    const isActive = active(item.to, "exact" in item && !!item.exact);
    return (
      <Link
        to={item.to as any}
        search={("search" in item ? item.search : undefined) as any}
        onClick={() => setMobileOpen(false)}
        className={`group flex items-center gap-3 rounded-2xl px-3 py-3 transition ${isActive ? "bg-white text-[#5a111d] shadow-sm" : "text-white/76 hover:bg-white/10 hover:text-white"}`}
      >
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${isActive ? "bg-[#f7ded9]" : "bg-white/8"}`}><Icon className="h-4 w-4" /></span>
        <span className="min-w-0"><span className="block text-sm font-semibold leading-tight">{item.label}</span>{"desc" in item && <span className={`mt-0.5 block text-[11px] ${isActive ? "text-[#79585d]" : "text-white/46"}`}>{item.desc}</span>}</span>
      </Link>
    );
  };

  return (
    <div id="admin-app" className="min-h-screen bg-[#f8f5f1] text-[#3f2529] lg:grid lg:grid-cols-[270px_minmax(0,1fr)]">
      <aside className="hidden min-h-screen flex-col bg-gradient-to-b from-[#4a0d18] via-[#651421] to-[#3c0911] p-4 text-white lg:sticky lg:top-0 lg:flex lg:h-screen">
        <Link to="/admin" className="mb-4 flex items-center gap-3 rounded-2xl px-2 py-2"><img src={logo} alt="LHL Festas" className="h-12 w-12 rounded-full border border-[#d7ad68]/45 object-cover" /><div><p className="font-serif text-xl leading-none text-[#f2d091]">LHL Festas</p><p className="mt-1 text-[10px] uppercase tracking-[.18em] text-white/45">Admin Oficial</p></div></Link>
        {previewReadOnly && (
          <div className="mb-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2.5 text-[11px] leading-relaxed text-emerald-50">
            <div className="flex items-center gap-2 font-semibold"><Database className="h-3.5 w-3.5" /> Dados reais conectados</div>
            <div className="mt-1 text-emerald-50/65">Modo visualização • alterações no Apps Script bloqueadas.</div>
          </div>
        )}
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-white/38">Operação</div>
        <nav className="space-y-1 overflow-y-auto pr-1">{nav.map((item) => <NavItem key={item.label} item={item} />)}</nav>
        <div className="mt-5 px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-white/38">Apoio</div>
        <nav className="space-y-1">{secondary.map((item) => <NavItem key={item.label} item={item} />)}</nav>
        <div className="mt-auto border-t border-white/10 pt-4">{email && <p className="mb-3 truncate px-3 text-[11px] text-white/45">{email}</p>}<div className="grid grid-cols-2 gap-2"><Button asChild variant="ghost" className="h-10 justify-start rounded-xl text-xs text-white/65 hover:bg-white/10 hover:text-white"><Link to="/"><Eye className="mr-2 h-4 w-4" /> Site</Link></Button><Button variant="ghost" className="h-10 justify-start rounded-xl text-xs text-white/65 hover:bg-white/10 hover:text-white" onClick={() => signOutAdmin().then(() => navigate({ to: "/auth", replace: true }))}><LogOut className="mr-2 h-4 w-4" /> Sair</Button></div></div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 border-b border-[#eadfd8] bg-[#fffaf6]/94 backdrop-blur lg:hidden">
          <div className="flex h-16 items-center justify-between px-4"><Link to="/admin" className="flex items-center gap-2"><img src={logo} alt="LHL Festas" className="h-10 w-10 rounded-full object-cover" /><div><p className="font-serif text-lg leading-none text-[#651421]">LHL Festas</p><p className="text-[10px] text-[#8a7074]">Admin{previewReadOnly ? " • leitura" : ""}</p></div></Link><button onClick={() => setMobileOpen((v) => !v)} className="grid h-10 w-10 place-items-center rounded-xl border border-[#e8d8d1] bg-white" aria-label="Abrir menu">{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button></div>
          {mobileOpen && <div className="border-t border-[#eadfd8] bg-[#5b111d] p-3">{previewReadOnly && <div className="mb-3 rounded-xl bg-emerald-300/10 px-3 py-2 text-xs text-emerald-50">Dados reais conectados • alterações bloqueadas</div>}<nav className="grid gap-1 sm:grid-cols-2">{nav.map((item) => <NavItem key={item.label} item={item} />)}{secondary.map((item) => <NavItem key={item.label} item={item} />)}</nav><div className="mt-2 flex gap-2 border-t border-white/10 pt-3"><Button asChild variant="ghost" className="flex-1 text-white/70 hover:bg-white/10 hover:text-white"><Link to="/"><Eye className="mr-2 h-4 w-4" /> Ver site</Link></Button><Button variant="ghost" className="flex-1 text-white/70 hover:bg-white/10 hover:text-white" onClick={() => signOutAdmin().then(() => navigate({ to: "/auth", replace: true }))}><LogOut className="mr-2 h-4 w-4" /> Sair</Button></div></div>}
        </header>
        <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(216,121,130,.10),transparent_28%),#f8f5f1]"><SectionBoundary label="conteúdo desta página">{children}</SectionBoundary></main>
      </div>
    </div>
  );
}

export function priorityLevel(dataEventoISO: string): "green" | "yellow" | "red" | null {
  if (!dataEventoISO) return null;
  const evt = new Date(`${dataEventoISO}T00:00:00`);
  if (Number.isNaN(evt.getTime())) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.floor((evt.getTime() - today.getTime()) / 86400000);
  if (diff < 3) return "red";
  if (diff <= 10) return "yellow";
  return "green";
}

export type CalendarLevel = "green" | "red" | "yellow" | "orange" | "purple";

export function orderCalendarLevel(o: StoredOrder, todayISO: string, in7ISO: string, opAtual?: OrdemProducao | null): CalendarLevel {
  const d = o.details;
  if ((d?.caucaoDevolvida || "Não") === "Sim" || (d?.devolucaoConfirmada || "Não") === "Sim") return "green";
  if (opAtual) { const pend = pendenciasOperacionais(opAtual); if (pend.compras > 0 || pend.producao > 0) return "yellow"; if (opAtual.kitProntoConfirmadoEm) return "purple"; if (isAtrasada(opAtual, o)) return "red"; }
  if (countItensPendentes(d?.observacoesInternas) > 0) return "yellow";
  const baseData = toDateISO(d?.dataRetirada) || toDateISO(d?.dataEvento);
  if (baseData && baseData >= todayISO && baseData <= in7ISO) return "red";
  return "orange";
}

const DOT_CLASS: Record<CalendarLevel, string> = { green: "bg-emerald-500", red: "bg-red-500", yellow: "bg-yellow-400", orange: "bg-orange-500", purple: "bg-purple-500" };
const DOT_LABEL: Record<CalendarLevel, string> = { green: "Cliente Finalizado (caução devolvida)", yellow: "Cliente com Itens Pendentes", red: "Cliente da Semana", orange: "Cliente em Aberto", purple: "Kit Pronto" };

export function PriorityDot({ level }: { level: CalendarLevel | null }) { if (!level) return null; return <span className={`inline-block h-2.5 w-2.5 rounded-full ${DOT_CLASS[level] ?? "bg-muted"}`} title={DOT_LABEL[level] ?? ""} aria-label={DOT_LABEL[level] ?? ""} />; }

export function CalendarLegend() {
  const items: { level: CalendarLevel; label: string }[] = [{ level: "green", label: "Cliente Finalizado" },{ level: "yellow", label: "Cliente com Itens Pendentes" },{ level: "red", label: "Cliente da Semana" },{ level: "orange", label: "Cliente em Aberto" },{ level: "purple", label: "Kit Pronto" }];
  return <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">{items.map((it) => <span key={it.level} className="inline-flex items-center gap-1.5"><span className={`inline-block h-2.5 w-2.5 rounded-full ${DOT_CLASS[it.level]}`} />{it.label}</span>)}</div>;
}
