// ============================================================================
// GESTÃO — COMPONENTES DE GRÁFICO (100% apresentação, sem escrita de dados)
// ============================================================================
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { fmtBRL } from "@/lib/financeiro-api";
import type { Rank, Serie } from "@/lib/gestao/aggregate";

export const PALETA = [
  "#b77984", "#c9a35c", "#7f9c8b", "#8f766d", "#d3a1aa",
  "#9a86a4", "#6f9a94", "#c98f68", "#7c7f86", "#a96572",
];

export const nf = new Intl.NumberFormat("pt-BR");
export const fmtNum = (v: number) => nf.format(Math.round(v));
export const fmtPerc = (v: number) => `${v.toFixed(1).replace(".", ",")}%`;
export const fmtMoedaCurta = (v: number) =>
  Math.abs(v) >= 1000 ? `R$ ${(v / 1000).toFixed(1).replace(".", ",")}k` : `R$ ${Math.round(v)}`;

export function Vazio({ msg }: { msg?: string }) {
  return (
    <div className="flex h-[180px] items-center justify-center rounded-lg border border-dashed border-border/70 px-4 text-center text-[11px] uppercase tracking-wide text-muted-foreground">
      {msg || "Dados insuficientes para este indicador."}
    </div>
  );
}

export function Painel({
  titulo, subtitulo, children, className,
}: { titulo: string; subtitulo?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-border/70 bg-card p-3 sm:p-4 ${className || ""}`}>
      <header className="mb-2">
        <h3 className="text-sm font-semibold text-foreground">{titulo}</h3>
        {subtitulo && <p className="text-[11px] text-muted-foreground">{subtitulo}</p>}
      </header>
      {children}
    </section>
  );
}

type SerieDef = { key: string; nome?: string; cor?: string; formato?: "moeda" | "numero" };

const temDado = (data: Serie[], series: SerieDef[]) =>
  data.length > 0 && data.some((d) => series.some((s) => Number(d[s.key] || 0) !== 0));

function tt(formato: "moeda" | "numero" | "percent") {
  return (v: any) =>
    formato === "moeda" ? fmtBRL(Number(v) || 0)
      : formato === "percent" ? fmtPerc(Number(v) || 0)
        : fmtNum(Number(v) || 0);
}

export function LinhaCard({
  titulo, subtitulo, data, series, formato = "moeda", altura = 220,
}: {
  titulo: string; subtitulo?: string; data: Serie[]; series: SerieDef[];
  formato?: "moeda" | "numero"; altura?: number;
}) {
  return (
    <Painel titulo={titulo} subtitulo={subtitulo}>
      {!temDado(data, series) ? <Vazio /> : (
        <div style={{ width: "100%", height: altura }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis
                tick={{ fontSize: 10 }} width={58}
                tickFormatter={(v) => (formato === "moeda" ? fmtMoedaCurta(Number(v)) : fmtNum(Number(v)))}
              />
              <Tooltip formatter={tt(formato)} labelStyle={{ fontSize: 12 }} contentStyle={{ fontSize: 12 }} />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {series.map((s, i) => (
                <Line
                  key={s.key} type="monotone" dataKey={s.key} name={s.nome || s.key}
                  stroke={s.cor || PALETA[i % PALETA.length]} strokeWidth={2}
                  dot={{ r: 2 }} isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Painel>
  );
}

export function BarrasCard({
  titulo, subtitulo, data, series, formato = "moeda", altura = 220, vertical = false,
}: {
  titulo: string; subtitulo?: string; data: Serie[]; series: SerieDef[];
  formato?: "moeda" | "numero"; altura?: number; vertical?: boolean;
}) {
  return (
    <Painel titulo={titulo} subtitulo={subtitulo}>
      {!temDado(data, series) ? <Vazio /> : (
        <div style={{ width: "100%", height: altura }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout={vertical ? "vertical" : "horizontal"}
              margin={{ top: 6, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              {/* Eixos como filhos diretos: o Recharts não enxerga eixos dentro de Fragment. */}
              {vertical && (
                <XAxis type="number" tick={{ fontSize: 10 }}
                  tickFormatter={(v) => (formato === "moeda" ? fmtMoedaCurta(Number(v)) : fmtNum(Number(v)))} />
              )}
              {vertical && (
                <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={120} />
              )}
              {!vertical && (
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={48} />
              )}
              {!vertical && (
                <YAxis tick={{ fontSize: 10 }} width={58}
                  tickFormatter={(v) => (formato === "moeda" ? fmtMoedaCurta(Number(v)) : fmtNum(Number(v)))} />
              )}

              <Tooltip formatter={tt(formato)} labelStyle={{ fontSize: 12 }} contentStyle={{ fontSize: 12 }} />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {series.map((s, i) => (
                <Bar key={s.key} dataKey={s.key} name={s.nome || s.key}
                  fill={s.cor || PALETA[i % PALETA.length]} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Painel>
  );
}

export function RankCard({
  titulo, subtitulo, itens, formato = "moeda", campo = "valor", altura = 240,
}: {
  titulo: string; subtitulo?: string; itens: Rank[];
  formato?: "moeda" | "numero"; campo?: "valor" | "qtd"; altura?: number;
}) {
  const data: Serie[] = itens
    .map((i) => ({ label: i.nome, Valor: campo === "qtd" ? (i.qtd ?? 0) : i.valor }))
    .filter((d) => Number(d.Valor) !== 0);
  return (
    <BarrasCard
      titulo={titulo} subtitulo={subtitulo} data={data} vertical
      series={[{ key: "Valor", nome: campo === "qtd" ? "Quantidade" : "Valor" }]}
      formato={campo === "qtd" ? "numero" : formato}
      altura={Math.max(altura, data.length * 26 + 40)}
    />
  );
}

export function DonutCard({
  titulo, subtitulo, itens, formato = "moeda", campo = "valor", altura = 240,
}: {
  titulo: string; subtitulo?: string; itens: Rank[];
  formato?: "moeda" | "numero"; campo?: "valor" | "qtd"; altura?: number;
}) {
  const data = itens
    .map((i) => ({ name: i.nome, value: campo === "qtd" ? (i.qtd ?? 0) : i.valor }))
    .filter((d) => d.value > 0);
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <Painel titulo={titulo} subtitulo={subtitulo}>
      {!data.length ? <Vazio /> : (
        <div style={{ width: "100%", height: altura }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="72%"
                paddingAngle={2} isAnimationActive={false}
              >
                {data.map((_, i) => <Cell key={i} fill={PALETA[i % PALETA.length]} />)}
              </Pie>
              <Tooltip
                formatter={(v: any, n: any) => [
                  `${formato === "moeda" ? fmtBRL(Number(v)) : fmtNum(Number(v))} (${fmtPerc(total ? (Number(v) / total) * 100 : 0)})`,
                  n,
                ]}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Painel>
  );
}

export function KpiCard({
  label, valor, formato, variacao, anterior, disponivel = true,
}: {
  label: string; valor: number; formato: "moeda" | "numero" | "percent";
  variacao?: number | null; anterior?: number; disponivel?: boolean;
}) {
  const txt = formato === "moeda" ? fmtBRL(valor) : formato === "percent" ? fmtPerc(valor) : fmtNum(valor);
  const up = (variacao ?? 0) >= 0;
  return (
    <div className="rounded-xl border border-border/70 bg-card p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground sm:text-xl">
        {disponivel ? txt : "—"}
      </p>
      {variacao != null ? (
        <p className={`mt-0.5 text-[11px] ${up ? "text-emerald-600" : "text-red-600"}`}>
          {up ? "▲" : "▼"} {fmtPerc(Math.abs(variacao))}
          <span className="text-muted-foreground"> vs. período anterior</span>
        </p>
      ) : (
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {anterior != null ? "sem base anterior" : "\u00A0"}
        </p>
      )}
    </div>
  );
}

export function TabelaRank({ titulo, itens, formato = "moeda" }: { titulo: string; itens: Rank[]; formato?: "moeda" | "numero" }) {
  return (
    <Painel titulo={titulo}>
      {!itens.length ? <Vazio /> : (
        <ol className="space-y-1.5">
          {itens.map((i, idx) => (
            <li key={i.nome + idx} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                <span className="mr-1.5 text-[11px] text-muted-foreground/70">{idx + 1}.</span>{i.nome}
              </span>
              <span className="shrink-0 font-medium">
                {formato === "moeda" ? fmtBRL(i.valor) : fmtNum(i.qtd ?? i.valor)}
                {formato === "moeda" && i.qtd != null && (
                  <span className="ml-1 text-[11px] font-normal text-muted-foreground">({i.qtd})</span>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Painel>
  );
}
