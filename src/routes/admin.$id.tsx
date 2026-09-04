import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { MODALIDADES, kitsForModalidadeLabel, fmtPreco } from "@/data/kits";
import {
  emptyKit,
  kitLabels,
  computePricing,
  buildEnderecoCompleto,
  countItensPendentes,
  BALAO_OPTIONS,
  HORARIO_AVISO,
  type StoredOrder,
  type ContractDetails,
  type KitChecklist,
} from "@/lib/orders-storage";
import { updateOrderOnSheet, fetchOrdersFromSheet, fetchOrderByIdPublic } from "@/lib/sheets-api";
import { mergePlanejamento } from "@/lib/planejamento-sync";
import {
  parseItensComprar,
  stringifyItensComprar,
  parseItensProduzir,
  stringifyItensProduzir,
  garantirMateriais,
  seedCatalogo,
} from "@/lib/materiais-catalogo";
import { sincronizarItensContrato, getOrdensLocal, compraStatusOf } from "@/lib/producao-api";
import { mudarEtapaCompra } from "@/lib/compras-flow";
import { ItensComprarEditor } from "@/components/itens-comprar-editor";
import { ItensProduzirEditor } from "@/components/itens-produzir-editor";
import { BoletoParcelas } from "@/components/boleto-parcelas";

import { getOrderFromSheet } from "@/lib/orders-cache";
import { getContractPaymentStatus } from "@/lib/pagamentos";
import { fetchLancamentos, createLancamento, parseValor, fmtBRL, type Lancamento } from "@/lib/financeiro-api";
import {
  CATEGORY_LABELS, CATEGORY_ORDER, getExclusiveConfig, getConflictsByItem,
  parseSelected, stringifySelected, type ExclusiveItem, type SelectedExclusive,
} from "@/lib/exclusive-items";
import { ArrowLeft, Save, Calendar, DollarSign, Package, FileText, ClipboardList, Image as ImageIcon, Upload, X, AlertTriangle, Lock, Factory, ShoppingCart, Hammer } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/lhl-logo.png";

export const Route = createFileRoute("/admin/$id")({
  component: ManageContract,
  head: () => ({
    meta: [{ title: "Gerenciar Contrato — LHL Festas" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Dancing+Script:wght@500;600;700&family=Karla:wght@300;400;500;600&display=swap" },
    ],
  }),
});

const emptyDetails: ContractDetails = {
  dataEvento: "",
  dataRetirada: "",
  horaRetirada: "",
  dataDevolucao: "",
  horaDevolucao: "",
  nomeAniversariante: "",
  idadeAniversariante: "",
  tipoFesta: "",
  valorTotal: "",
  valorSinal: "",
  valorRestante: "",
  valorCaucao: "50",
  kit: { ...emptyKit },
  balaoTipo: "",
  demaisPecas: "",
  observacoes: "",
  origemCliente: "",
  veioAnuncio: "Não",
  pagamentoFinalizado: "Não",
  devolucaoConfirmada: "Não",
  ativo: "Sim",
  observacoesInternas: "",
  sinalRecebido: "Não",
  pagamentoFinalRecebido: "Não",
  caucaoDevolvida: "Não",
  dataPagamentoFinal: "",
  dataDevolucaoCaucao: "",
  clienteRecorrente: "Não",
  aceiteContrato: "",
  dataHoraAceite: "",
  fotoDecoracaoUrl: "",
  checklistMontado: "Não",
  kitSeparado: "Não",
  caucaoRecebida: "Não",
  rua: "",
  numero: "",
  bairro: "",
  cidade: "",
  cep: "",
  itensExclusivos: "",
  itensComprar: "",
  itensProduzir: "",
  servicoMontagem: "Não",
};

type ClientFields = {
  nome: string; cpf: string; telefone: string; email: string;
  tema: string; modalidade: string; plano: string;
};

const emptyClient: ClientFields = {
  nome: "", cpf: "", telefone: "", email: "",
  tema: "", modalidade: "", plano: "",
};

function ManageContract() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [client, setClient] = useState<ClientFields>(emptyClient);
  const [details, setDetails] = useState<ContractDetails>(emptyDetails);
  const [initialDetails, setInitialDetails] = useState<ContractDetails>(emptyDetails);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  type FluxoAsk = { tipo: "sinal" | "final" | "caucaoRec" | "caucaoDev"; valor: number };
  const [askQueue, setAskQueue] = useState<FluxoAsk[]>([]);
  const askFluxo = askQueue[0] ?? null;
  const [existingLancIds, setExistingLancIds] = useState<Set<string>>(new Set());
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [allOrders, setAllOrders] = useState<StoredOrder[]>([]);
  const [excCatalog, setExcCatalog] = useState<ExclusiveItem[]>([]);

  useEffect(() => {
    setExcCatalog(getExclusiveConfig());
    // Catálogo Inteligente: aproveita os materiais já usados nas OPs existentes.
    try {
      seedCatalogo(
        getOrdensLocal().flatMap((o) => (o.compras || []).map((c) => c.descricao)),
      );
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    // Uma única leitura de contratos atende tanto a tela atual quanto as listas auxiliares.
    // Financeiro carrega em paralelo para não bloquear a abertura do formulário.
    const ordersPromise = fetchOrdersFromSheet();
    ordersPromise.then(setAllOrders).catch(() => { /* ignore */ });
    fetchLancamentos()
      .then((ls) => {
        setLancamentos(ls);
        setExistingLancIds(new Set(ls.map((l) => `${l.contratoId}|${l.origem}`)));
      })
      .catch(() => { /* ignore */ });
    ordersPromise
      .then((orders) => orders.find((item) => item.id === id))
      .then((o) => {
        if (o) {
          setOrder(o);
          // Se o registro antigo não tem rua/número/bairro, tentamos decompor a partir do endereço.
          const d = o.details ?? emptyDetails;
          const migrated: ContractDetails = { ...emptyDetails, ...d };
          if (!migrated.rua && !migrated.bairro && !migrated.cidade && o.endereco) {
            migrated.rua = o.endereco;
          }
          if (!migrated.cidade && o.cidadeUf) migrated.cidade = o.cidadeUf;
          setDetails(migrated);
          setInitialDetails(migrated);
          setClient({
            nome: o.nome ?? "", cpf: o.cpf ?? "",
            telefone: o.telefone ?? "", email: o.email ?? "",
            tema: o.tema ?? "", modalidade: o.modalidade ?? "", plano: o.plano ?? "",
          });
        }
      })
      .finally(() => setLoaded(true));
  }, [id]);

  const set = <K extends keyof ContractDetails>(k: K, v: ContractDetails[K]) =>
    setDetails((d) => ({ ...d, [k]: v }));
  const setC = <K extends keyof ClientFields>(k: K, v: ClientFields[K]) =>
    setClient((c) => ({ ...c, [k]: v }));

  const setKitQty = (k: keyof KitChecklist, qty: number) =>
    setDetails((d) => ({ ...d, kit: { ...d.kit, [k]: Math.max(0, qty) } }));
  const toggleKit = (k: keyof KitChecklist, checked: boolean) =>
    setDetails((d) => ({ ...d, kit: { ...d.kit, [k]: checked ? (d.kit[k] || 1) : 0 } }));

  const enderecoCompleto = useMemo(
    () => buildEnderecoCompleto(details),
    [details.rua, details.numero, details.bairro, details.cidade, details.cep], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const itensPendentesCount = countItensPendentes(details.observacoesInternas);

  const persist = async (waitForOperationalSync = true): Promise<boolean> => {
    if (!order) return false;
    setSaving(true);
    try {
      // ANTI-PERDA: itens de planejamento cadastrados depois que esta tela abriu
      // (em outro aparelho/tela) são preservados. Exclusões feitas aqui valem.
      let itensComprarFinal = details.itensComprar;
      let itensProduzirFinal = details.itensProduzir;
      try {
        const fresco = await fetchOrderByIdPublic(order.id);
        if (fresco?.details) {
          itensComprarFinal = stringifyItensComprar(
            mergePlanejamento(
              parseItensComprar(initialDetails.itensComprar),
              parseItensComprar(details.itensComprar),
              parseItensComprar(fresco.details.itensComprar),
            ),
          );
          itensProduzirFinal = stringifyItensProduzir(
            mergePlanejamento(
              parseItensProduzir(initialDetails.itensProduzir),
              parseItensProduzir(details.itensProduzir),
              parseItensProduzir(fresco.details.itensProduzir),
            ),
          );
        }
      } catch {
        /* planilha indisponível: segue com o que a tela tem */
      }
      await updateOrderOnSheet({
        id: order.id,
        createdAt: order.createdAt,
        status: order.status,
        nomeCompleto: client.nome,
        cpf: client.cpf,
        rg: "",
        telefone: client.telefone,
        email: client.email,
        endereco: enderecoCompleto,
        cidadeUf: details.cidade,
        tema: client.tema,
        modalidade: client.modalidade,
        plano: client.plano,
        dataEvento: details.dataEvento,
        dataRetirada: details.dataRetirada,
        horaRetirada: "",
        dataDevolucao: details.dataDevolucao,
        horaDevolucao: "",
        nomeAniversariante: details.nomeAniversariante,
        idadeAniversariante: details.idadeAniversariante,
        tipoFesta: details.tipoFesta,
        valorTotal: details.valorTotal,
        valorSinal: details.valorSinal,
        valorRestante: details.valorRestante,
        caucao: details.valorCaucao,
        demaisPecas: details.demaisPecas,
        observacoes: details.observacoes,
        kitJson: JSON.stringify(details.kit),
        veioAnuncio: details.veioAnuncio,
        observacoesInternas: details.observacoesInternas,
        sinalRecebido: details.sinalRecebido,
        pagamentoFinalRecebido: details.pagamentoFinalRecebido,
        caucaoDevolvida: details.caucaoDevolvida,
        dataPagamentoFinal: details.dataPagamentoFinal,
        dataDevolucaoCaucao: details.dataDevolucaoCaucao,
        aceiteContrato: details.aceiteContrato,
        dataHoraAceite: details.dataHoraAceite,
        fotoDecoracaoUrl: details.fotoDecoracaoUrl,
        checklistMontado: details.checklistMontado,
        kitSeparado: details.kitSeparado,
        caucaoRecebida: details.caucaoRecebida,
        rua: details.rua,
        numero: details.numero,
        bairro: details.bairro,
        cidade: details.cidade,
        cep: details.cep,
        balaoTipo: details.balaoTipo,
        servicoMontagem: details.servicoMontagem,
        itensExclusivos: details.itensExclusivos,
        itensComprar: itensComprarFinal,
        itensProduzir: itensProduzirFinal,
      });
      const detailsFinal: ContractDetails = {
        ...details,
        itensComprar: itensComprarFinal,
        itensProduzir: itensProduzirFinal,
      };
      const updated: StoredOrder = {
        ...order,
        nome: client.nome,
        cpf: client.cpf,
        rg: "",
        telefone: client.telefone,
        email: client.email,
        endereco: enderecoCompleto,
        cidadeUf: details.cidade,
        tema: client.tema,
        modalidade: client.modalidade,
        plano: client.plano,
        details: detailsFinal,
      };
      setDetails(detailsFinal);
      setOrder(updated);
      try {
        const KEY = "lhl_sheet_orders_cache";
        const raw = sessionStorage.getItem(KEY);
        const arr: StoredOrder[] = raw ? JSON.parse(raw) : [];
        const idx = arr.findIndex((o) => o.id === order.id);
        if (idx >= 0) arr[idx] = updated; else arr.unshift(updated);
        sessionStorage.setItem(KEY, JSON.stringify(arr));
      } catch { /* ignore */ }

      const queue: FluxoAsk[] = [];
      const sinalNow = details.sinalRecebido === "Sim" && initialDetails.sinalRecebido !== "Sim";
      const finalNow = details.pagamentoFinalRecebido === "Sim" && initialDetails.pagamentoFinalRecebido !== "Sim";
      const caucaoRecNow = details.caucaoRecebida === "Sim" && initialDetails.caucaoRecebida !== "Sim";
      const caucaoDevNow = details.caucaoDevolvida === "Sim" && initialDetails.caucaoDevolvida !== "Sim";
      if (sinalNow && !existingLancIds.has(`${order.id}|sinalRecebido`))
        queue.push({ tipo: "sinal", valor: parseValor(details.valorSinal) });
      if (finalNow && !existingLancIds.has(`${order.id}|pagamentoFinal`)) {
        const restante = Math.max(parseValor(details.valorTotal) - parseValor(details.valorSinal), 0);
        queue.push({ tipo: "final", valor: restante });
      }
      if (caucaoRecNow && !existingLancIds.has(`${order.id}|caucaoRecebida`))
        queue.push({ tipo: "caucaoRec", valor: parseValor(details.valorCaucao) });
      if (caucaoDevNow && !existingLancIds.has(`${order.id}|caucaoDevolvida`))
        queue.push({ tipo: "caucaoDev", valor: parseValor(details.valorCaucao) });
      if (queue.length) setAskQueue((prev) => [...prev, ...queue]);
      setInitialDetails(detailsFinal);

      // O contrato já foi persistido acima. A sincronização operacional pode
      // continuar em segundo plano no botão Salvar, sem remover as proteções anti-perda.
      const syncPlanejamento = async () => {
        // Planejamento (Comprar/Produzir) → Ordem de Produção (idempotente).
        try {
          garantirMateriais([
            ...parseItensComprar(itensComprarFinal).map((i) => i.nome),
            ...parseItensProduzir(itensProduzirFinal).map((i) => i.nome),
          ]);
          const res = await sincronizarItensContrato(updated);
          if (res) {
            const partes: string[] = [];
            if (res.criados) partes.push(`${res.criados} compra(s) enviada(s)`);
            if (res.producaoCriados) partes.push(`${res.producaoCriados} produção(ões) criada(s)`);
            if (res.atualizados) partes.push(`${res.atualizados} atualizado(s)`);
            if (res.removidos + res.producaoRemovidos)
              partes.push(`${res.removidos + res.producaoRemovidos} removido(s)`);
            if (partes.length) toast.success(`Ordem de Produção sincronizada: ${partes.join(", ")}.`);

            // Itens salvos com "enviar para aprovação" avançam pelo fluxo único.
            if (res.op && res.enviarAprovacao.length) {
              let opAtual = res.op;
              let enviados = 0;
              for (const itemId of res.enviarAprovacao) {
                const item = opAtual.compras.find((c) => c.id === itemId);
                if (!item || compraStatusOf(item) !== "Aguardando orçamento") continue;
                try {
                  const r = await mudarEtapaCompra({
                    op: opAtual,
                    itemId,
                    status: "Aguardando autorização",
                    order: updated,
                  });
                  opAtual = r.op;
                  enviados++;
                } catch { /* segue com os demais */ }
              }
              if (enviados)
                toast.success(
                  `${enviados} item(ns) enviado(s) para aprovação — Solicitação Financeira criada.`,
                );
            }
          }
        } catch {
          toast.error(
            "Planejamento salvo no contrato, mas a Ordem de Produção não sincronizou. Salve novamente para tentar de novo — nada será duplicado.",
          );
        }
      };
      const syncPromise = syncPlanejamento();
      if (waitForOperationalSync) await syncPromise;
      else void syncPromise;

      return true;
    } catch {
      toast.error("Falha ao salvar na planilha.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const askMeta = (a: FluxoAsk) => {
    switch (a.tipo) {
      case "sinal": return { label: "Sinal", categoria: "Sinal", origem: "sinalRecebido", tipo: "Entrada" as const };
      case "final": return { label: "Pagamento Final", categoria: "Pagamento Final", origem: "pagamentoFinal", tipo: "Entrada" as const };
      case "caucaoRec": return { label: "Caução Recebida", categoria: "Caução Recebida", origem: "caucaoRecebida", tipo: "Entrada" as const };
      case "caucaoDev": return { label: "Devolução de Caução", categoria: "Caução Devolvida", origem: "caucaoDevolvida", tipo: "Saída" as const };
    }
  };

  async function confirmarLancamento() {
    if (!askFluxo || !order) return;
    const meta = askMeta(askFluxo);
    const descPrefix = askFluxo.tipo === "caucaoDev" ? "Devolução de Caução" : meta.label;
    const l: Lancamento = {
      id: crypto.randomUUID(),
      data: new Date().toISOString().slice(0, 10),
      tipo: meta.tipo,
      categoria: meta.categoria,
      descricao: `${descPrefix} - ${client.nome || order.nome} - ${client.tema || order.tema || ""}`.trim(),
      valor: askFluxo.valor,
      formaPagamento: "PIX",
      conta: "PIX",
      beneficiario: "",
      observacoes: "",
      contratoId: order.id,
      origem: meta.origem,
      createdAt: new Date().toISOString(),
      ativo: "Sim",
    };
    try {
      await createLancamento(l);
      setExistingLancIds((prev) => new Set(prev).add(`${order.id}|${meta.origem}`));
      // Atualização imediata do resumo financeiro (mesma regra central).
      setLancamentos((prev) => [...prev, l]);
      toast.success(`${meta.tipo === "Entrada" ? "Entrada" : "Saída"} registrada no Fluxo de Caixa.`);
    } catch {
      toast.error("Falha ao registrar no Fluxo de Caixa.");
    } finally {
      setAskQueue((prev) => prev.slice(1));
    }
  }

  const onSaveOnly = async (e: FormEvent) => {
    e.preventDefault();
    // No salvamento simples, libera a interface assim que o contrato foi
    // confirmado na fonte oficial; a OP sincroniza em segundo plano.
    const ok = await persist(false);
    if (ok) toast.success("Alterações salvas com sucesso!");
  };

  const onGenerateContract = async () => {
    if (!order) return;
    const ok = await persist();
    if (ok) navigate({ to: "/contract/$id", params: { id: order.id } });
  };

  const onGenerateChecklist = async () => {
    if (!order) return;
    const ok = await persist();
    if (ok) navigate({ to: "/checklist/$id", params: { id: order.id } });
  };

  /** Abre a Ordem de Produção do contrato — cria automaticamente se não existir. */
  const onOrdemProducao = async () => {
    if (!order) return;
    const ok = await persist();
    if (ok) navigate({ to: "/admin/producao/$id", params: { id: order.id } });
  };

  if (!loaded) return null;

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-6 text-center">
        <p className="font-serif text-2xl text-primary">Contrato não encontrado</p>
        <Button asChild variant="ghost"><Link to="/admin"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao painel</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" richColors />

      <header className="border-b border-border/60 bg-card/50 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link to="/admin" className="flex items-center gap-3">
            <img src={logo} alt="LHL Festas" className="w-12 sm:w-14" />
            <div className="hidden sm:block">
              <p className="font-serif text-xl text-primary leading-none">LHL Festas</p>
              <p className="text-xs text-muted-foreground mt-0.5">Complementação de Contrato</p>
            </div>
          </Link>
          <Button asChild variant="ghost" className="text-muted-foreground hover:text-primary">
            <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        <h1 className="font-serif text-3xl sm:text-4xl text-primary mb-2">Complementar Contrato</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Confira os dados enviados pelo cliente e complete as informações da loja.
        </p>

        <form onSubmit={onSaveOnly} className="space-y-8">
          <Section title="Dados do Contratante" subtitle="Todos os campos podem ser editados">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nome Completo">
                <Input value={client.nome} onChange={(e) => setC("nome", e.target.value)} />
              </Field>
              <Field label="CPF">
                <Input value={client.cpf} onChange={(e) => setC("cpf", e.target.value)} />
              </Field>
              <Field label="Telefone">
                <Input value={client.telefone} onChange={(e) => setC("telefone", e.target.value)} />
              </Field>
              <Field label="E-mail">
                <Input type="email" value={client.email} onChange={(e) => setC("email", e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Rua">
                  <Input value={details.rua} onChange={(e) => set("rua", e.target.value)} />
                </Field>
              </div>
              <Field label="Número">
                <Input value={details.numero} onChange={(e) => set("numero", e.target.value)} />
              </Field>
              <Field label="Bairro">
                <Input value={details.bairro} onChange={(e) => set("bairro", e.target.value)} />
              </Field>
              <Field label="Cidade">
                <Input value={details.cidade} onChange={(e) => set("cidade", e.target.value)} />
              </Field>
              <Field label="CEP">
                <Input value={details.cep} onChange={(e) => set("cep", e.target.value)} />
              </Field>
              <div className="sm:col-span-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Endereço completo (uso interno)</p>
                <p className="text-sm text-foreground mt-0.5">{enderecoCompleto || "—"}</p>
              </div>
            </div>
          </Section>

          <Section title="Dados da Festa" icon={<Package className="h-4 w-4 text-gold" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Tema">
                  <Input value={client.tema} onChange={(e) => setC("tema", e.target.value)} />
                </Field>
              </div>
              <Field label="Modalidade">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={client.modalidade}
                  onChange={(e) => {
                    const mod = e.target.value;
                    setC("modalidade", mod);
                    setC("plano", "");
                    if (mod === "Festa com Montagem") {
                      set("servicoMontagem", "Sim");
                      set("valorCaucao", "0");
                      toast.info("Festa com Montagem: caução isenta.");
                    }
                  }}
                >
                  <option value="">—</option>
                  {MODALIDADES.map((m) => (
                    <option key={m.id} value={m.label}>{m.label}</option>
                  ))}
                  {client.modalidade &&
                  !MODALIDADES.some((m) => m.label === client.modalidade) ? (
                    <option value={client.modalidade}>{client.modalidade} (legado)</option>
                  ) : null}
                </select>
              </Field>
              <Field label="Kit">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={client.plano}
                  onChange={(e) => {
                    const plano = e.target.value;
                    setC("plano", plano);
                    if (plano === "Personalizado com Montagem") {
                      set("servicoMontagem", "Sim");
                      set("valorCaucao", "0");
                      toast.info("Kit Personalizado com Montagem: caução dispensada.");
                    }
                  }}
                >
                  <option value="">—</option>
                  {kitsForModalidadeLabel(client.modalidade).map((k) => (
                    <option key={k.id} value={k.nome}>
                      {k.nome}
                    </option>
                  ))}
                  {client.plano &&
                  !kitsForModalidadeLabel(client.modalidade).some((k) => k.nome === client.plano) ? (
                    <option value={client.plano}>{client.plano} (legado)</option>
                  ) : null}
                </select>
              </Field>

              <Field label="Tipo da Festa">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={details.tipoFesta}
                  onChange={(e) => set("tipoFesta", e.target.value)}
                >
                  <option value="">—</option>
                  {["Aniversário","Chá de Bebê","Chá Bar","Chá Revelação","Batizado","Casamento","Noivado","Corporativo","Outro"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Nome do Aniversariante">
                <Input value={details.nomeAniversariante} onChange={(e) => set("nomeAniversariante", e.target.value)} placeholder="Ex: Ana Beatriz" />
              </Field>
              <Field label="Idade do Aniversariante">
                <Input value={details.idadeAniversariante} onChange={(e) => set("idadeAniversariante", e.target.value)} placeholder="Ex: 9 anos" />
              </Field>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Serviço de Montagem">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={details.servicoMontagem || "Não"}
                  onChange={(e) => {
                    const v = e.target.value;
                    set("servicoMontagem", v);
                    if (v === "Sim") {
                      set("valorCaucao", "0");
                      toast.info("Serviço com montagem: caução dispensada.");
                    }
                  }}
                >
                  <option value="Não">Não (Retirada em loja)</option>
                  <option value="Sim">Sim (LHL Festas monta)</option>
                </select>
              </Field>
            </div>
          </Section>

          <Section title="Datas do Evento" icon={<Calendar className="h-4 w-4 text-gold" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Data do Evento">
                <Input type="date" value={details.dataEvento} onChange={(e) => set("dataEvento", e.target.value)} required />
              </Field>
              <div />
              <Field label="Data de Retirada">
                <Input type="date" value={details.dataRetirada} onChange={(e) => set("dataRetirada", e.target.value)} />
              </Field>
              <Field label="Data de Devolução">
                <Input type="date" value={details.dataDevolucao} onChange={(e) => set("dataDevolucao", e.target.value)} />
              </Field>
            </div>
            <p className="mt-3 text-xs italic text-muted-foreground bg-accent/30 border border-border/50 rounded-xl px-4 py-2.5">
              {HORARIO_AVISO}
            </p>
          </Section>

          <Section title="Financeiro" icon={<DollarSign className="h-4 w-4 text-gold" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Valor Total (R$)">
                <Input
                  type="text"
                  value={details.valorTotal}
                  onChange={(e) => {
                    const val = e.target.value;
                    set("valorTotal", val);
                  }}
                  placeholder="0,00"
                />
              </Field>
              <Field label="Valor do Sinal (R$)">
                <Input
                  type="text"
                  value={details.valorSinal}
                  onChange={(e) => set("valorSinal", e.target.value)}
                  placeholder="0,00"
                />
              </Field>
              <Field label="Valor Restante (R$)">
                <Input
                  type="text"
                  value={details.valorRestante}
                  onChange={(e) => set("valorRestante", e.target.value)}
                  placeholder="0,00"
                />
              </Field>
              <Field label="Valor do Caução (R$)">
                <Input
                  type="text"
                  value={details.valorCaucao}
                  onChange={(e) => set("valorCaucao", e.target.value)}
                  placeholder="0,00"
                  className={details.servicoMontagem === "Sim" ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-bold" : ""}
                />
              </Field>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-primary/50 text-primary hover:bg-primary/5"
                onClick={() => {
                  const p = computePricing(client.modalidade, client.plano);
                  if (p.total <= 0) {
                    toast.error("Selecione a modalidade e o plano para recalcular.");
                    return;
                  }
                  setDetails((d) => ({
                    ...d,
                    valorTotal: String(p.total),
                    valorSinal: String(p.sinal),
                    valorRestante: String(p.restante),
                    valorCaucao: String(p.caucao),
                  }));
                  toast.success("Valores recalculados (sinal de 50%).");
                }}
              >
                Recalcular valores (sinal 50%)
              </Button>
              <p className="text-xs italic text-muted-foreground">
                O sinal da LHL Festas é sempre <strong>50%</strong> do valor total.
              </p>
            </div>
          </Section>

          <Section title="Controle Administrativo" icon={<FileText className="h-4 w-4 text-gold" />}>
            <div className="mb-4 flex flex-col gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="servicoMontagem"
                  checked={details.servicoMontagem === "Sim"}
                  onCheckedChange={(checked) => {
                    const isSim = checked === true;
                    set("servicoMontagem", isSim ? "Sim" : "Não");
                    if (isSim) {
                      set("valorCaucao", "0");
                      toast.info("Serviço de Montagem: Caução dispensada.");
                    } else {
                      // Restaura caução baseada no kit ou padrão
                      set("valorCaucao", "50");
                    }
                  }}
                />
                <Label htmlFor="servicoMontagem" className="text-sm font-medium cursor-pointer">
                  Inclui Serviço de Montagem LHL (Isento de Caução)
                </Label>
              </div>
              
              {details.servicoMontagem === "Sim" && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-emerald-700 leading-tight">
                    <strong>Regra de Isenção:</strong> A montagem pela LHL Festas elimina a necessidade de caução, pois o acervo permanece sob nossa guarda direta.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Veio de anúncio?">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={details.veioAnuncio}
                  onChange={(e) => set("veioAnuncio", e.target.value)}
                >
                  <option value="Não">Não</option>
                  <option value="Sim">Sim</option>
                </select>
              </Field>
              <Field label="Sinal Recebido?">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={details.sinalRecebido}
                  onChange={(e) => set("sinalRecebido", e.target.value)}
                >
                  <option value="Não">Não</option>
                  <option value="Sim">Sim</option>
                </select>
              </Field>
              <Field label="Pagamento Final Recebido?">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={details.pagamentoFinalRecebido}
                  onChange={(e) => set("pagamentoFinalRecebido", e.target.value)}
                >
                  <option value="Não">Não</option>
                  <option value="Sim">Sim</option>
                </select>
              </Field>
              <Field label="Data do Pagamento Final">
                <Input type="date" value={details.dataPagamentoFinal} onChange={(e) => set("dataPagamentoFinal", e.target.value)} />
              </Field>
              <Field label="Caução Recebida?">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={details.caucaoRecebida}
                  onChange={(e) => set("caucaoRecebida", e.target.value)}
                >
                  <option value="Não">Não</option>
                  <option value="Sim">Sim</option>
                </select>
              </Field>
              <Field label="Caução Devolvida? (encerra o contrato)">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={details.caucaoDevolvida}
                  onChange={(e) => set("caucaoDevolvida", e.target.value)}
                >
                  <option value="Não">Não</option>
                  <option value="Sim">Sim</option>
                </select>
              </Field>
              <Field label="Data da Devolução da Caução">
                <Input type="date" value={details.dataDevolucaoCaucao} onChange={(e) => set("dataDevolucaoCaucao", e.target.value)} />
              </Field>
              <Field label="Devolução Confirmada?">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={details.devolucaoConfirmada || "Não"}
                  onChange={(e) => set("devolucaoConfirmada", e.target.value)}
                >
                  <option value="Não">Não</option>
                  <option value="Sim">Sim</option>
                </select>
              </Field>
            </div>
            <p className="mt-3 text-xs italic text-muted-foreground">
              O contrato permanece ativo enquanto <strong>Caução Devolvida = Não</strong>. Ao marcar
              como <strong>Sim</strong>, o contrato é considerado encerrado automaticamente.
            </p>
            {(() => {
              // Regra central: recebimentos confirmados no Fluxo de Caixa (sem caução).
              const pag = getContractPaymentStatus(
                order ? { ...order, details } : null,
                lancamentos,
              );
              const recebido = pag.totalRecebido;
              const pendente = pag.saldoReceber;
              const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
              return (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border/60 bg-background/50 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor Recebido</p>
                    <p className="font-serif text-2xl text-primary mt-1">{fmt(recebido)}</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/50 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saldo Pendente</p>
                    <p className={`font-serif text-2xl mt-1 ${pendente > 0 ? "text-destructive" : "text-primary"}`}>{fmt(pendente)}</p>
                    <p className="text-[11px] mt-1 text-muted-foreground">
                      Status: <strong>{pag.status === "Quitado" ? "Pago / Quitado" : pag.status}</strong>
                    </p>
                  </div>
                </div>
              );
            })()}
            {order && (() => {
              const pagBoleto = getContractPaymentStatus({ ...order, details }, lancamentos);
              return (
                <BoletoParcelas
                  contratoId={order.id}
                  cliente={client.nome}
                  saldoPendente={pagBoleto.saldoReceber}
                  dataEvento={details.dataEvento}
                  onPagamentoRegistrado={() => {
                    fetchLancamentos({ force: true })
                      .then((ls) => {
                        setLancamentos(ls);
                        setExistingLancIds(new Set(ls.map((l) => `${l.contratoId}|${l.origem}`)));
                      })
                      .catch(() => {});
                  }}
                />
              );
            })()}
            <div className="mt-6">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                Itens Pendentes {itensPendentesCount > 0 && (
                  <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-semibold">
                    {itensPendentesCount}
                  </span>
                )}
              </Label>
              <Textarea
                className="mt-2"
                value={details.observacoesInternas}
                onChange={(e) => set("observacoesInternas", e.target.value)}
                placeholder={"Uma pendência por linha, ex.:\nComprar balão dourado\nSeparar bandeja extra"}
                rows={4}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Cada linha vira uma pendência contabilizada. Aparece destacado na Central da Josi.
              </p>
            </div>
          </Section>

          <Section title="Checklist do Kit" icon={<Package className="h-4 w-4 text-gold" />}>
            <p className="text-xs text-muted-foreground mb-3">
              Marque os itens inclusos e informe a quantidade de cada um.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(kitLabels) as (keyof KitChecklist)[])
                .filter((k) => k !== "baloes")
                .map((k) => {
                  const qty = details.kit[k] || 0;
                  const checked = qty > 0;
                  return (
                    <div
                      key={k}
                      className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3"
                    >
                      <Checkbox
                        id={`kit-${k}`}
                        checked={checked}
                        onCheckedChange={(v) => toggleKit(k, v === true)}
                      />
                      <label htmlFor={`kit-${k}`} className="text-sm text-foreground flex-1 cursor-pointer">{kitLabels[k]}</label>
                      <Input
                        type="number"
                        min={0}
                        value={qty || ""}
                        onChange={(e) => setKitQty(k, Number(e.target.value) || 0)}
                        placeholder="Qtd"
                        className="w-20 h-9 text-center"
                        disabled={!checked}
                      />
                    </div>
                  );
                })}
            </div>
            
            <div className="space-y-3 pt-4 border-t mt-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Balões (Multi-seleção)</Label>
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Selecione todas as modalidades</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 border border-border/60 rounded-xl p-4 bg-background/50">
                {BALAO_OPTIONS.map((opt) => {
                  const selectedList = (details.balaoTipo || "").split(", ").filter(Boolean);
                  const isSelected = selectedList.includes(opt);
                  return (
                    <div key={opt} className="flex items-center space-x-3 group">
                      <Checkbox
                        id={`balao-${opt}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          const isNowSelected = checked === true;
                          let next;
                          if (isNowSelected) {
                            next = [...selectedList, opt];
                          } else {
                            next = selectedList.filter(s => s !== opt);
                          }
                          set("balaoTipo", next.join(", "));
                        }}
                      />
                      <label
                        htmlFor={`balao-${opt}`}
                        className="text-sm font-medium leading-none cursor-pointer group-hover:text-primary transition-colors"
                      >
                        {opt}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t mt-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Isenção de Caução</Label>
              </div>
              <div className="flex items-center space-x-3 border border-border/60 rounded-xl p-4 bg-background/50">
                <Checkbox 
                  id="servicoMontagem2"
                  checked={details.servicoMontagem === "Sim"}
                  onCheckedChange={(checked) => {
                    const isSim = checked === true;
                    set("servicoMontagem", isSim ? "Sim" : "Não");
                    if (isSim) {
                      set("valorCaucao", "0");
                      toast.info("Serviço de Montagem: Caução dispensada.");
                    } else {
                      set("valorCaucao", "50");
                    }
                  }}
                />
                <div className="space-y-1">
                  <label htmlFor="servicoMontagem2" className="text-sm font-medium leading-none cursor-pointer">Serviço de Montagem LHL Festas</label>
                  <p className="text-[10px] text-muted-foreground">
                    Ao marcar esta opção, o contrato é isento de caução no checklist e o valor de caução em "Itens Pendentes" é ignorado.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Demais peças</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                Uma por linha no formato <span className="font-mono">nome: quantidade</span>. Ex.: <span className="font-mono">Porta-retrato com foto: 1</span>
              </p>
              <Textarea
                value={details.demaisPecas}
                onChange={(e) => set("demaisPecas", e.target.value)}
                placeholder={"Porta-retrato com foto: 1\nMini boleira: 3\nPainel Redondo 1,50 Dourado: 1"}
                rows={4}
              />
            </div>
          </Section>

          <Section
            title="Itens a Comprar"
            subtitle="Registre tudo que precisará ser comprado para esta festa. Se o preço já é conhecido, informe Fornecedor e Valor Orçado e escolha “Salvar e enviar para aprovação” — a Solicitação Financeira nasce automaticamente."
            icon={<ShoppingCart className="h-4 w-4 text-gold" />}
          >
            <ItensComprarEditor
              itens={parseItensComprar(details.itensComprar)}
              onChange={(list) => set("itensComprar", stringifyItensComprar(list))}
            />
          </Section>

          <Section
            title="Itens a Produzir"
            subtitle="Peças artesanais feitas pela própria LHL (painel, display, topo de bolo, aplique...). Ao salvar o contrato, cada item vai para a aba Produção da Ordem de Produção com status “Produção pendente”."
            icon={<Hammer className="h-4 w-4 text-gold" />}
          >
            <ItensProduzirEditor
              itens={parseItensProduzir(details.itensProduzir)}
              onChange={(list) => set("itensProduzir", stringifyItensProduzir(list))}
            />
          </Section>


          <Section
            title="Itens Exclusivos Reservados"
            subtitle="Equipamentos exclusivos separados para este contrato. O sistema bloqueia automaticamente itens já reservados por outro contrato ativo na mesma data."
            icon={<Lock className="h-4 w-4 text-gold" />}
          >
            <ExclusiveItemsSelector
              catalog={excCatalog}
              selected={parseSelected(details.itensExclusivos)}
              onChange={(list) => set("itensExclusivos", stringifySelected(list))}
              allOrders={allOrders}
              currentContractId={order.id}
              dataEventoISO={details.dataEvento}
            />
          </Section>


          <Section title="Foto da Decoração Escolhida" icon={<ImageIcon className="h-4 w-4 text-gold" />}>
            <PhotoDecoracao
              url={details.fotoDecoracaoUrl}
              onChange={(u) => set("fotoDecoracaoUrl", u)}
              contratoId={order.id}
            />
          </Section>

          <Section title="Observações" icon={<FileText className="h-4 w-4 text-gold" />}>
            <Textarea
              value={details.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
              placeholder="Anotações gerais, avarias prévias, combinados especiais..."
              rows={5}
            />
          </Section>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto h-12 px-8 rounded-full bg-[image:var(--gradient-elegant)] text-primary-foreground border-0 hover:opacity-95"
            >
              <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
            <Button
              type="button"
              onClick={onGenerateContract}
              disabled={saving}
              variant="outline"
              className="w-full sm:w-auto h-12 px-8 rounded-full border-primary/50 text-primary hover:bg-primary/5"
            >
              <FileText className="h-4 w-4 mr-2" /> Gerar Contrato
            </Button>
            <Button
              type="button"
              onClick={onGenerateChecklist}
              disabled={saving}
              variant="outline"
              className="w-full sm:w-auto h-12 px-8 rounded-full border-primary/50 text-primary hover:bg-primary/5"
            >
              <ClipboardList className="h-4 w-4 mr-2" /> Gerar Checklist
            </Button>
            <Button
              type="button"
              onClick={onOrdemProducao}
              disabled={saving}
              variant="outline"
              className="w-full sm:w-auto h-12 px-8 rounded-full border-primary/50 text-primary hover:bg-primary/5"
            >
              <Factory className="h-4 w-4 mr-2" /> Ordem de Produção
            </Button>
          </div>
          <p className="text-xs text-muted-foreground italic">
            "Salvar Alterações" grava os dados sem alterar o status. "Gerar Contrato" salva e abre o contrato para impressão/PDF. "Gerar Checklist" gera o checklist de entrega em PDF. "Ordem de Produção" abre a OP desta reserva (criada automaticamente na primeira vez, sem duplicar).
          </p>
        </form>
      </main>

      <AlertDialog open={!!askFluxo} onOpenChange={(o) => !o && setAskQueue((prev) => prev.slice(1))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registrar no Fluxo de Caixa?</AlertDialogTitle>
            <AlertDialogDescription>
              {askFluxo && (() => {
                const meta = askMeta(askFluxo);
                const acao = meta.tipo === "Entrada" ? "entrada" : "saída";
                return `Deseja registrar esta ${acao} de ${fmtBRL(askFluxo.valor)} (${meta.label}) no Fluxo de Caixa?`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Agora não</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarLancamento} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Registrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Section({
  title, subtitle, icon, children,
}: { title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-card border border-border/60 p-5 sm:p-7 shadow-sm">
      <header className="mb-5">
        <h2 className="font-serif text-xl text-primary flex items-center gap-2">
          {icon} {title}
        </h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function ExclusiveItemsSelector({
  catalog, selected, onChange, allOrders, currentContractId, dataEventoISO,
}: {
  catalog: ExclusiveItem[];
  selected: SelectedExclusive[];
  onChange: (list: SelectedExclusive[]) => void;
  allOrders: StoredOrder[];
  currentContractId: string;
  dataEventoISO: string;
}) {
  const conflicts = useMemo(
    () => getConflictsByItem(allOrders, dataEventoISO, currentContractId),
    [allOrders, dataEventoISO, currentContractId],
  );
  const selectedMap = useMemo(() => {
    const m = new Map<string, SelectedExclusive>();
    for (const s of selected) m.set(s.itemId, s);
    return m;
  }, [selected]);

  const toggle = (item: ExclusiveItem, checked: boolean) => {
    const next = selected.filter((s) => s.itemId !== item.id);
    if (checked) next.push({ itemId: item.id });
    onChange(next);
  };
  const setSpec = (itemId: string, spec: string) => {
    onChange(selected.map((s) => (s.itemId === itemId ? { ...s, aComprarSpec: spec } : s)));
  };

  if (!dataEventoISO) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Preencha a data do evento para habilitar a reserva de itens exclusivos.
      </p>
    );
  }

  const byCat: Record<string, ExclusiveItem[]> = {};
  for (const it of catalog) (byCat[it.categoria] ||= []).push(it);

  return (
    <div className="space-y-4">
      {CATEGORY_ORDER.filter((c) => byCat[c]?.length).map((cat) => (
        <div key={cat}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            {CATEGORY_LABELS[cat]}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {byCat[cat].map((it) => {
              const conflictList = conflicts.get(it.id) ?? [];
              const usadoPorOutros = conflictList.length;
              const disponivel = Math.max(0, it.quantidade - usadoPorOutros);
              const sel = selectedMap.get(it.id);
              const isSelected = !!sel;
              const blocked = !isSelected && disponivel <= 0 && !it.aComprar;
              return (
                <div
                  key={it.id}
                  className={`flex flex-col gap-2 rounded-xl border px-3 py-2.5 ${
                    blocked ? "border-destructive/40 bg-destructive/5 opacity-70" :
                    isSelected ? "border-primary/60 bg-primary/5" :
                    "border-border/60 bg-card"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isSelected}
                      disabled={blocked}
                      onCheckedChange={(v) => toggle(it, v === true)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        {it.nome}
                        {it.aComprar ? <span className="ml-1 text-[10px] uppercase tracking-wider rounded bg-amber-100 text-amber-800 px-1.5 py-0.5">A comprar</span> : null}
                      </p>
                      {!it.aComprar && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Total: {it.quantidade} · Reservado: {usadoPorOutros} · Disponível: <span className={disponivel === 0 ? "text-destructive font-semibold" : "text-emerald-700 font-semibold"}>{disponivel}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  {blocked && conflictList.length > 0 && (
                    <p className="text-[11px] text-destructive">
                      Ocupado em {new Date(`${dataEventoISO}T00:00:00`).toLocaleDateString("pt-BR")} por: {conflictList.map((c) => c.clientName).join(", ")}
                    </p>
                  )}
                  {isSelected && it.aComprar && (
                    <Input
                      value={sel?.aComprarSpec ?? ""}
                      onChange={(e) => setSpec(it.id, e.target.value)}
                      placeholder={it.aComprarLabel ?? "Detalhes"}
                      className="h-9"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

const ACCEPTED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function PhotoDecoracao({
  url, onChange, contratoId,
}: { url: string; onChange: (u: string) => void; contratoId: string }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);

  async function handleFile(f: File) {
    if (!f) return;
    const mime = (f.type || "").toLowerCase();
    const nameExt = (f.name.split(".").pop() || "").toLowerCase();
    const extOk = ["jpg", "jpeg", "png", "webp"].includes(nameExt);
    if (!ACCEPTED_MIME.includes(mime) && !extOk) {
      toast.error("Formato inválido. Envie JPG, PNG ou WEBP.");
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      toast.error(`Arquivo muito grande (${(f.size / 1024 / 1024).toFixed(1)} MB). Limite: 5 MB.`);
      return;
    }
    setUploading(true);
    const toastId = toast.loading("Enviando imagem...");
    try {
      const ext = extOk ? nameExt : (mime.split("/")[1] || "jpg");
      const path = `${contratoId}/${Date.now()}.${ext}`;
      const contentType = mime || `image/${ext === "jpg" ? "jpeg" : ext}`;
      const { error } = await supabase.storage
        .from("contract-photos")
        .upload(path, f, { upsert: true, contentType, cacheControl: "3600" });
      if (error) throw error;
      const { data, error: e2 } = await supabase.storage
        .from("contract-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (e2 || !data?.signedUrl) throw e2 ?? new Error("Falha ao gerar URL da imagem.");
      onChange(data.signedUrl);
      toast.success("Foto enviada. Lembre-se de salvar as alterações.", { id: toastId });
    } catch (err: any) {
      console.error("[upload contract-photos]", err);
      const msg = err?.message || err?.error || "Erro desconhecido";
      toast.error(`Falha ao enviar a foto: ${msg}`, { id: toastId });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      {url ? (
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <button type="button" onClick={() => setPreview(true)} className="group relative">
            <img src={url} alt="Foto da decoração" className="w-40 h-40 object-contain bg-background/60 rounded-xl border border-border/60 shadow-sm" />
            <span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-xl transition-colors" />
          </button>
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">Clique na miniatura para ampliar. Fotos em qualquer proporção (quadrada, retrato ou paisagem) são exibidas sem corte.</p>
            <div className="flex gap-2">
              <label className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-primary/40 text-primary text-sm cursor-pointer hover:bg-primary/5">
                <Upload className="h-3.5 w-3.5" /> {uploading ? "Enviando imagem..." : "Trocar foto"}
                <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" disabled={uploading} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </label>
              <Button type="button" variant="outline" className="h-9 rounded-full text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive" onClick={() => onChange("")}>
                <X className="h-3.5 w-3.5 mr-1.5" /> Remover
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-2 h-40 rounded-xl border-2 border-dashed border-border/60 bg-background/50 text-sm text-muted-foreground cursor-pointer hover:border-primary/40 hover:text-primary transition-colors">
          <Upload className="h-5 w-5" />
          <span>{uploading ? "Enviando imagem..." : "Enviar foto da decoração (JPG, PNG ou WEBP · até 5 MB)"}</span>
          <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" disabled={uploading} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </label>
      )}
      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-w-4xl p-2">
          {url && <img src={url} alt="Foto ampliada" className="w-full h-auto max-h-[85vh] object-contain rounded" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
