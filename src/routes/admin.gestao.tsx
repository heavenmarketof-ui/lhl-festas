// ============================================================================
// GESTÃO — CENTRAL DE BUSINESS INTELLIGENCE (100% READ-ONLY)
// Nenhuma mutation é importada ou chamada nesta tela.
// Um único snapshot alimenta todas as abas e o relatório PDF.
// ============================================================================
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3, ChevronLeft, ChevronRight, FileDown, Loader2, RefreshCw,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { fmtBRL } from "@/lib/financeiro-api";
import { fetchOrdersFromSheet } from "@/lib/sheets-api";
import { fetchLancamentos } from "@/lib/financeiro-api";
import { fetchOrdens } from "@/lib/producao-api";
import {
  buildPeriodo, cursorAtual, moveCursor,
  type PeriodoCursor, type PeriodoTipo,
} from "@/lib/gestao/periodo";
import {
  getGestaoData, type GestaoData, type ModalidadeResumo, type Serie, type Snapshot,
} from "@/lib/gestao/aggregate";
import {
  BarrasCard, DonutCard, KpiCard, LinhaCard, Painel, RankCard, TabelaRank, Vazio,
  fmtNum, fmtPerc,
} from "@/components/gestao/charts";
import { GestaoPdfReport } from "@/components/gestao/pdf-report";
import { exportPagesToPdf } from "@/lib/gestao/pdf";

export const Route = createFileRoute("/admin/gestao")({
  component: GestaoPage,
  head: () => ({
    meta: [
      { title: "Gestão — Inteligência de Negócio | LHL Festas" },
      {
        name: "description",
        content:
          "Central analítica da LHL Festas: vendas, financeiro, modalidades, clientes e operação por período.",
      },
      { property: "og:title", content: "Gestão — Inteligência de Negócio | LHL Festas" },
      {
        property: "og:description",
        content: "Painel de indicadores e relatórios em PDF da LHL Festas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const ABAS = [
  "Visão Geral", "Vendas", "Financeiro", "Modalidades", "Clientes", "Operação",
] as const;
type Aba = (typeof ABAS)[number];

const TIPOS: { v: PeriodoTipo; label: string }[] = [
  { v: "mensal", label: "Mensal" },
  { v: "trimestral", label: "Trimestral" },
  { v: "semestral", label: "Semestral" },
  { v: "anual", label: "Anual" },
  { v: "personalizado", label: "Personalizado" },
];

const slugArquivo = (slug: string) =>
  `LHL-Festas-Relatorio-Gestao-${slug}.pdf`;

function GestaoPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [cursor, setCursor] = useState<PeriodoCursor>(() => cursorAtual());
  const [aba, setAba] = useState<Aba>("Visão Geral");
  const [gerando, setGerando] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const carregar = useCallback(async (force = false) => {
    setLoading(true);
    setErro(null);
    try {
      // Um único snapshot coerente por carregamento (3 leituras, sem escrita).
      const [orders, lancamentos, ops] = await Promise.all([
        fetchOrdersFromSheet(force ? { force: true } : undefined),
        fetchLancamentos(force ? { force: true } : undefined),
        fetchOrdens(),
      ]);
      setSnapshot({ orders, lancamentos, ops, geradoEm: new Date().toISOString() });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar os dados de gestão.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const periodo = useMemo(() => buildPeriodo(cursor), [cursor]);

  // Troca de aba NÃO refaz fetch; troca de período só recalcula em memória.
  const data: GestaoData | null = useMemo(
    () => (snapshot ? getGestaoData(snapshot, cursor) : null),
    [snapshot, cursor],
  );

  const semDados = !!data && data.resumo.pedidos.length === 0
    && data.resumo.recebido === 0 && data.resumo.saidas === 0;

  async function gerarPdf() {
    if (!data || gerando || loading) return;
    setGerando(true);
    try {
      const el = pdfRef.current;
      if (!el) throw new Error("Relatório indisponível.");
      await exportPagesToPdf(el, slugArquivo(periodo.slug));
      toast.success("Relatório PDF gerado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar o PDF.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <AdminShell>
      <main className="mx-auto max-w-6xl px-3 pb-16 pt-4 sm:px-6">
        <header className="mb-4">
          <h1 className="flex items-center gap-2 font-serif text-2xl text-primary sm:text-3xl">
            <BarChart3 className="h-6 w-6" /> Gestão
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Inteligência de negócio — somente leitura. Nada nesta tela altera dados.
          </p>
        </header>

        {/* ---------------- Filtro global de período ---------------- */}
        <section className="sticky top-0 z-20 -mx-3 mb-4 border-b border-border/60 bg-background/95 px-3 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Período:</span>
              <Select
                value={cursor.tipo}
                onValueChange={(v) => setCursor((c) => ({ ...c, tipo: v as PeriodoTipo }))}
              >
                <SelectTrigger className="h-10 w-[150px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="icon" className="h-10 w-10 shrink-0"
                aria-label="Período anterior"
                onClick={() => setCursor((c) => moveCursor(c, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0 flex-1 rounded-lg border border-border/70 bg-card px-3 py-2 text-center">
                <p className="truncate text-sm font-medium">{periodo.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {periodo.inicio.split("-").reverse().join("/")} a {periodo.fim.split("-").reverse().join("/")}
                </p>
              </div>
              <Button
                variant="outline" size="icon" className="h-10 w-10 shrink-0"
                aria-label="Próximo período"
                onClick={() => setCursor((c) => moveCursor(c, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary" className="h-10 shrink-0 text-xs"
                onClick={() => setCursor((c) => ({ ...cursorAtual(), tipo: c.tipo }))}
              >
                Hoje
              </Button>
            </div>
          </div>

          {cursor.tipo === "personalizado" && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="text-[11px] text-muted-foreground">
                Início
                <Input
                  type="date" className="mt-1 h-10"
                  value={cursor.inicio}
                  onChange={(e) => setCursor((c) => ({ ...c, inicio: e.target.value }))}
                />
              </label>
              <label className="text-[11px] text-muted-foreground">
                Fim
                <Input
                  type="date" className="mt-1 h-10"
                  value={cursor.fim}
                  onChange={(e) => setCursor((c) => ({ ...c, fim: e.target.value }))}
                />
              </label>
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              className="h-10 flex-1 text-xs sm:flex-none"
              disabled={!data || loading || gerando}
              onClick={() => void gerarPdf()}
            >
              {gerando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
              {gerando ? "Gerando relatório..." : "Gerar Relatório PDF"}
            </Button>
            <Button
              variant="outline" className="h-10 text-xs"
              disabled={loading} onClick={() => void carregar(true)}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          </div>
        </section>

        {/* ---------------- Abas ---------------- */}
        <nav className="-mx-3 mb-4 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
          <div className="flex w-max gap-2">
            {ABAS.map((a) => (
              <button
                key={a}
                onClick={() => setAba(a)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs transition-colors ${
                  aba === a
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-primary"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </nav>

        {/* ---------------- Estados de UI ---------------- */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando indicadores...
          </div>
        )}

        {!loading && erro && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive">{erro}</p>
            <Button variant="outline" className="mt-3" onClick={() => void carregar(true)}>
              Tentar novamente
            </Button>
          </div>
        )}

        {!loading && !erro && data && (
          <>
            {semDados && (
              <div className="mb-4 rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
                Nenhum movimento registrado em {periodo.label}.
              </div>
            )}

            {aba === "Visão Geral" && <VisaoGeral d={data} />}
            {aba === "Vendas" && <Vendas d={data} />}
            {aba === "Financeiro" && <Financeiro d={data} />}
            {aba === "Modalidades" && <Modalidades d={data} />}
            {aba === "Clientes" && <Clientes d={data} />}
            {aba === "Operação" && <Operacao d={data} />}
          </>
        )}
      </main>

      {/* Layout A4 fora da tela — mesmo dataset, capturado página por página. */}
      {data && (
        <div aria-hidden style={{ position: "fixed", left: -10000, top: 0, zIndex: -1 }}>
          <div ref={pdfRef}>
            <GestaoPdfReport data={data} />
          </div>
        </div>
      )}
    </AdminShell>
  );
}

/* ================================ Abas ================================ */

const Grid = ({ children, cols = 2 }: { children: React.ReactNode; cols?: 2 | 3 }) => (
  <div className={`grid grid-cols-2 gap-2 sm:gap-3 ${cols === 3 ? "lg:grid-cols-4" : "sm:grid-cols-4"}`}>
    {children}
  </div>
);

const Blocos = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{children}</div>
);

function Kpis({ d }: { d: GestaoData }) {
  return (
    <Grid>
      {d.kpis.map((k) => (
        <KpiCard
          key={k.label} label={k.label} valor={k.valor} formato={k.formato}
          variacao={k.variacao} anterior={k.anterior} disponivel={k.disponivel}
        />
      ))}
    </Grid>
  );
}

function Destaques({ d }: { d: GestaoData }) {
  return (
    <Painel titulo="Destaques do período">
      {!d.destaques.length ? <Vazio /> : (
        <ul className="space-y-1.5">
          {d.destaques.map((x) => (
            <li key={x.titulo} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{x.titulo}</span>
              <span className="shrink-0 font-medium">{x.valor}</span>
            </li>
          ))}
        </ul>
      )}
    </Painel>
  );
}

function carteiraSeries(d: GestaoData): { valores: Serie[]; pedidos: Serie[] } {
  return {
    valores: d.carteiraFutura.map((c) => ({
      label: c.mes, Vendido: c.vendido, Recebido: c.recebido, "A receber": c.aReceber,
    })),
    pedidos: d.carteiraFutura.map((c) => ({ label: c.mes, Pedidos: c.pedidos })),
  };
}

function VisaoGeral({ d }: { d: GestaoData }) {
  const cart = carteiraSeries(d);
  return (
    <div className="space-y-3">
      <Kpis d={d} />
      <LinhaCard
        titulo="Evolução do faturamento" subtitulo="Faturado × Recebido"
        data={d.evolucao} series={[{ key: "Faturado" }, { key: "Recebido" }]}
      />
      <Blocos>
        <BarrasCard
          titulo="Faturamento entregue por modalidade"
          data={d.modalidades.map((m) => ({ label: m.nome, Faturamento: m.faturamento }))}
          series={[{ key: "Faturamento" }]}
        />
        <DonutCard titulo="Participação por modalidade" itens={d.participacao} />
      </Blocos>
      <Blocos>
        <TabelaRank titulo="Temas com maior faturamento" itens={d.temasValor} />
        <TabelaRank titulo="Clientes com maior faturamento" itens={d.clientes.topPorFaturamento} />
      </Blocos>
      <Blocos>
        <BarrasCard
          titulo="Carteira futura (mês do evento)" data={cart.valores}
          series={[{ key: "Vendido" }, { key: "Recebido" }, { key: "A receber" }]}
        />
        <Painel titulo="Operação no período">
          <div className="grid grid-cols-2 gap-2">
            {([
              ["Compras realizadas", fmtNum(d.operacao.comprasRealizadas)],
              ["Valor em compras", fmtBRL(d.operacao.valorCompras)],
              ["Itens produzidos", fmtNum(d.operacao.itensProduzidos)],
              ["Kits concluídos", fmtNum(d.operacao.kitsProntos)],
              ["Eventos realizados", fmtNum(d.operacao.eventosRealizados)],
              ["Clientes únicos", fmtNum(d.clientes.unicos)],
            ] as [string, string][]).map(([l, v]) => (
              <div key={l} className="rounded-lg border border-border/70 p-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{l}</p>
                <p className="text-sm font-semibold">{v}</p>
              </div>
            ))}
          </div>
        </Painel>
      </Blocos>
      <Destaques d={d} />
    </div>
  );
}

function Vendas({ d }: { d: GestaoData }) {
  return (
    <div className="space-y-3">
      <Grid>
        {d.kpis
          .filter((k) => ["Pedidos", "Faturamento", "Ticket médio", "Clientes"].includes(k.label))
          .map((k) => (
            <KpiCard
              key={k.label} label={k.label} valor={k.valor} formato={k.formato}
              variacao={k.variacao} anterior={k.anterior}
            />
          ))}
      </Grid>
      <Painel titulo="Comparação com o período anterior" subtitulo={d.periodoAnterior.label}>
        {!d.comparativo.length ? <Vazio /> : (
          <ul className="space-y-1.5 text-sm">
            {d.comparativo.map((c) => (
              <li key={c.label} className="flex items-baseline justify-between gap-2">
                <span className="text-muted-foreground">{c.label}</span>
                <span className="shrink-0">
                  <span className="font-medium">
                    {c.formato === "moeda" ? fmtBRL(c.atual) : fmtNum(c.atual)}
                  </span>
                  <span className="ml-2 text-[11px] text-muted-foreground">
                    ({c.formato === "moeda" ? fmtBRL(c.anterior) : fmtNum(c.anterior)})
                  </span>
                  <span className={`ml-2 text-[11px] ${(c.variacao ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {c.variacao == null ? "—" : `${c.variacao >= 0 ? "▲" : "▼"} ${fmtPerc(Math.abs(c.variacao))}`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Painel>
      <Blocos>
        <LinhaCard titulo="Evolução dos pedidos" formato="numero" data={d.evolucao} series={[{ key: "Pedidos" }]} />
        <LinhaCard titulo="Evolução do ticket médio" data={d.evolucao} series={[{ key: "Ticket", nome: "Ticket médio" }]} />
      </Blocos>
      <Blocos>
        <RankCard titulo="Temas mais contratados" itens={d.temasQtd} campo="qtd" />
        <RankCard titulo="Faturamento entregue por tema" itens={d.temasValor} />
      </Blocos>
      <Blocos>
        <RankCard titulo="Kits mais vendidos" itens={d.kitsQtd} campo="qtd" />
        <RankCard titulo="Faturamento por kit" itens={d.kitsValor} />
      </Blocos>
      <Blocos>
        <BarrasCard
          titulo="Pedidos por modalidade" formato="numero"
          data={d.modalidades.map((m) => ({ label: m.nome, Pedidos: m.pedidos }))}
          series={[{ key: "Pedidos" }]}
        />
        <BarrasCard titulo="Faturamento por mês do evento" data={d.sazonalidade.porMes} series={[{ key: "Faturamento" }]} />
      </Blocos>
      <Blocos>
        <BarrasCard titulo="Festas por dia da semana" formato="numero" data={d.sazonalidade.porDiaSemana} series={[{ key: "Festas" }]} />
        <Painel titulo="Antecedência das reservas">
          <p className="mb-2 text-sm">
            Média:{" "}
            <strong>
              {d.sazonalidade.antecedenciaMedia == null
                ? "Dados insuficientes para este indicador"
                : `${d.sazonalidade.antecedenciaMedia} dias`}
            </strong>
          </p>
          {!d.sazonalidade.distribuicaoAntecedencia.length ? <Vazio /> : (
            <ul className="space-y-1 text-sm">
              {d.sazonalidade.distribuicaoAntecedencia.map((f) => (
                <li key={f.nome} className="flex justify-between">
                  <span className="text-muted-foreground">{f.nome}</span>
                  <span className="font-medium">{fmtNum(f.qtd ?? f.valor)}</span>
                </li>
              ))}
            </ul>
          )}
        </Painel>
      </Blocos>
    </div>
  );
}

function Financeiro({ d }: { d: GestaoData }) {
  const cart = carteiraSeries(d);
  return (
    <div className="space-y-3">
      <Grid>
        <KpiCard label="Entradas no período" valor={d.resumo.recebido} formato="moeda" />
        <KpiCard label="Saídas no período" valor={d.resumo.saidas} formato="moeda" />
        <KpiCard label="Resultado no período" valor={d.resumo.resultadoCaixa} formato="moeda" />
        <KpiCard label="A receber no período" valor={d.resumo.aReceber} formato="moeda" />
      </Grid>
      <Grid>
        <KpiCard label="Faturamento entregue" valor={d.resumo.faturamento} formato="moeda" />
        <KpiCard label="Lucro estimado apurado" valor={d.financeiro.lucroEstimado} formato="moeda" />
        <KpiCard label="Margem estimada apurada" valor={d.financeiro.margemLucroPercentual} formato="percent" />
        <KpiCard label="Saldo total de clientes" valor={d.resumo.saldoTotalClientes} formato="moeda" />
      </Grid>
      <Grid>
        <KpiCard label="Caução recebida" valor={d.resumo.caucaoRecebida} formato="moeda" />
        <KpiCard label="Caução devolvida" valor={d.resumo.caucaoDevolvida} formato="moeda" />
      </Grid>
      <p className="text-[11px] text-muted-foreground">
        O lucro só é apurado quando existe compra/custo vinculado ao contrato. Festas sem custo vinculado aparecem como “Ainda não apurado”. Nesta primeira
        fase, ainda não entram montagem, transporte, balões, impressão, taxas ou outros custos indiretos.
        Entradas e saídas continuam sendo movimentações reais de caixa e caução não é faturamento.
      </p>
      <Blocos>
        <BarrasCard titulo="Entradas × Saídas" data={d.entradasSaidas} series={[{ key: "Entradas" }, { key: "Saídas" }]} />
        <LinhaCard titulo="Evolução do resultado de caixa" data={d.financeiro.resultadoEvolucao} series={[{ key: "Resultado" }]} />
      </Blocos>
      <Blocos>
        <BarrasCard titulo="Recebido × A receber" data={d.recebidoAReceber} series={[{ key: "Recebido" }, { key: "A receber" }]} />
        <DonutCard titulo="Composição das saídas" itens={d.financeiro.saidasPorCategoria} />
      </Blocos>
      <Blocos>
        {d.financeiro.comprasDisponivel ? (
          <BarrasCard
            titulo="Compras: previsto × real"
            data={[{ label: d.periodo.label, Previsto: d.financeiro.comprasPrevisto, Real: d.financeiro.comprasReal }]}
            series={[{ key: "Previsto" }, { key: "Real" }]}
          />
        ) : (
          <Painel titulo="Compras: previsto × real"><Vazio /></Painel>
        )}
        <Painel titulo="Compras e custos">
          <div className="grid grid-cols-2 gap-2">
            {([
              ["Economia / Estouro", d.financeiro.comprasDisponivel ? fmtBRL(d.financeiro.economia) : "Dados insuficientes para este indicador"],
              ["Custos diretos vinculados", d.financeiro.margemDisponivel ? fmtBRL(d.financeiro.custosDiretos) : "Dados insuficientes para este indicador"],
            ] as [string, string][]).map(([l, v]) => (
              <div key={l} className="rounded-lg border border-border/70 p-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{l}</p>
                <p className="text-sm font-semibold">{v}</p>
              </div>
            ))}
          </div>
        </Painel>
      </Blocos>
      <Painel titulo="Lucro estimado por venda" subtitulo="Valor vendido menos compras registradas naquele contrato">
        {!d.financeiro.lucroPorVenda.length ? <Vazio /> : (
          <div className="space-y-2">
            {d.financeiro.lucroPorVenda.map((v) => (
              <div key={v.contratoId} className="rounded-lg border border-border/70 p-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{v.cliente}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {v.tema} · {v.modalidade}{v.dataEvento ? " · " + v.dataEvento.split("-").reverse().join("/") : ""}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] uppercase text-muted-foreground">Lucro estimado</p>
                    <p className="text-base font-bold text-emerald-700">{v.apurado ? fmtBRL(v.lucroEstimado) : "Ainda não apurado"}</p>
                    <p className="text-[11px] text-muted-foreground">{v.apurado ? `Margem ${fmtPerc(v.margemPercentual)}` : "Nenhuma compra/custo vinculado"}</p>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div className="rounded-md bg-muted/40 p-2">
                    <p className="text-[9px] uppercase text-muted-foreground">Vendido</p>
                    <p className="text-xs font-semibold">{fmtBRL(v.valorVendido)}</p>
                  </div>
                  <div className="rounded-md bg-muted/40 p-2">
                    <p className="text-[9px] uppercase text-muted-foreground">Compras</p>
                    <p className="text-xs font-semibold">{fmtBRL(v.compras)}</p>
                  </div>
                  <div className="rounded-md bg-muted/40 p-2 col-span-2 sm:col-span-1">
                    <p className="text-[9px] uppercase text-muted-foreground">Lucro</p>
                    <p className="text-xs font-semibold">{v.apurado ? fmtBRL(v.lucroEstimado) : "Não apurado"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Painel>
      <Blocos>
        <BarrasCard
          titulo="Carteira futura — vendido × recebido × a receber" data={cart.valores}
          series={[{ key: "Vendido" }, { key: "Recebido" }, { key: "A receber" }]}
        />
        <BarrasCard titulo="Pedidos por mês do evento" formato="numero" data={cart.pedidos} series={[{ key: "Pedidos" }]} />
      </Blocos>
    </div>
  );
}

function ModalidadeBloco({ m, ticketGeral }: { m: ModalidadeResumo; ticketGeral: number }) {
  return (
    <Painel titulo={m.nome} subtitulo={`${fmtPerc(m.percFaturamento)} do faturamento do período`}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {([
          ["Pedidos", fmtNum(m.pedidos)],
          ["Faturamento", fmtBRL(m.faturamento)],
          ["Ticket médio", fmtBRL(m.ticket)],
          ["Clientes", fmtNum(m.clientes)],
          ["% dos pedidos", fmtPerc(m.percPedidos)],
          ["Ticket geral", fmtBRL(ticketGeral)],
        ] as [string, string][]).map(([l, v]) => (
          <div key={l} className="rounded-lg border border-border/70 p-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{l}</p>
            <p className="text-sm font-semibold">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-3">
        <LinhaCard
          titulo="Tendência" subtitulo="Faturamento × Ticket médio" data={m.evolucao}
          series={[{ key: "Faturamento" }, { key: "Ticket", nome: "Ticket médio" }]} altura={190}
        />
        <TabelaRank titulo="Kits mais vendidos" itens={m.kits} formato="numero" />
        <TabelaRank titulo="Faturamento por kit" itens={m.faturamentoPorKit} />
        <div className="rounded-lg border border-border/70 p-2 text-xs text-muted-foreground">
          Lucro estimado da modalidade:{" "}
          <strong className="text-foreground">
            {m.margem == null ? "Dados insuficientes para este indicador" : fmtBRL(m.margem)}
          </strong>
        </div>
      </div>
    </Painel>
  );
}

function Modalidades({ d }: { d: GestaoData }) {
  if (!d.modalidades.length) {
    return <Painel titulo="Modalidades"><Vazio /></Painel>;
  }
  return (
    <div className="space-y-3">
      <Blocos>
        <BarrasCard
          titulo="Faturamento entregue por modalidade"
          data={d.modalidades.map((m) => ({ label: m.nome, Faturamento: m.faturamento }))}
          series={[{ key: "Faturamento" }]}
        />
        <BarrasCard
          titulo="Ticket médio por modalidade"
          data={d.modalidades.map((m) => ({ label: m.nome, Ticket: m.ticket }))}
          series={[{ key: "Ticket", nome: "Ticket médio" }]}
        />
      </Blocos>
      <DonutCard titulo="Participação do faturamento" itens={d.participacao} />
      {d.modalidades.map((m) => (
        <ModalidadeBloco key={m.nome} m={m} ticketGeral={d.resumo.ticket} />
      ))}
    </div>
  );
}

function Clientes({ d }: { d: GestaoData }) {
  const c = d.clientes;
  return (
    <div className="space-y-3">
      <Grid>
        <KpiCard label="Clientes únicos" valor={c.unicos} formato="numero" />
        <KpiCard label="Novos clientes" valor={c.novos} formato="numero" disponivel={c.identificavel} />
        <KpiCard label="Recorrentes" valor={c.recorrentes} formato="numero" disponivel={c.identificavel} />
        <KpiCard
          label="Taxa de recorrência" valor={c.taxaRecorrencia ?? 0} formato="percent"
          disponivel={c.taxaRecorrencia != null}
        />
      </Grid>
      {!c.identificavel && (
        <p className="text-[11px] text-muted-foreground">
          Dados insuficientes para este indicador: os contratos do período não possuem identificador
          confiável (CPF, telefone ou e-mail) para apurar recorrência.
        </p>
      )}
      <BarrasCard titulo="Novos × Recorrentes" formato="numero" data={c.evolucao} series={[{ key: "Novos" }, { key: "Recorrentes" }]} />
      <Blocos>
        <TabelaRank titulo="Clientes com mais contratos" itens={c.topPorContratos} formato="numero" />
        <TabelaRank titulo="Clientes com maior faturamento" itens={c.topPorFaturamento} />
      </Blocos>
      <Painel titulo="Origem dos clientes">
        {c.origemDisponivel ? (
          <DonutCard titulo="" itens={c.origem} campo="qtd" formato="numero" />
        ) : <Vazio />}
      </Painel>
    </div>
  );
}

function Operacao({ d }: { d: GestaoData }) {
  const o = d.operacao;
  return (
    <div className="space-y-3">
      <Grid>
        <KpiCard label="Compras realizadas" valor={o.comprasRealizadas} formato="numero" />
        <KpiCard label="Valor em compras" valor={o.valorCompras} formato="moeda" />
        <KpiCard label="Itens produzidos" valor={o.itensProduzidos} formato="numero" />
        <KpiCard label="Kits concluídos" valor={o.kitsProntos} formato="numero" />
      </Grid>
      <Grid>
        <KpiCard label="Eventos realizados" valor={o.eventosRealizados} formato="numero" />
        <KpiCard
          label="Cancelamentos" valor={d.sazonalidade.cancelamentos.qtd} formato="numero"
          disponivel={d.sazonalidade.cancelamentos.disponivel}
        />
        <KpiCard
          label="Taxa de cancelamento" valor={d.sazonalidade.cancelamentos.taxa} formato="percent"
          disponivel={d.sazonalidade.cancelamentos.disponivel}
        />
        <KpiCard
          label="Antecedência média (dias)" valor={d.sazonalidade.antecedenciaMedia ?? 0} formato="numero"
          disponivel={d.sazonalidade.antecedenciaMedia != null}
        />
      </Grid>
      <BarrasCard titulo="Volume operacional" formato="numero" data={o.volume}
        series={[{ key: "Compras" }, { key: "Produzidos" }, { key: "Eventos" }]} />
      <Blocos>
        <RankCard titulo="Itens mais comprados" itens={o.itensMaisComprados} campo="qtd" />
        <RankCard titulo="Materiais com maior gasto" itens={o.gastoPorMaterial} />
      </Blocos>
      <Blocos>
        <TabelaRank titulo="Itens mais produzidos" itens={o.itensMaisProduzidos} formato="numero" />
        <Painel titulo="Reservas de última hora">
          {!d.sazonalidade.ultimaHora.length ? <Vazio /> : (
            <ul className="space-y-1 text-sm">
              {d.sazonalidade.ultimaHora.map((u) => (
                <li key={u.faixa} className="flex justify-between">
                  <span className="text-muted-foreground">{u.faixa}</span>
                  <span className="font-medium">{fmtNum(u.qtd)} ({fmtPerc(u.perc)})</span>
                </li>
              ))}
            </ul>
          )}
        </Painel>
      </Blocos>
    </div>
  );
}
