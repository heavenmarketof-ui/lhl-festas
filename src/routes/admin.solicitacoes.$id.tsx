import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { MoneyInput } from "@/components/money-input";

import {
  ArrowLeft, Check, X, Ban, Pencil, Loader2, History, ExternalLink, AlertTriangle, Banknote,
} from "lucide-react";
import {
  fmtBRL, CONTAS_PADRAO, FORMAS_PAGAMENTO, CATEGORIAS_DESPESA_PADRAO,
} from "@/lib/financeiro-api";
import {
  fetchSolicitacao, fetchEventos, autorizarSolicitacao, recusarSolicitacao,
  cancelarSolicitacao, editarSolicitacao, registrarPagamentoSolicitacao,
} from "@/lib/solicitacoes-api";
import {
  STATUS_LABEL, STATUS_EMOJI, STATUS_CLASS, TIPO_LABEL, ORIGEM_LABEL,
  podeAutorizar, podeEditar, podeRecusar, podeCancelar, podeRegistrarPagamento,
  fmtDataBR, fmtDataHoraBR,
  type Solicitacao, type SolicitacaoEvento,
} from "@/lib/solicitacoes-types";

export const Route = createFileRoute("/admin/solicitacoes/$id")({
  head: () => ({ meta: [{ title: "Solicitação Financeira — LHL Festas" }] }),
  component: SolicitacaoDetalhe,
  errorComponent: ({ error }) => (
    <AdminShell>
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6">
          <h1 className="font-serif text-xl text-primary">Não foi possível abrir a solicitação</h1>
          <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
          <Button className="mt-4" asChild><Link to="/admin/solicitacoes" search={{ status: "pendente", urgencia: "todas", q: "" }}>Voltar</Link></Button>
        </div>
      </main>
    </AdminShell>
  ),
});

const selectCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

function Linha({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="w-48 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm flex-1">{children}</span>
    </div>
  );
}

function SolicitacaoDetalhe() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [s, setS] = useState<Solicitacao | null>(null);
  const [eventos, setEventos] = useState<SolicitacaoEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  const [confirmar, setConfirmar] = useState(false);
  const [pagarAberto, setPagarAberto] = useState(false);
  const [valorRealPago, setValorRealPago] = useState<number>(0);

  const [recusaAberta, setRecusaAberta] = useState(false);
  const [cancelAberta, setCancelAberta] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [editando, setEditando] = useState(false);

  const load = useCallback(async () => {
    try {
      const [row, evs] = await Promise.all([fetchSolicitacao(id), fetchEventos(id)]);
      setS(row);
      setEventos(evs);
      setErro("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar a solicitação.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (pagarAberto && s) {
      setValorRealPago(s.valor || 0);
    }
  }, [pagarAberto, s]);


  const acao = async (fn: () => Promise<unknown>, ok: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      setConfirmar(false);
      setPagarAberto(false);
      setRecusaAberta(false);
      setCancelAberta(false);
      setMotivo("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao executar a ação.");
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <AdminShell>
        <main className="mx-auto max-w-4xl px-4 py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Carregando solicitação...
        </main>
      </AdminShell>
    );
  }

  if (!s) {
    return (
      <AdminShell>
        <main className="mx-auto max-w-4xl px-4 py-10 space-y-4">
          <p className="text-muted-foreground">{erro || "Solicitação não encontrada."}</p>
          <Button asChild variant="outline"><Link to="/admin/solicitacoes" search={{ status: "pendente", urgencia: "todas", q: "" }}>Voltar</Link></Button>
        </main>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => navigate({ to: "/admin/solicitacoes", search: { status: "pendente", urgencia: "todas", q: "" } })}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm ${STATUS_CLASS[s.status]}`}>
            {STATUS_EMOJI[s.status]} {STATUS_LABEL[s.status]}
          </span>
        </div>

        {erro && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {erro}
          </div>
        )}

        <section className="rounded-xl border border-border bg-card p-5">
          <h1 className="font-serif text-xl text-primary">{s.descricao || "Solicitação financeira"}</h1>
          <p className="text-2xl font-semibold text-primary mt-1">{fmtBRL(s.valor)}</p>

          <div className="mt-4">
            <Linha label="Origem">{ORIGEM_LABEL[s.origem]}</Linha>
            <Linha label="Tipo">{TIPO_LABEL[s.tipo]}</Linha>
            <Linha label="Pedido">
              {s.pedidoId ? (
                <Link to="/admin/$id" params={{ id: s.pedidoId }} className="text-primary underline">
                  {s.pedidoCliente || s.pedidoId}
                </Link>
              ) : "—"}
            </Linha>
            <Linha label="Cliente">{s.pedidoCliente || "—"}</Linha>
            <Linha label="Ordem de Produção">
              {s.ordemProducao && s.pedidoId ? (
                <Link to="/admin/producao/$id" params={{ id: s.pedidoId }} className="text-primary underline">
                  {s.ordemProducao}
                </Link>
              ) : (s.ordemProducao || "—")}
            </Linha>
            <Linha label="Itens relacionados">
              {s.itens.length ? (
                <ul className="list-disc pl-5">
                  {s.itens.map((i, n) => (
                    <li key={n}>
                      {i.descricao}
                      {i.quantidade ? ` — ${i.quantidade}${i.unidade ? ` ${i.unidade}` : ""}` : ""}
                      {i.valor ? ` — ${fmtBRL(i.valor)}` : ""}
                    </li>
                  ))}
                </ul>
              ) : "—"}
            </Linha>
            <Linha label="Fornecedor">{s.fornecedor || "—"}</Linha>
            <Linha label="Categoria">{s.categoria || "—"}</Linha>
            <Linha label="Conta">{s.conta || "—"}</Linha>
            <Linha label="Forma de pagamento">{s.formaPagamento || "—"}</Linha>
            <Linha label="Data prevista">{fmtDataBR(s.dataPrevista)}</Linha>
            <Linha label="Observações">{s.observacoes || "—"}</Linha>
            <Linha label="Criado por">{s.criadoPorEmail || "—"} · {fmtDataHoraBR(s.createdAt)}</Linha>
            {s.editadoEm && <Linha label="Editado por">{s.editadoPorEmail || "—"} · {fmtDataHoraBR(s.editadoEm)}</Linha>}
            {s.autorizadoEm && <Linha label="Autorizado por">{s.autorizadoPorEmail || "—"} · {fmtDataHoraBR(s.autorizadoEm)}</Linha>}
            {s.recusadoEm && (
              <Linha label="Recusado por">
                {s.recusadoPorEmail || "—"} · {fmtDataHoraBR(s.recusadoEm)}
                <span className="block text-destructive">Motivo: {s.recusaMotivo || "—"}</span>
              </Linha>
            )}
            {s.canceladoEm && <Linha label="Cancelado por">{s.canceladoPorEmail || "—"} · {fmtDataHoraBR(s.canceladoEm)}</Linha>}
            {s.status === "lancada" && (
              <Linha label="Pagamento no Fluxo de Caixa">
                <Link
                  to="/admin/financeiro"
                  search={{ tab: "fluxo", lancamento: s.lancamentoId }}
                  className="text-primary underline inline-flex items-center gap-1"
                >
                  Abrir lançamento <ExternalLink className="h-3 w-3" />
                </Link>
                <span className="block text-xs text-muted-foreground">{fmtDataHoraBR(s.lancadoEm)}</span>
              </Linha>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setEditando(true)} disabled={!podeEditar(s)}>
              <Pencil className="h-4 w-4 mr-2" /> Editar
            </Button>
            <Button onClick={() => setConfirmar(true)} disabled={!podeAutorizar(s) || busy}>
              <Check className="h-4 w-4 mr-2" /> Autorizar
            </Button>
            <Button
              variant="outline"
              onClick={() => setPagarAberto(true)}
              disabled={!podeRegistrarPagamento(s) || busy}
              title="Cria o lançamento de Saída no Fluxo de Caixa"
            >
              <Banknote className="h-4 w-4 mr-2" /> Registrar pagamento
            </Button>
            <Button variant="outline" onClick={() => setRecusaAberta(true)} disabled={!podeRecusar(s) || busy}>
              <X className="h-4 w-4 mr-2" /> Recusar
            </Button>
            <Button variant="outline" onClick={() => setCancelAberta(true)} disabled={!podeCancelar(s) || busy}>
              <Ban className="h-4 w-4 mr-2" /> Cancelar
            </Button>
            <Button variant="ghost" asChild><Link to="/admin/solicitacoes" search={{ status: "pendente", urgencia: "todas", q: "" }}>Voltar</Link></Button>
          </div>
        </section>

        {/* ----------------------------- Histórico ----------------------------- */}
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-serif text-lg text-primary flex items-center gap-2">
            <History className="h-4 w-4 text-gold" /> Histórico
          </h2>
          <ol className="mt-3 space-y-3">
            {eventos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>}
            {eventos.map((e) => (
              <li key={e.id} className="flex gap-3 text-sm">
                <span className="w-32 shrink-0 text-muted-foreground">{fmtDataHoraBR(e.createdAt)}</span>
                <span>
                  <b>{e.acao}</b>
                  {e.detalhe && <span className="block text-muted-foreground">{e.detalhe}</span>}
                  {e.atorEmail && <span className="block text-xs text-muted-foreground">por {e.atorEmail}</span>}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </main>

      {/* --------------------- Confirmação de autorização --------------------- */}
      <Dialog open={confirmar} onOpenChange={setConfirmar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar autorização da compra</DialogTitle>
            <DialogDescription>
              Autorizar libera a compra na Ordem de Produção. Nenhum lançamento financeiro é
              criado agora — o Fluxo de Caixa só recebe o valor no registro do pagamento.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-1">
            <p><b>Fornecedor:</b> {s.fornecedor || "—"}</p>
            <p><b>Categoria:</b> {s.categoria || "—"}</p>
            <p><b>Conta:</b> {s.conta || "—"}</p>
            <p><b>Forma de pagamento:</b> {s.formaPagamento || "—"}</p>
            <p><b>Valor:</b> {fmtBRL(s.valor)}</p>
            <p><b>Pedido:</b> {s.pedidoCliente || s.pedidoId || "—"}</p>
            <p><b>Origem:</b> {ORIGEM_LABEL[s.origem]}</p>
            <p className="pt-2 text-muted-foreground">
              <b>Resumo:</b> {s.descricao || "—"}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmar(false)}>Cancelar</Button>
            <Button
              onClick={() => acao(() => autorizarSolicitacao(s.id), "Compra autorizada. O item já pode ser adquirido.")}
              disabled={busy}
            >
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Autorizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --------------------------- Registrar pagamento --------------------------- */}
      <Dialog open={pagarAberto} onOpenChange={setPagarAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
            <DialogDescription>
              Este é o único momento em que o lançamento de Saída é criado no Fluxo de Caixa,
              vinculado a esta solicitação, à Ordem de Produção e ao Contrato. O sistema impede
              duplicidade.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <p><b>Fornecedor:</b> {s.fornecedor || "—"}</p>
              <p><b>Forma:</b> {s.formaPagamento || "—"}</p>
              <p><b>Conta:</b> {s.conta || "—"}</p>
              <p><b>Contrato:</b> {s.pedidoCliente || s.pedidoId || "—"}</p>
            </div>
            
            <div className="space-y-2 border-t pt-4">
              <Label className="text-sm font-bold text-primary">VALOR REAL PAGO (EDITÁVEL)</Label>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground uppercase">Valor Previsto: {fmtBRL(s.valor)}</span>
                <MoneyInput
                  value={valorRealPago}
                  onChange={setValorRealPago}
                  className="text-lg font-bold text-emerald-700"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPagarAberto(false)}>Voltar</Button>
            <Button
              onClick={() => acao(
                () => registrarPagamentoSolicitacao({ id: s.id, valor: valorRealPago }),
                "Pagamento registrado e lançamento financeiro criado.",
              )}
              disabled={busy}
            >
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Registrar pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* ------------------------------- Recusa ------------------------------- */}
      <Dialog open={recusaAberta} onOpenChange={setRecusaAberta}>
        <DialogContent>
          <DialogHeader><DialogTitle>Recusar solicitação</DialogTitle></DialogHeader>
          <div>
            <Label className="text-xs">Motivo da recusa (obrigatório)</Label>
            <Textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecusaAberta(false)}>Voltar</Button>
            <Button
              onClick={() => {
                if (!motivo.trim()) { toast.error("Informe o motivo da recusa."); return; }
                void acao(() => recusarSolicitacao(s.id, motivo.trim()), "Solicitação recusada.");
              }}
              disabled={busy}
            >
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Recusar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------------------- Cancelamento ---------------------------- */}
      <Dialog open={cancelAberta} onOpenChange={setCancelAberta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar solicitação</DialogTitle>
            <DialogDescription>
              Solicitações canceladas nunca poderão gerar lançamentos financeiros.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-xs">Motivo (opcional)</Label>
            <Textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelAberta(false)}>Voltar</Button>
            <Button onClick={() => acao(() => cancelarSolicitacao(s.id, motivo.trim()), "Solicitação cancelada.")} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Cancelar solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditarDialog
        open={editando}
        onOpenChange={setEditando}
        solicitacao={s}
        onSaved={load}
      />
    </AdminShell>
  );
}

/* --------------------------------- Edição --------------------------------- */

function EditarDialog({ open, onOpenChange, solicitacao, onSaved }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  solicitacao: Solicitacao;
  onSaved: () => Promise<void> | void;
}) {
  const [form, setForm] = useState({
    descricao: solicitacao.descricao,
    fornecedor: solicitacao.fornecedor,
    categoria: solicitacao.categoria || "Fornecedor",
    conta: solicitacao.conta || "Caixa",
    formaPagamento: solicitacao.formaPagamento || "PIX",
    valor: String(solicitacao.valor ?? ""),
    dataPrevista: solicitacao.dataPrevista || "",
    observacoes: solicitacao.observacoes,
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!open) return;
    setForm({
      descricao: solicitacao.descricao,
      fornecedor: solicitacao.fornecedor,
      categoria: solicitacao.categoria || "Fornecedor",
      conta: solicitacao.conta || "Caixa",
      formaPagamento: solicitacao.formaPagamento || "PIX",
      valor: String(solicitacao.valor ?? ""),
      dataPrevista: solicitacao.dataPrevista || "",
      observacoes: solicitacao.observacoes,
    });
  }, [open, solicitacao]);

  const salvar = async () => {
    if (busy) return;
    if (!form.descricao.trim()) { toast.error("Informe a descrição."); return; }
    setBusy(true);
    try {
      await editarSolicitacao({ id: solicitacao.id, ...form });
      toast.success("Solicitação atualizada.");
      onOpenChange(false);
      await onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar solicitação</DialogTitle>
          <DialogDescription>Somente solicitações pendentes podem ser editadas.</DialogDescription>
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
            <Input value={form.valor} onChange={(e) => set("valor", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Categoria</Label>
            <select className={selectCls} value={form.categoria} onChange={(e) => set("categoria", e.target.value)}>
              {Array.from(new Set([form.categoria, ...CATEGORIAS_DESPESA_PADRAO])).filter(Boolean).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Conta</Label>
            <select className={selectCls} value={form.conta} onChange={(e) => set("conta", e.target.value)}>
              {Array.from(new Set([form.conta, ...CONTAS_PADRAO])).filter(Boolean).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Forma de pagamento</Label>
            <select className={selectCls} value={form.formaPagamento} onChange={(e) => set("formaPagamento", e.target.value)}>
              {Array.from(new Set([form.formaPagamento, ...FORMAS_PAGAMENTO])).filter(Boolean).map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
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
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
