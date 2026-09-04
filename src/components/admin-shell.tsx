import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { conferenciaCompleta, type OrdemProducao, pendenciasOperacionais, isAtrasada } from "@/lib/producao-api";
import { Button } from "@/components/ui/button";
import { BarChart3, Eye, Home, FileText, Wallet, Package, DollarSign, Lock, Users, Factory, LogOut, ClipboardCheck, ShieldAlert } from "lucide-react";
import logo from "@/assets/lhl-logo.png";
import type { StoredOrder } from "@/lib/orders-storage";
import { countItensPendentes, isContratoAtivo } from "@/lib/orders-storage";
import { toDateISO } from "@/lib/date-utils";
import { signOutAdmin, useAdminSession } from "@/lib/auth-session";
import { SectionBoundary } from "@/components/section-boundary";


export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { email } = useAdminSession();

  const isCentral = pathname === "/admin" || pathname === "/admin/";
  const isContratos = pathname.startsWith("/admin/contratos");
  const isFinanceiro = pathname.startsWith("/admin/financeiro");
  const isGestao = pathname.startsWith("/admin/financeiro");
  const isPatrimonio = pathname.startsWith("/admin/patrimonio");
  const isExclusivos = pathname.startsWith("/admin/itens-exclusivos");
  const isLeads = pathname.startsWith("/admin/leads");
  const isHeavenLeads = pathname.startsWith("/admin/heaven-leads");
  const isProducao = pathname.startsWith("/admin/producao");
  const isSolicitacoes = pathname.startsWith("/admin/solicitacoes");
  const isGestaoBI = pathname.startsWith("/admin/gestao");



  const tabCls = (active: boolean) =>
    `px-4 py-2 rounded-full text-sm border transition-colors inline-flex items-center gap-2 ${
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-card text-muted-foreground border-border hover:text-primary"
    }`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/50 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link to="/admin" className="flex items-center gap-3">
            <img src={logo} alt="LHL Festas" className="w-12 sm:w-14" />
            <div className="hidden sm:block">
              <p className="font-serif text-xl text-primary leading-none">LHL Festas</p>
              <p className="text-xs text-muted-foreground mt-0.5">Central Operacional</p>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            {email && <span className="hidden md:inline text-xs text-muted-foreground mr-2">{email}</span>}
            <Button asChild variant="ghost" className="text-muted-foreground hover:text-primary">
              <Link to="/">
                <Eye className="h-4 w-4 mr-2" /> Visão do Cliente
              </Link>
            </Button>
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-primary"
              onClick={() => signOutAdmin().then(() => navigate({ to: "/auth", replace: true }))}
            >
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </div>

        </div>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-3 flex flex-wrap gap-2">
          <Link to="/admin" className={tabCls(isCentral)}>
            <Home className="h-4 w-4" /> Central de Operações
          </Link>
          <Link to="/admin/contratos" className={tabCls(isContratos)}>
            <FileText className="h-4 w-4" /> Contratos Recebidos
          </Link>
          <Link to="/admin/financeiro" search={{ tab: "dashboard" }} className={tabCls(isFinanceiro || isGestao)}>
            <Wallet className="h-4 w-4" /> Financeiro
          </Link>
          <Link to="/admin/gestao" className={tabCls(isGestaoBI)}>
            <BarChart3 className="h-4 w-4" /> Gestão
          </Link>

          <Link to="/admin/patrimonio" className={tabCls(isPatrimonio)}>
            <Package className="h-4 w-4" /> Patrimônio
          </Link>
          <Link to="/admin/itens-exclusivos" className={tabCls(isExclusivos)}>
            <Lock className="h-4 w-4" /> Itens Exclusivos
          </Link>
          <Link
            to="/admin/producao"
            search={{ filtro: "pendentes", etapa: "todas", q: "" }}
            className={tabCls(isProducao)}
          >
            <Factory className="h-4 w-4" /> Central de Produção
          </Link>
          <Link
            to="/admin/solicitacoes"
            search={{ status: "pendente", urgencia: "todas", q: "" }}
            className={tabCls(isSolicitacoes)}
          >
            <ClipboardCheck className="h-4 w-4" /> Central de Solicitações
          </Link>


        </div>
      </header>
      <SectionBoundary label="conteúdo desta página">{children}</SectionBoundary>
    </div>
  );
}

/** Cor/emoji de prioridade a partir da data do evento (uso em listas). */
export function priorityLevel(dataEventoISO: string): "green" | "yellow" | "red" | null {
  if (!dataEventoISO) return null;
  const evt = new Date(`${dataEventoISO}T00:00:00`);
  if (Number.isNaN(evt.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((evt.getTime() - today.getTime()) / 86400000);
  if (diff < 3) return "red";
  if (diff <= 10) return "yellow";
  return "green";
}

export type CalendarLevel = "green" | "red" | "yellow" | "orange" | "purple";

/**
 * Cor do contrato na Agenda / Calendário — nova regra:
 * 1. VERDE:    Finalizado (Caução Devolvida = Sim)
 * 2. AMARELO:  Ativo + possui Itens Pendentes (prioridade sobre Semana)
 * 3. VERMELHO: Ativo + evento entre hoje e os próximos 7 dias (sem pendências)
 * 4. LARANJA:  Demais contratos ativos
 */
export function orderCalendarLevel(
  o: StoredOrder,
  todayISO: string,
  in7ISO: string,
  opAtual?: OrdemProducao | null,
): CalendarLevel {
  const d = o.details;
  
  // 1. VERDE: Finalizado (Regra comercial)
  if ((d?.caucaoDevolvida || "Não") === "Sim" || (d?.devolucaoConfirmada || "Não") === "Sim") {
    return "green";
  }

  if (opAtual) {
    // 2. AMARELO: Possui itens pendentes de compra ou produção na OP
    const pend = pendenciasOperacionais(opAtual);
    if (pend.compras > 0 || pend.producao > 0) {
      return "yellow";
    }

    // 3. ROXO: Kit Pronto confirmado e sem pendências
    if (opAtual.kitProntoConfirmadoEm) {
      return "purple";
    }
    
    // Fallback: Atraso de produção vira vermelho (prioridade sobre data da semana se estiver atrasada)
    if (isAtrasada(opAtual, o)) return "red";
  }

  // 4. AMARELO: Observações internas (Contratos sem OP ou com pendências manuais)
  if (countItensPendentes(d?.observacoesInternas) > 0) return "yellow";
  
  // 5. VERMELHO: Cliente da Semana (Retirada/Festa próxima)
  const baseData = toDateISO(d?.dataRetirada) || toDateISO(d?.dataEvento);
  if (baseData && baseData >= todayISO && baseData <= in7ISO) {
    return "red";
  }

  // 6. LARANJA: Cliente em Aberto
  return "orange";
}

const DOT_CLASS: Record<CalendarLevel, string> = {
  green: "bg-emerald-500",
  red: "bg-red-500",
  yellow: "bg-yellow-400",
  orange: "bg-orange-500",
  purple: "bg-purple-500",
};
const DOT_LABEL: Record<CalendarLevel, string> = {
  green: "Cliente Finalizado (caução devolvida)",
  yellow: "Cliente com Itens Pendentes",
  red: "Cliente da Semana",
  orange: "Cliente em Aberto",
  purple: "Kit Pronto",
};

export function PriorityDot({ level }: { level: CalendarLevel | null }) {
  if (!level) return null;
  const cls = DOT_CLASS[level as CalendarLevel] ?? "bg-muted";
  const label = DOT_LABEL[level as CalendarLevel] ?? "";
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${cls}`}
      title={label}
      aria-label={label}
    />
  );
}

/** Legenda do calendário — Verde/Laranja/Vermelho/Amarelo. */
export function CalendarLegend() {
  const items: { level: CalendarLevel; label: string }[] = [
    { level: "green", label: "Cliente Finalizado" },
    { level: "yellow", label: "Cliente com Itens Pendentes" },
    { level: "red", label: "Cliente da Semana" },
    { level: "orange", label: "Cliente em Aberto" },
    { level: "purple", label: "Kit Pronto" },
  ];
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
      {items.map((it) => (
        <span key={it.level} className="inline-flex items-center gap-1.5">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${DOT_CLASS[it.level]}`} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
