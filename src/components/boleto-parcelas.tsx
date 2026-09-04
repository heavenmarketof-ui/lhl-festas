import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, FileText, Send, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { fmtBRL } from "@/lib/financeiro-api";
import { formatDateBR } from "@/lib/date-utils";
import {
  atualizarStatusParcela, gerarPlanoParcelas, listarParcelas,
  registrarPagamentoParcela, salvarParcelas, statusEfetivo, STATUS_LABEL,
  type Parcela, type ParcelaInput,
} from "@/lib/parcelas-api";

const cor = (s: string) => s === "pago" ? "bg-emerald-100 text-emerald-800" : s === "vencido" ? "bg-red-100 text-red-800" : s === "enviado" ? "bg-blue-100 text-blue-800" : s === "gerado" ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground";

export function BoletoParcelas({ contratoId, cliente, saldoPendente, dataEvento, onPagamentoRegistrado }: { contratoId: string; cliente: string; saldoPendente: number; dataEvento?: string; onPagamentoRegistrado?: () => void }) {
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [draft, setDraft] = useState<ParcelaInput[]>([]);
  const [qtd, setQtd] = useState(2);
  const [primeiro, setPrimeiro] = useState("");
  const [saving, setSaving] = useState(false);
  const [pagando, setPagando] = useState<string | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});

  async function carregar() {
    try {
      const ps = await listarParcelas(contratoId);
      setParcelas(ps);
      setDraft(ps.map((p) => ({ id: p.id, numero: p.numero, total: p.total, valor: p.valor, vencimento: p.vencimento, status: p.status, observacoes: p.observacoes })));
    } catch { toast.error("Não foi possível carregar os boletos."); }
  }
  useEffect(() => {
    if (saldoPendente <= 0.009) {
      setParcelas([]);
      setDraft([]);
      return;
    }
    // Dá prioridade ao carregamento do contrato e do financeiro principal.
    // A consulta de boletos começa logo depois, sem competir com a primeira pintura da tela.
    const timer = window.setTimeout(() => void carregar(), 250);
    return () => window.clearTimeout(timer);
  }, [contratoId, saldoPendente]);

  const total = useMemo(() => draft.reduce((s, p) => s + Number(p.valor || 0), 0), [draft]);
  const quitado = saldoPendente <= 0.009;

  function montar() {
    if (saldoPendente <= 0) return toast.info("Este contrato já está quitado.");
    try { setDraft(gerarPlanoParcelas({ quantidade: qtd, valorTotal: saldoPendente, primeiroVencimento: primeiro })); }
    catch (e: any) { toast.error(e?.message || "Confira os dados do parcelamento."); }
  }

  async function salvar() {
    if (!draft.length) return;
    setSaving(true);
    try {
      const ps = await salvarParcelas(contratoId, cliente, draft);
      setParcelas(ps);
      setDraft(ps.map((p) => ({ id: p.id, numero: p.numero, total: p.total, valor: p.valor, vencimento: p.vencimento, status: p.status, observacoes: p.observacoes })));
      toast.success("Plano de boletos salvo.");
    } catch (e: any) { toast.error(e?.message || "Falha ao salvar os boletos."); }
    finally { setSaving(false); }
  }

  async function status(p: Parcela, st: "gerado" | "enviado") {
    try { await atualizarStatusParcela(p.id, st); await carregar(); toast.success(st === "gerado" ? "Boleto marcado como gerado." : "Boleto marcado como enviado."); }
    catch (e: any) { toast.error(e?.message || "Falha ao atualizar boleto."); }
  }

  async function pagar(p: Parcela) {
    const valor = Number(String(valores[p.id] ?? p.valor).replace(",", "."));
    if (!(valor > 0)) return toast.error("Informe o valor recebido.");
    setPagando(p.id);
    try {
      await registrarPagamentoParcela({ parcela: p, contratoCliente: cliente, valorPago: valor });
      await carregar();
      toast.success("Pagamento registrado no boleto e no Fluxo de Caixa.");
      onPagamentoRegistrado?.();
    } catch (e: any) { toast.error(e?.message || "Falha ao registrar pagamento."); }
    finally { setPagando(null); }
  }

  return <section className="mt-6 rounded-2xl border border-border/70 bg-card p-4 sm:p-5 space-y-4">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div><div className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-primary"/><h3 className="font-serif text-xl text-primary">Boleto Parcelado</h3></div><p className="mt-1 text-xs text-muted-foreground">Controle dos boletos gerados manualmente no banco.</p></div>
      <Badge className={quitado ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}>{quitado ? "EVENTO LIBERADO" : "PAGAMENTO PENDENTE"}</Badge>
    </div>

    {!draft.length && <div className="grid gap-3 sm:grid-cols-3 rounded-xl border border-dashed p-4">
      <div><Label>Quantidade</Label><Input type="number" min={1} max={24} value={qtd} onChange={(e) => setQtd(Number(e.target.value))}/></div>
      <div><Label>Primeiro vencimento</Label><Input type="date" value={primeiro} onChange={(e) => setPrimeiro(e.target.value)}/></div>
      <div className="flex items-end"><Button type="button" className="w-full" onClick={montar}>Montar parcelamento</Button></div>
      <p className="sm:col-span-3 text-xs text-muted-foreground">Saldo a parcelar: <strong>{fmtBRL(saldoPendente)}</strong>{dataEvento ? ` · Evento: ${formatDateBR(dataEvento)}` : ""}</p>
    </div>}

    {!!draft.length && <>
      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Plano atual</span><strong>{fmtBRL(total)}</strong></div>
      <div className="grid gap-3">{draft.map((d, i) => {
        const p = parcelas.find((x) => x.numero === d.numero);
        const efetivo = p ? statusEfetivo(p) : "a_gerar";
        const pago = p?.status === "pago";
        return <div key={d.numero} className="rounded-xl border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><strong>Parcela {d.numero}/{d.total}</strong><Badge className={cor(efetivo)}>{STATUS_LABEL[efetivo]}</Badge></div>{p && !pago && <div className="flex gap-2">{p.status === "a_gerar" && <Button type="button" size="sm" variant="outline" onClick={() => status(p,"gerado")}><FileText className="mr-1 h-3.5 w-3.5"/>Gerado</Button>}{(p.status === "gerado" || efetivo === "vencido") && <Button type="button" size="sm" variant="outline" onClick={() => status(p,"enviado")}><Send className="mr-1 h-3.5 w-3.5"/>Enviado</Button>}</div>}</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2"><div><Label>Valor</Label><Input type="number" step="0.01" disabled={pago} value={d.valor} onChange={(e) => setDraft((a) => a.map((x,j) => j===i ? {...x,valor:Number(e.target.value)} : x))}/></div><div><Label>Vencimento</Label><Input type="date" disabled={pago} value={d.vencimento} onChange={(e) => setDraft((a) => a.map((x,j) => j===i ? {...x,vencimento:e.target.value} : x))}/></div></div>
          {p && !pago && <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end rounded-lg bg-muted/40 p-3"><div className="flex-1"><Label>Valor recebido</Label><Input type="number" step="0.01" value={valores[p.id] ?? String(p.valor)} onChange={(e) => setValores((v) => ({...v,[p.id]:e.target.value}))}/></div><Button type="button" onClick={() => pagar(p)} disabled={pagando===p.id}><CheckCircle2 className="mr-2 h-4 w-4"/>{pagando===p.id ? "Registrando..." : "Registrar pagamento"}</Button></div>}
        </div>;
      })}</div>
      <div className="flex justify-end"><Button type="button" onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Salvar plano de boletos"}</Button></div>
    </>}

    <div className={`rounded-xl border p-3 ${quitado ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}><p className={`text-xs font-semibold ${quitado ? "text-emerald-800" : "text-red-800"}`}>{quitado ? "🟢 PAGAMENTO QUITADO / EVENTO LIBERADO FINANCEIRAMENTE" : `🔴 PAGAMENTO PENDENTE / EVENTO NÃO LIBERADO FINANCEIRAMENTE — saldo ${fmtBRL(saldoPendente)}`}</p></div>
  </section>;
}
