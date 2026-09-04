import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { AdminShell } from "@/components/admin-shell";
import { SectionBoundary } from "@/components/section-boundary";
import { fetchOrdersFromSheet, setOrderStatusOnSheet } from "@/lib/sheets-api";
import { hydrateOrdersCache, getOrders, fmtBRL, type StoredOrder } from "@/lib/orders-storage";
import { fetchLancamentos, parseValor, type Lancamento } from "@/lib/financeiro-api";
import { getContractPaymentStatus } from "@/lib/pagamentos";
import { fetchSolicitacoesPorItem } from "@/lib/solicitacoes-api";
import type { Solicitacao } from "@/lib/solicitacoes-types";
import {
  removerPlanejamentoDoContrato,
  compraTemHistorico,
  producaoTemHistorico,
  MSG_COMPRA_BLOQUEADA,
  MSG_PRODUCAO_BLOQUEADA,
  MSG_CONFIRMA_EXCLUIR_COMPRA,
  MSG_CONFIRMA_EXCLUIR_PRODUCAO,
} from "@/lib/planejamento-sync";
import {
  RegistrarCompraDialog,
  type RegistrarCompraAlvo,
} from "@/components/registrar-compra-dialog";
import {
  ConfirmarKitDialog,
  type ConfirmarKitAlvo,
} from "@/components/confirmar-kit-dialog";
import {
  mudarEtapaCompra,
  solicitacaoAprovada,
  type ConfirmacaoCompra,
} from "@/lib/compras-flow";

import {
  fetchOrdens,
  withTimeout,
  saveOrdem,
  logAction,
  getOrdemByContrato,
  criarOrdem,
  stages,
  progressPercent,
  deriveStatus,
  conferenciaCompleta,
  urgenciaFrom,
  isAtrasada,
  buildMaterialHistory,
  suggestMaterials,
  conflitosPatrimonio,
  fmtDateBR,
  fmtDateTimeBR,
  emptyConferencia,
  currentUser,
  getSyncState,
  fetchOrdemByContrato,
  compraStatusOf,
  compraAtiva,
  producaoAtiva,
  aguardandoConfirmacaoKit,
  applyCompraStatus,
  proximaEtapaCompra,
  descricaoCompra,
  COMPRA_STATUS_CLASS,
  COMPRA_STATUS_EMOJI,
  COMPRA_STATUS,
  COMPRA_ACAO_LABEL,
  COMPRA_BLOQUEIO_MENSAGEM,
  COMPRA_STATUS_MENSAGEM,
  OP_STATUS_CLASS,
  OP_STATUS_EMOJI,
  UNIDADES,
  FORMAS_PAGAMENTO,
  URGENCIA_EMOJI,
  type OrdemProducao,
  type ItemCompra,
  type ItemProducao,
  type MaterialHistorico,
  type CompraStatus,
} from "@/lib/producao-api";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ShoppingCart,
  Hammer,
  PackageCheck,
  ClipboardCheck,
  Printer,
  History,
  AlertTriangle,
  Loader2,
  Check,
  CloudOff,
  RefreshCw,
  Save,
} from "lucide-react";
import { MoneyInput } from "@/components/money-input";
import { AnexosEditor } from "@/components/anexos-editor";

export const Route = createFileRoute("/admin/producao/$id")({
  component: OrdemProducaoPage,
  head: () => ({ meta: [{ title: "Ordem de Produção — LHL Festas" }] }),
});

const numeric = (v: string) => Number(String(v).replace(",", ".")) || 0;

function OrdemProducaoPage() {
  const { id } = Route.useParams(); // id = contratoId
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [op, setOp] = useState<OrdemProducao | null>(null);
  const [todas, setTodas] = useState<OrdemProducao[]>([]);
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [sync, setSync] = useState(getSyncState());
  const [novoSep, setNovoSep] = useState("");
  /** Alvo da ação única "Registrar Compra". */
  const [compraAlvo, setCompraAlvo] = useState<RegistrarCompraAlvo | null>(null);
  /** Alvo da confirmação humana de Kit Pronto. */
  const [kitAlvo, setKitAlvo] = useState<ConfirmarKitAlvo | null>(null);
  /** Alterações digitadas ainda não gravadas — impede que uma recarga apague o trabalho. */
  const [dirty, setDirty] = useState(false);
  const [histAberto, setHistAberto] = useState(false);
  /** Pedido de exclusão/cancelamento de um item vindo do Contrato. */
  const [pedido, setPedido] = useState<
    | { tipo: "compra"; compra: ItemCompra }
    | { tipo: "producao"; producao: ItemProducao }
    | null
  >(null);
  const [histLoading, setHistLoading] = useState(false);
  /** Falha na leitura da fila financeira — não pode derrubar a OP. */
  const [solErro, setSolErro] = useState(false);
  /** Solicitações Financeiras por item de compra — libera "Marcar compra realizada". */
  const [solicitacoes, setSolicitacoes] = useState<
    Record<string, Awaited<ReturnType<typeof fetchSolicitacoesPorItem>>[string]>
  >({});

  /** Sempre aponta para a versão mais recente da OP na tela (evita salvar estado velho). */
  const opRef = useRef<OrdemProducao | null>(null);
  /** Itens já avançados automaticamente após a autorização (evita repetição). */
  const autoAvancados = useRef<Set<string>>(new Set());
  useEffect(() => {
    opRef.current = op;
  }, [op]);

  useEffect(() => {
    fetchLancamentos().then(setLancamentos).catch(() => { /* ignore */ });
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      let list: StoredOrder[] = getOrders();
      try {
        const remote = await withTimeout(fetchOrdersFromSheet());
        list = hydrateOrdersCache(remote);
      } catch {
        /* usa cache */
      }
      const ops = await fetchOrdens();
      if (!alive) return;
      let found = list.find((o) => o.id === id) ?? null;
      let mine = getOrdemByContrato(ops, id);
      // Compatibilidade: alguns atalhos antigos passam o id interno (ou o número)
      // da OP em vez do id do contrato. Resolve sem criar uma nova OP.
      if (!found && !mine) {
        const porOp = ops.find((o) => o.id === id || o.numero === id);
        if (porOp) {
          mine = porOp;
          found = list.find((o) => o.id === porOp.contratoId) ?? null;
        }
      }
      setOrders(list);
      setOrder(found);
      if (!mine && found) {
        mine = await criarOrdem(found, ops);
        // Reserva entra em produção e os patrimônios do kit ficam reservados.
        if (found.status === "Pendente") {
          try {
            await setOrderStatusOnSheet(found.id, "Em andamento");
            found.status = "Em andamento";
          } catch {
            /* offline */
          }
        }
        toast.success("Ordem de Produção criada — reserva em produção.");
      }
      setTodas(mine && !ops.some((o) => o.id === mine!.id) ? [...ops, mine] : ops);
      setOp(mine ?? null);

      setSync(getSyncState());
      setLoading(false);
      try {
        const sol = await fetchSolicitacoesPorItem();
        if (alive) {
          setSolicitacoes(sol);
          setSolErro(false);
        }
      } catch {
        if (alive) setSolErro(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  /**
   * Sincronização automática (sem botão, sem refresh):
   *  · Contrato — fonte única dos dados comerciais/financeiros desta tela.
   *  · Solicitações Financeiras — liberam a compra assim que autorizadas.
   * Roda ao abrir, ao voltar o foco para a aba e a cada 45 segundos.
   */
  useEffect(() => {
    let alive = true;
    const sync = async () => {
      if (!alive || document.visibilityState === "hidden") return;
      try {
        const remote = await withTimeout(fetchOrdersFromSheet());
        const list = hydrateOrdersCache(remote);
        if (!alive) return;
        setOrders(list);
        const found = list.find((o) => o.id === id);
        if (found) setOrder(found);
      } catch {
        /* offline: mantém o espelho atual */
      }
      try {
        const sol = await fetchSolicitacoesPorItem();
        if (alive) {
          setSolicitacoes(sol);
          setSolErro(false);
        }
      } catch {
        if (alive) setSolErro(true);
      }
    };
    const timer = window.setInterval(sync, 45000);
    window.addEventListener("focus", sync);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", sync);
    };
  }, [id]);


  const history = useMemo(() => buildMaterialHistory(todas), [todas]);

  /**
   * Autorização feita na Central de Solicitações reflete sozinha aqui.
   * IMPORTANTE: este hook precisa ficar ANTES de qualquer `return` condicional
   * (carregando / contrato não encontrado) — caso contrário a quantidade de
   * hooks muda entre renders e o React derruba a rota inteira.
   */
  const avancarAutorizadoRef = useRef<(c: ItemCompra, s: CompraStatus) => void>(() => {});
  useEffect(() => {
    avancarAutorizadoRef.current = async (item: ItemCompra, status: CompraStatus) => {
      try {
        const r = await mudarEtapaCompra({
          op: opRef.current!,
          itemId: item.id,
          status,
          order: order!,
        });
        setOp(r.op);
        opRef.current = r.op;
        toast.info(r.mensagem);
      } catch (e) {
        console.error("Erro no avanço automático:", e);
      }
    };
  }, [order]);

  useEffect(() => {
    const atual = opRef.current;
    if (!atual || dirty) return;
    const item = (atual.compras || []).find(
      (c) =>
        compraStatusOf(c) === "Aguardando autorização" &&
        solicitacaoAprovada(solicitacoes[c.id] ?? null) &&
        !autoAvancados.current.has(c.id),
    );
    if (!item) return;
    autoAvancados.current.add(item.id);
    avancarAutorizadoRef.current(item, "Compra autorizada");
  }, [solicitacoes, dirty]);

  /**
   * Grava na planilha. Aceita a OP pronta ou uma função que recebe a versão
   * mais recente da tela — assim nada digitado depois é sobrescrito.
   */
  const persist = async (
    input: OrdemProducao | ((cur: OrdemProducao) => OrdemProducao),
    acao?: string,
  ) => {
    const base = opRef.current;
    if (!base) return null;
    const next =
      typeof input === "function" ? (input as (c: OrdemProducao) => OrdemProducao)(base) : input;
    setSaving("saving");
    const withLog = acao ? logAction(next, acao) : next;
    // Otimista na tela; a verdade continua sendo a planilha.
    setOp(withLog);
    opRef.current = withLog;
    try {
      const saved = await saveOrdem(withLog);
      // Mantém na tela exatamente o que o usuário está editando; apenas
      // sincroniza os campos derivados (status, histórico, atualizadoEm).
      setOp((cur) =>
        cur
          ? {
              ...cur,
              status: saved.status,
              historico: saved.historico,
              atualizadoEm: saved.atualizadoEm,
            }
          : saved,
      );
      setTodas((prev) => {
        const i = prev.findIndex((o) => o.id === saved.id);
        if (i === -1) return [...prev, saved];
        const c = [...prev];
        c[i] = saved;
        return c;
      });
      setDirty(false);
      setSync(getSyncState());
      setSaving("saved");
      setTimeout(() => setSaving((v) => (v === "saved" ? "idle" : v)), 2500);
      return saved;
    } catch {
      setSync(getSyncState());
      setSaving("error");
      toast.error("Não foi possível salvar na planilha. A alteração ficou apenas neste aparelho.");
      return withLog;
    }
  };

  /** Salva o estado atual da tela (usado nos campos com gravação por saída de foco). */
  const salvarAtual = (acao?: string) => persist((cur) => cur, acao);

  /** Edição local — nunca vai à planilha até o usuário pedir. */
  const edit = (fn: (cur: OrdemProducao) => OrdemProducao) => {
    setDirty(true);
    setOp((cur) => (cur ? fn(cur) : cur));
  };

  /** Recarrega a OP da planilha (fonte oficial) — somente sob pedido explícito. */
  const recarregar = async () => {
    if (
      dirty &&
      !window.confirm(
        "Existem alterações não salvas nesta tela. Recarregar vai descartá-las. Continuar?",
      )
    )
      return;
    const fresh = await fetchOrdemByContrato(id);
    setSync(getSyncState());
    if (fresh) {
      setOp(fresh);
      setDirty(false);
      setTodas((prev) => {
        const i = prev.findIndex((o) => o.id === fresh.id);
        if (i === -1) return [...prev, fresh];
        const c = [...prev];
        c[i] = fresh;
        return c;
      });
    }
  };

  /** Atualiza apenas o histórico — não interfere no que está sendo preenchido. */
  const atualizarHistorico = async () => {
    setHistLoading(true);
    try {
      const fresh = await fetchOrdemByContrato(id);
      if (fresh) setOp((cur) => (cur ? { ...cur, historico: fresh.historico } : cur));
      setSync(getSyncState());
    } finally {
      setHistLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminShell>
        <main className="mx-auto max-w-5xl px-4 py-16 flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando Ordem de Produção...
        </main>
      </AdminShell>
    );
  }

  if (!order || !op) {
    return (
      <AdminShell>
        <main className="mx-auto max-w-5xl px-4 py-16 text-center space-y-4">
          <p className="font-serif text-2xl text-primary">
            Não foi possível localizar a Ordem de Produção vinculada a este pedido.
          </p>

          <Button asChild variant="ghost">
            <Link to="/admin/producao" search={{ filtro: "pendentes", etapa: "todas", q: "" }}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Central de Produção
            </Link>
          </Button>
        </main>
      </AdminShell>
    );
  }

  const d = order.details;
  const st = stages(op) ?? [];
  const pct = progressPercent(op);
  const status = op.status === "Finalizado" ? "Finalizado" : deriveStatus(op);
  const urg = urgenciaFrom(d?.dataRetirada);
  const atrasada = isAtrasada(op, order);
  const conflitos = conflitosPatrimonio(op, todas, orders);

  // FILA ATIVA x HISTÓRICO — item comprado/produzido sai da área ativa da OP,
  // mas continua acessível (com todo o histórico) na seção recolhível.
  const comprasVivas = (op.compras || []).filter((c) => !c.cancelado);
  const comprasAtivas = comprasVivas.filter(compraAtiva);
  const comprasConcluidas = comprasVivas.filter((c) => !compraAtiva(c));
  const producaoVivos = (op.producao || []).filter((x) => x.status !== "Cancelado");
  const producaoAtivos = producaoVivos.filter(producaoAtiva);
  const producaoConcluidos = producaoVivos.filter((x) => !producaoAtiva(x));
  const podeConfirmarKit = aguardandoConfirmacaoKit(op);

  // Regra central de status financeiro (recebimentos confirmados, sem caução).
  const pagContrato = getContractPaymentStatus(order, lancamentos);
  const total = pagContrato.valorTotal;
  const recebido = pagContrato.totalRecebido;
  const saldo = pagContrato.saldoReceber;


  /* ---------------- Compras ---------------- */

  /** Novo item entra apenas na tela; vai à planilha no botão "Salvar item". */
  const addCompra = () =>
    edit((cur) => ({
      ...cur,
      compras: [
        ...cur.compras,
        {
          id: crypto.randomUUID(),
          descricao: "",
          quantidade: 1,
          unidade: "un",
          observacao: "",
          fornecedor: "",
          valorOrcado: 0,
          valorReal: 0,
          formaPagamento: "PIX",
          pago: false,
          comprado: false,
          tipo: "Consumo",
          statusCompra: "Aguardando orçamento",
        },
      ],
    }));

  const patchCompra = (cid: string, patch: Partial<ItemCompra>) =>
    edit((cur) => ({
      ...cur,
      compras: cur.compras.map((c) => (c.id === cid ? { ...c, ...patch } : c)),
    }));

  /** Grava o item (e o restante da tela) somente quando solicitado. */
  const salvarCompra = async (cid: string) => {
    const atual = (opRef.current?.compras || []).find((c) => c.id === cid);
    if (!atual) return;
    if (!String(atual.descricao ?? "").trim()) {
      toast.error("Informe a descrição do material antes de salvar.");
      return;
    }
    await persist((cur) => cur, `Item de compra salvo: ${descricaoCompra(atual)}`);
    toast.success("Item de compra salvo.");
  };

  /**
   * Exclusão sincronizada (OP → Contrato). Só chega aqui item em estágio
   * inicial e sem nada financeiro; o item também sai de "Itens a Comprar".
   */
  const excluirCompraDefinitivo = async (c: ItemCompra) => {
    await persist(
      (cur) => ({
        ...cur,
        compras: cur.compras.filter((x) => x.id !== c.id),
        // Lápide: exclusão explícita — a fusão anti-perda e a sincronização do
        // Contrato nunca ressuscitam o item (id da OP e id do planejamento).
        itensExcluidos: [
          ...(cur.itensExcluidos || []),
          c.id,
          ...(c.origemContratoItemId ? [c.origemContratoItemId] : []),
        ],
      }),
      `Item de compra removido: ${descricaoCompra(c)}`,
    );

    await limparDoContrato({ compraOrigemIds: [c.origemContratoItemId ?? ""] });
    toast.success("Item excluído da Ordem de Produção e do Contrato.");
  };

  /** Cancelamento — preserva valores, fornecedor, solicitação e histórico. */
  const cancelarCompraItem = async (c: ItemCompra) => {
    await persist(
      (cur) => ({
        ...cur,
        compras: cur.compras.map((x) =>
          x.id === c.id ? { ...x, cancelado: true, removidoDoContrato: true } : x,
        ),
      }),
      `Item de compra cancelado: ${descricaoCompra(c)}`,
    );
    await limparDoContrato({ compraOrigemIds: [c.origemContratoItemId ?? ""] });
    toast.success("Item cancelado. O histórico foi preservado.");
  };

  /** Remove o vínculo da lista ativa do Contrato (idempotente). */
  const limparDoContrato = async (alvos: {
    compraOrigemIds?: string[];
    producaoOrigemIds?: string[];
  }) => {
    const base = order;
    if (!base) return;
    const compraIds = (alvos.compraOrigemIds ?? []).filter(Boolean);
    const producaoIds = (alvos.producaoOrigemIds ?? []).filter(Boolean);
    if (!compraIds.length && !producaoIds.length) return;
    try {
      const atualizado = await removerPlanejamentoDoContrato(base, {
        compraOrigemIds: compraIds,
        producaoOrigemIds: producaoIds,
      });
      setOrder(atualizado);
      setOrders((prev) => prev.map((o) => (o.id === atualizado.id ? atualizado : o)));
    } catch {
      toast.error(
        "O item saiu da Ordem de Produção, mas não foi possível atualizar o Contrato. Tente novamente.",
      );
    }
  };

  /**
   * Avança/retrocede a etapa do item usando o fluxo único de compras
   * (o mesmo da Central de Produção). A Solicitação Financeira nasce ao
   * enviar o item para aprovação, a autorização vem da Central de Solicitações
   * e o lançamento financeiro nasce apenas no registro do pagamento.
   */
  const mudarStatusCompra = async (
    c: ItemCompra,
    status: CompraStatus,
    confirmacao?: ConfirmacaoCompra,
  ) => {
    if (status === "Compra realizada" || status === "Pago") {
      void abrirRegistroCompra(c);
      return;
    }

    // Garante que o que está na tela já foi gravado antes de mudar a etapa.
    const base = dirty ? await persist((cur) => cur) : opRef.current;
    if (!base) return;
    let solicitacao = solicitacoes[c.id] ?? null;
    if (status === "Compra autorizada") {
      try {
        const fresh = await fetchSolicitacoesPorItem();
        setSolicitacoes(fresh);
        solicitacao = fresh[c.id] ?? null;
      } catch {
        /* fila indisponível */
      }
    }
    try {
      const res = await mudarEtapaCompra({
        op: base,
        itemId: c.id,
        status,
        order,
        solicitacao,
        confirmacao,
      });
      setOp(res.op);
      opRef.current = res.op;
      setTodas((prev) => prev.map((o) => (o.id === res.op.id ? res.op : o)));
      setDirty(false);
      setSync(getSyncState());
      toast.success(res.mensagem);
      // Mantém a fila financeira sincronizada sem recarregar a página.
      try {
        setSolicitacoes(await fetchSolicitacoesPorItem());
      } catch {
        /* fila indisponível */
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar a etapa.");
    }
  };

  /**
   * Ação única "Registrar Compra": abre o diálogo centralizado.
   */
  const abrirRegistroCompra = async (c: ItemCompra) => {
    const base = dirty ? await persist((cur) => cur) : opRef.current;
    if (!base) return;
    let solicitacao = solicitacoes[c.id] ?? null;
    try {
      const fresh = await fetchSolicitacoesPorItem();
      setSolicitacoes(fresh);
      solicitacao = fresh[c.id] ?? solicitacao;
    } catch {
      /* fila indisponível */
    }
    setCompraAlvo({ op: base, item: c, order, solicitacao, cliente: order?.nome || "" });
  };

  // O hook de auto-avanço vive acima dos returns condicionais; aqui só
  // registramos o handler atual para que ele possa ser usado por lá.
  avancarAutorizadoRef.current = (c, s) => void mudarStatusCompra(c, s);


  /* ---------------- Produção ---------------- */

  const addProducao = () =>
    persist(
      (cur) => ({
        ...cur,
        producao: [
          ...cur.producao,
          {
            id: crypto.randomUUID(),
            descricao: "",
            responsavel: currentUser(),
            prazo: "",
            observacao: "",
            anexos: [],
            status: "Pendente",
          },
        ],
      }),
      "Item de produção adicionado",
    );

  const patchProducao = (pid: string, patch: Partial<ItemProducao>) =>
    edit((cur) => ({
      ...cur,
      producao: cur.producao.map((p) => (p.id === pid ? { ...p, ...patch } : p)),
    }));

  /** Exclusão sincronizada de produção — só em "Produção pendente". */
  const excluirProducaoDefinitivo = async (p: ItemProducao) => {
    await persist(
      (cur) => ({
        ...cur,
        producao: cur.producao.filter((x) => x.id !== p.id),
        itensExcluidos: [
          ...(cur.itensExcluidos || []),
          p.id,
          ...(p.origemContratoItemId ? [p.origemContratoItemId] : []),
        ],

      }),
      `Item de produção removido: ${p.descricao}`,
    );
    await limparDoContrato({ producaoOrigemIds: [p.origemContratoItemId ?? ""] });
    toast.success("Item excluído da Ordem de Produção e do Contrato.");
  };

  /** Cancelamento de produção — status terminal, preserva o histórico. */
  const cancelarProducaoItem = async (p: ItemProducao) => {
    await persist(
      (cur) => ({
        ...cur,
        producao: cur.producao.map((x) =>
          x.id === p.id ? { ...x, status: "Cancelado", removidoDoContrato: true } : x,
        ),
      }),
      `Item de produção cancelado: ${p.descricao}`,
    );
    await limparDoContrato({ producaoOrigemIds: [p.origemContratoItemId ?? ""] });
    toast.success("Item cancelado. O histórico foi preservado.");
  };

  /* ---------------- Separação ---------------- */

  const addSeparacao = () => {
    if (!novoSep.trim()) return;
    persist(
      (cur) => ({
        ...cur,
        separacao: [
          ...cur.separacao,
          { id: crypto.randomUUID(), descricao: novoSep.trim(), marcado: false, origem: "manual" },
        ],
      }),
      `Item de separação adicionado: ${novoSep.trim()}`,
    );
    setNovoSep("");
  };

  /* ---------------- Finalizar ---------------- */

  const finalizar = async () => {
    await persist(
      (cur) => ({
        ...cur,
        status: "Kit Pronto",
        finalizadaEm: new Date().toISOString(),
      }),
      "Ordem finalizada — Kit Pronto para entrega",
    );
    toast.success("Kit Pronto!");
  };

  return (
    <AdminShell>
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-5 print:max-w-none print:py-0">
        <div className="flex items-center justify-between gap-3 print:hidden">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/producao" search={{ filtro: "pendentes", etapa: "todas", q: "" }}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Central de Produção
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs min-w-[9rem] text-right">
              {saving === "saving" && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando...
                </span>
              )}
              {saving === "saved" && (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <Check className="h-3.5 w-3.5" /> Salvo com sucesso
                </span>
              )}
              {saving === "error" && (
                <span className="inline-flex items-center gap-1 text-red-600">
                  <CloudOff className="h-3.5 w-3.5" /> Não sincronizado
                </span>
              )}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={recarregar}
              title="Buscar a versão mais recente da planilha"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" /> PDF da OP
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/$id" params={{ id: order.id }}>
                Abrir Contrato
              </Link>
            </Button>
          </div>
        </div>

        {!sync.online && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 print:hidden">
            <strong className="inline-flex items-center gap-1">
              <CloudOff className="h-4 w-4" /> Fora de sincronia.
            </strong>{" "}
            {sync.suportado
              ? "Não foi possível falar com a planilha agora. As alterações ficam neste aparelho até a conexão voltar."
              : "A planilha ainda não possui a aba ORDENS_PRODUCAO — enquanto isso, cada aparelho vê apenas os próprios dados."}
          </div>
        )}

        {/* ---------- Cabeçalho ---------- */}
        <section className="rounded-2xl bg-card border border-border/60 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">{op.numero}</p>
              <h1 className="font-serif text-2xl text-primary">{order.nome}</h1>
              <p className="text-sm text-muted-foreground">
                {order.tema || "—"} · {order.modalidade || "—"} · {order.plano || "—"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${OP_STATUS_CLASS[status]}`}
              >
                {OP_STATUS_EMOJI[status]} {status}
              </span>
              <span className="text-xs text-muted-foreground">
                {URGENCIA_EMOJI[urg]} {urg}
              </span>
              {atrasada && (
                <span className="text-xs text-red-600 font-medium">🔴 Produção atrasada</span>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Info label="Data da Festa" value={fmtDateBR(d?.dataEvento)} />
            <Info label="Data da Retirada" value={fmtDateBR(d?.dataRetirada)} />
            <Info label="Valor Total" value={fmtBRL(total)} />
            <Info label="Valor Recebido" value={fmtBRL(recebido)} />
            <Info label="Saldo a Receber" value={fmtBRL(saldo)} />
            <Info label="Caução" value={fmtBRL(parseValor(d?.valorCaucao))} />
            <Info label="Aniversariante" value={d?.nomeAniversariante || "—"} />
            <Info label="Progresso" value={`${pct}%`} />
          </div>

          <div className="mt-4">
            <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-[image:var(--gradient-elegant)] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {st.map((s) => (
                <span key={s.key} className={s.done ? "text-emerald-600" : ""}>
                  {s.label} {s.done ? "✔" : "✖"}{" "}
                  {s.total > 0 ? `(${s.concluidos}/${s.total})` : ""}
                </span>
              ))}
            </div>
          </div>

          {conflitos.length > 0 && (
            <div className="mt-4 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-xs text-red-700">
              <p className="font-medium flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Possível dupla reserva de patrimônio
              </p>
              <ul className="mt-1 list-disc pl-4">
                {conflitos.map((c, i) => (
                  <li key={i}>
                    {c.item} — também reservado por {c.contrato}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ---------- Etapa 1: Compras ---------- */}
        <Stage
          title="Etapa 1 — Compras"
          icon={<ShoppingCart className="h-4 w-4 text-gold" />}
          done={Boolean(st[0]?.done)}
        >
          <div className="space-y-3">
            {solErro && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 flex items-center justify-between gap-2">
                <span>
                  Não foi possível ler a fila de Solicitações Financeiras agora. As etapas de compra
                  continuam disponíveis; a liberação automática pode demorar.
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      setSolicitacoes(await fetchSolicitacoesPorItem());
                      setSolErro(false);
                    } catch {
                      setSolErro(true);
                    }
                  }}
                >
                  Tentar novamente
                </Button>
              </div>
            )}
            {/* Fila ATIVA — o item comprado sai daqui e desce para o histórico. */}
            {comprasAtivas.map((c) => (
              <CompraRow
                key={c.id}
                item={c}
                history={history}
                solicitacao={solicitacoes[c.id] ?? null}
                salvando={saving === "saving"}
                onPatch={(p) => patchCompra(c.id, p)}
                onSalvar={() => salvarCompra(c.id)}
                onRemove={() => setPedido({ tipo: "compra", compra: c })}
                onStatus={(s) => mudarStatusCompra(c, s)}
                onRegistrarCompra={() => void abrirRegistroCompra(c)}
              />
            ))}

            {comprasConcluidas.length > 0 && (
              <Concluidos titulo="Compras concluídas" total={comprasConcluidas.length}>
                {comprasConcluidas.map((c) => (
                  <CompraRow
                    key={c.id}
                    item={c}
                    history={history}
                    solicitacao={solicitacoes[c.id] ?? null}
                    salvando={saving === "saving"}
                    onPatch={(p) => patchCompra(c.id, p)}
                    onSalvar={() => salvarCompra(c.id)}
                    onRemove={() => setPedido({ tipo: "compra", compra: c })}
                    onStatus={(s) => mudarStatusCompra(c, s)}
                    onRegistrarCompra={() => void abrirRegistroCompra(c)}
                  />
                ))}
              </Concluidos>
            )}

            {(op.compras || []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum item de compra cadastrado.</p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCompra}
              className="print:hidden"
            >
              <Plus className="h-4 w-4 mr-2" /> Adicionar item
            </Button>
          </div>
        </Stage>

        {/* ---------- Etapa 2: Produção ---------- */}
        <Stage
          title="Etapa 2 — Produção"
          icon={<Hammer className="h-4 w-4 text-gold" />}
          done={Boolean(st[1]?.done)}
        >
          <div className="space-y-3">
            {/* Fila ATIVA de produção — "Produzido" desce para o histórico. */}
            {producaoAtivos.map((p) => (
              <div key={p.id} className="rounded-xl border border-border/60 p-3 space-y-2">
                <div className="grid gap-3 sm:grid-cols-12 items-end">
                  <div className="sm:col-span-7">
                    <Label className="text-xs text-muted-foreground">Descrição</Label>
                    <Input
                      value={p.descricao}
                      onChange={(e) => patchProducao(p.id, { descricao: e.target.value })}
                      onBlur={() => salvarAtual()}
                      className="h-9"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <select
                      value={p.status}
                      onChange={(e) =>
                        persist(
                          (cur) => ({
                            ...cur,
                            producao: cur.producao.map((x) =>
                              x.id === p.id
                                ? { ...x, status: e.target.value as ItemProducao["status"] }
                                : x,
                            ),
                          }),
                          `Produção "${p.descricao}" → ${e.target.value}`,
                        )
                      }
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option>Pendente</option>
                      <option>Em Produção</option>
                      <option>Concluído</option>
                      <option>Cancelado</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 flex justify-end gap-2 print:hidden">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-500"
                      onClick={() => setPedido({ tipo: "producao", producao: p })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {p.status === "Em Produção" && (
                  <AnexosEditor
                    pasta={op.id}
                    anexos={p.anexos}
                    onChange={(anexos) =>
                      persist(
                        (cur) => ({
                          ...cur,
                          producao: cur.producao.map((x) => (x.id === p.id ? { ...x, anexos } : x)),
                        }),
                        `Anexos atualizados em "${p.descricao}"`,
                      )
                    }
                  />
                )}
              </div>
            ))}

            {producaoConcluidos.length > 0 && (
              <Concluidos titulo="Produções concluídas" total={producaoConcluidos.length}>
                <ul className="space-y-2">
                  {producaoConcluidos.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm"
                    >
                      <span className="truncate">{p.descricao || "Item"}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {p.status}
                        {p.responsavel ? ` · ${p.responsavel}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </Concluidos>
            )}

            {(op.producao || []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum item de produção cadastrado.</p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addProducao}
              className="print:hidden"
            >
              <Plus className="h-4 w-4 mr-2" /> Adicionar item personalizado
            </Button>
          </div>
        </Stage>

        {/* ---------- Fechamento: confirmação humana de Kit Pronto ---------- */}
        {podeConfirmarKit && (
          <section className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div>
              <p className="text-sm font-medium text-emerald-700">
                Todos os itens concluídos. Confirmar Kit Pronto?
              </p>
              <p className="text-xs text-muted-foreground">
                Nenhuma compra ou produção pendente nesta Ordem de Produção.
              </p>
            </div>
            <Button
              size="sm"
              className="rounded-full"
              onClick={() => setKitAlvo({ op, cliente: order.nome, origem: "OP" })}
            >
              Confirmar Kit Pronto
            </Button>
          </section>
        )}

        {/* ---------- Exclusão / cancelamento sincronizado ---------- */}
        <Dialog open={!!pedido} onOpenChange={(v) => !v && setPedido(null)}>
          <DialogContent>
            {(() => {
              const alvoCompra = pedido?.tipo === "compra" ? pedido.compra : null;
              const alvoProducao = pedido?.tipo === "producao" ? pedido.producao : null;
              const bloqueado = alvoCompra
                ? compraTemHistorico(alvoCompra)
                : alvoProducao
                  ? producaoTemHistorico(alvoProducao)
                  : false;
              const doContrato = !!(
                alvoCompra?.origemContratoItemId || alvoProducao?.origemContratoItemId
              );
              const mensagem = bloqueado
                ? alvoCompra
                  ? MSG_COMPRA_BLOQUEADA
                  : MSG_PRODUCAO_BLOQUEADA
                : doContrato
                  ? alvoCompra
                    ? MSG_CONFIRMA_EXCLUIR_COMPRA
                    : MSG_CONFIRMA_EXCLUIR_PRODUCAO
                  : "Deseja excluir este item da Ordem de Produção?";
              return (
                <>
                  <DialogHeader>
                    <DialogTitle>
                      {bloqueado ? "Cancelar item" : "Excluir item"}
                    </DialogTitle>
                    <DialogDescription>{mensagem}</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPedido(null)}>
                      Cancelar
                    </Button>
                    <Button
                      disabled={saving === "saving"}
                      className={bloqueado ? "" : "bg-red-600 hover:bg-red-700 text-white"}
                      onClick={async () => {
                        setPedido(null);
                        if (alvoCompra) {
                          if (bloqueado) await cancelarCompraItem(alvoCompra);
                          else await excluirCompraDefinitivo(alvoCompra);
                        } else if (alvoProducao) {
                          if (bloqueado) await cancelarProducaoItem(alvoProducao);
                          else await excluirProducaoDefinitivo(alvoProducao);
                        }
                      }}
                    >
                      {bloqueado
                        ? "Cancelar item"
                        : doContrato
                          ? "Excluir dos dois locais"
                          : "Excluir item"}
                    </Button>
                  </DialogFooter>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* ---------- Histórico ---------- */}
        <section className="rounded-2xl bg-card border border-border/60 p-5">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h2 className="text-sm font-medium text-primary flex items-center gap-2">
              <History className="h-4 w-4 text-gold" /> Histórico e Auditoria
            </h2>
            <div className="ml-auto flex gap-2 print:hidden">
              <Button variant="ghost" size="sm" onClick={() => setHistAberto((v) => !v)}>
                {histAberto ? "Ocultar" : "Mostrar"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={atualizarHistorico}
                disabled={histLoading}
              >
                {histLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Atualizar histórico
              </Button>
            </div>
          </div>
          {histAberto ? (
            <ul className="space-y-1.5 text-xs text-muted-foreground max-h-72 overflow-auto">
              {(op.historico || []).map((h) => (
                <li key={h.id} className="flex gap-2">
                  <span className="text-primary/70 whitespace-nowrap">
                    {fmtDateTimeBR(h.dataHora)}
                  </span>
                  <span className="font-medium">{h.usuario}</span>
                  <span>— {h.acao}</span>
                </li>
              ))}
              {(op.historico || []).length === 0 && <li>Sem registros.</li>}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              {(op.historico || []).length} registro(s). O histórico não se atualiza sozinho durante o
              preenchimento — use “Atualizar histórico”.
            </p>
          )}
        </section>
      </main>

      <ConfirmarKitDialog
        alvo={kitAlvo}
        onClose={() => setKitAlvo(null)}
        onAtualizado={(nova) => {
          setOp(nova);
          opRef.current = nova;
          setTodas((prev) => prev.map((o) => (o.id === nova.id ? nova : o)));
          setDirty(false);
          setSync(getSyncState());
        }}
      />

      <RegistrarCompraDialog
        alvo={compraAlvo}
        onClose={() => setCompraAlvo(null)}
        onAtualizado={(nova) => {
          setOp(nova);
          opRef.current = nova;
          setTodas((prev) => prev.map((o) => (o.id === nova.id ? nova : o)));
          setDirty(false);
          setSync(getSyncState());
          void fetchSolicitacoesPorItem().then(setSolicitacoes).catch(() => {});
        }}
      />
    </AdminShell>
  );
}

/* ============================ Subcomponentes ============================ */

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-primary font-medium">{value}</p>
    </div>
  );
}

function CompraRow({
  item,
  history,
  solicitacao,
  salvando,
  onPatch,
  onSalvar,
  onRemove,
  onStatus,
  onRegistrarCompra,
}: {
  item: ItemCompra;
  history: MaterialHistorico[];
  solicitacao: Solicitacao | null;
  salvando: boolean;
  onPatch: (p: Partial<ItemCompra>) => void;
  onSalvar: () => void;
  onRemove: () => void;
  onStatus: (s: CompraStatus, confirmacao?: ConfirmacaoCompra) => void;
  onRegistrarCompra: () => void;
}) {
  const [focus, setFocus] = useState(false);
  const sugestoes = focus ? suggestMaterials(history, item.descricao) : [];
  const status = compraStatusOf(item);
  const idx = COMPRA_STATUS.indexOf(status);
  const anterior = idx > 0 ? COMPRA_STATUS[idx - 1] : null;
  const aguardando = status === "Aguardando autorização";
  const autorizado = solicitacaoAprovada(solicitacao);
  const bloqueado = aguardando && !autorizado;
  const orcando = status === "Aguardando orçamento" || status === "Orçamento recebido";
  const autorizada = status === "Compra autorizada";

  const proxima: CompraStatus | null = orcando ? "Aguardando autorização" : proximaEtapaCompra(item);
  const acaoLabel = orcando
    ? "Enviar para aprovação"
    : autorizada || bloqueado
      ? "Registrar Compra"
      : COMPRA_ACAO_LABEL[status];

  const avancar = () => {
    if (!proxima) return;
    if (proxima === "Compra realizada") onRegistrarCompra();
    else onStatus(proxima);
  };

  return (
    <div className="rounded-xl border border-border/60 p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] ${COMPRA_STATUS_CLASS[status]}`}>
          {COMPRA_STATUS_EMOJI[status]} {status}
        </span>
        {item.solicitacaoId && <span className="text-[11px] text-blue-600">Solicitação financeira gerada</span>}
      </div>

      <div className="grid gap-3 sm:grid-cols-12 items-end">
        <div className="col-span-12 sm:col-span-5 relative">
          <Label className="text-xs text-muted-foreground">Descrição</Label>
          <Input
            value={item.descricao}
            onChange={(e) => onPatch({ descricao: e.target.value })}
            onFocus={() => setFocus(true)}
            onBlur={() => setTimeout(() => setFocus(false), 150)}
            className="h-9"
          />
          {sugestoes.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full rounded-md border border-border bg-card shadow-lg text-sm">
              {sugestoes.map((s) => (
                <li key={s.descricao}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-1.5 hover:bg-primary/10"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onPatch({ descricao: s.descricao, valorOrcado: s.ultimoValor });
                      setFocus(false);
                    }}
                  >
                    {s.descricao} <span className="text-xs text-muted-foreground">· {fmtBRL(s.ultimoValor)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="col-span-6 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Qtd</Label>
          <Input
            type="number"
            value={item.quantidade}
            onChange={(e) => onPatch({ quantidade: numeric(e.target.value) })}
            className="h-9"
          />
        </div>
        <div className="col-span-6 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Preço (Est.)</Label>
          <MoneyInput value={item.valorOrcado} onChange={(v) => onPatch({ valorOrcado: v })} />
        </div>
        
        {/* Detalhes Técnicos (Ocultos no Mobile por padrão) */}
        <details className="col-span-12 sm:col-span-12 group">
          <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-primary py-1 list-none flex items-center gap-1">
             <span className="group-open:rotate-90 transition-transform">▶</span> Ver detalhes técnicos (Unidade, Fornecedor)
          </summary>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Unidade</Label>
              <Input
                value={item.unidade || "un"}
                onChange={(e) => onPatch({ unidade: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Fornecedor</Label>
              <Input
                value={item.fornecedor || ""}
                onChange={(e) => onPatch({ fornecedor: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </details>

        <div className="col-span-12 sm:col-span-3 flex justify-end gap-2 print:hidden pt-2 sm:pt-0">
          <Button type="button" size="sm" variant="outline" onClick={onSalvar} disabled={salvando}>
            <Save className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="text-red-500" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1 print:hidden border-t border-border/40 pt-2">
        {proxima && !item.cancelado && (
          <Button
            type="button"
            size="sm"
            disabled={salvando || bloqueado}
            onClick={avancar}
            className="rounded-full bg-[image:var(--gradient-elegant)] text-primary-foreground border-0"
          >
            {acaoLabel}
          </Button>
        )}
        {anterior && !item.cancelado && (
          <Button type="button" size="sm" variant="ghost" disabled={salvando} onClick={() => onStatus(anterior)}>
            Voltar
          </Button>
        )}
        <span className={`text-[11px] ${bloqueado ? "text-orange-600" : "text-muted-foreground"}`}>
          {bloqueado ? COMPRA_BLOQUEIO_MENSAGEM : COMPRA_STATUS_MENSAGEM[status]}
        </span>
      </div>
    </div>
  );
}

function Stage({
  title,
  icon,
  done,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-card border border-border/60 p-5">
      <h2 className="text-sm font-medium text-primary flex items-center gap-2 mb-3">
        {icon} {title}
        <span className={`ml-auto text-xs ${done ? "text-emerald-600" : "text-muted-foreground"}`}>
          {done ? "✔ concluída" : "pendente"}
        </span>
      </h2>
      <SectionBoundary label={title}>{children}</SectionBoundary>
    </section>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  onBlur,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="h-9"
      />
    </div>
  );
}

/** Área recolhível de histórico: itens já comprados/produzidos. */
function Concluidos({
  titulo,
  total,
  children,
}: {
  titulo: string;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
      <summary className="cursor-pointer text-xs uppercase tracking-wider text-muted-foreground">
        {titulo} ({total})
      </summary>
      <div className="mt-3 space-y-3">{children}</div>
    </details>
  );
}
