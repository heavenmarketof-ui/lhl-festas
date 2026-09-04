import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { kitLabels, type StoredOrder, type KitChecklist } from "@/lib/orders-storage";
import { getOrderFromSheet } from "@/lib/orders-cache";
import { fetchLancamentos, type Lancamento } from "@/lib/financeiro-api";
import { getContractPaymentStatus } from "@/lib/pagamentos";
import { formatDateBR, formatDateTimeBR } from "@/lib/date-utils";
import { kitItemsFor } from "@/data/kits";
import { matchStructureModel, type StructureModel } from "@/lib/structure-models";
import { CATEGORY_LABELS, getExclusiveConfig, parseSelected, type ExclusiveItem } from "@/lib/exclusive-items";
import { ArrowLeft, Printer, Download, Loader2 } from "lucide-react";
import logo from "@/assets/lhl-logo.png";
import { downloadElementPdf, printElement } from "@/lib/print-doc";

export const Route = createFileRoute("/checklist/$id")({
  component: ChecklistPrint,
  head: () => ({ meta: [{ title: "Checklist de Entrega — LHL Festas" }] }),
});

type GroupKey = "ESTRUTURAS" | "MOBILIÁRIO" | "DECORAÇÃO" | "ITENS DO TEMA" | "EXTRAS" | "OUTROS ITENS";

const KIT_GROUP: Record<keyof KitChecklist, GroupKey> = {
  painelPersonalizado: "ESTRUTURAS",
  arcoSuporte: "ESTRUTURAS",
  mesa: "MOBILIÁRIO",
  cilindros: "MOBILIÁRIO",
  bandejas: "DECORAÇÃO",
  boloFake: "DECORAÇÃO",
  vasoGrego: "DECORAÇÃO",
  buchinhoFloreira: "DECORAÇÃO",
  tapete: "DECORAÇÃO",
  displays: "ITENS DO TEMA",
  baloes: "EXTRAS",
  numeroLed: "EXTRAS",
  escadinha: "MOBILIÁRIO",
  happyBirthday: "EXTRAS",
};

function classifyExtra(label: string): GroupKey {
  const t = label.toLowerCase();
  if (/painel|arco|estrutura/.test(t)) return "ESTRUTURAS";
  if (/mesa|cilindro|escadinh/.test(t)) return "MOBILIÁRIO";
  if (/bandeja|boleir|mini ?cake|vaso|buchinh|floreir|bolo fake|tapete/.test(t)) return "DECORAÇÃO";
  if (/display|painel do tema|personaliz/.test(t)) return "ITENS DO TEMA";
  if (/led|luminária|luminaria|happy|balão|balao|número|numero/.test(t)) return "EXTRAS";
  return "OUTROS ITENS";
}

const GROUP_ORDER: GroupKey[] = ["ESTRUTURAS", "MOBILIÁRIO", "DECORAÇÃO", "ITENS DO TEMA", "EXTRAS", "OUTROS ITENS"];

function ChecklistPrint() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [busy, setBusy] = useState<"pdf" | "print" | null>(null);

  useEffect(() => {
    fetchLancamentos().then(setLancamentos).catch(() => { /* ignore */ });
    getOrderFromSheet(id, { includeDeleted: true })
      .then((o) => { if (o && String(o.status) !== "Excluído") setOrder(o); })
      .finally(() => setLoaded(true));
  }, [id]);

  if (!loaded) return null;
  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="font-serif text-2xl text-primary">Contrato não encontrado</p>
        <Button asChild variant="ghost"><Link to="/admin"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao painel</Link></Button>
      </div>
    );
  }

  const d = order.details;
  const isMontagem = String(d?.servicoMontagem || "Não") === "Sim";

  // Itens comuns do kit
  const kitItems: { key: string; label: string; qty: number; group: GroupKey }[] = d
    ? (Object.keys(kitLabels) as (keyof KitChecklist)[])
        .map((k) => ({ key: k, label: kitLabels[k], qty: Number(d.kit?.[k]) || 0, group: KIT_GROUP[k] }))
        .filter((it) => it.qty > 0)
    : [];

  // Extras vindos de demaisPecas
  const rawExtras: { label: string; qty: number }[] = [];
  if (d?.demaisPecas) {
    for (const raw of d.demaisPecas.split(/\r?\n|;/)) {
      const line = raw.trim();
      if (!line) continue;
      const m = line.match(/^(.+?)\s*[:\-]\s*(\d+)/);
      if (m) rawExtras.push({ label: m[1].trim(), qty: Number(m[2]) });
      else rawExtras.push({ label: line, qty: 1 });
    }
  }

  // Separa estruturas oficiais dos demais extras
  const structures: { model: StructureModel; qty: number; sourceLabel: string }[] = [];
  const extraItems: { label: string; qty: number; group: GroupKey }[] = [];
  for (const it of rawExtras) {
    const model = matchStructureModel(it.label);
    if (model) structures.push({ model, qty: it.qty, sourceLabel: it.label });
    else extraItems.push({ label: it.label, qty: it.qty, group: classifyExtra(it.label) });
  }

  // Agrupa itens comuns por grupo visual
  const allCommon = [
    ...kitItems.map((k) => ({ label: k.label, qty: k.qty, group: k.group })),
    ...extraItems,
  ];
  const grouped: Record<GroupKey, { label: string; qty: number }[]> = {
    "ESTRUTURAS": [], "MOBILIÁRIO": [], "DECORAÇÃO": [], "ITENS DO TEMA": [], "EXTRAS": [], "OUTROS ITENS": [],
  };
  for (const it of allCommon) grouped[it.group].push({ label: it.label, qty: it.qty });

  // Itens exclusivos reservados neste contrato
  const excCatalog: ExclusiveItem[] = getExclusiveConfig();
  const excCatalogById = new Map(excCatalog.map((i) => [i.id, i]));
  const excSelected = parseSelected(d?.itensExclusivos);
  const kitItensChecklist = kitItemsFor(order.modalidade, order.plano);
  type ExcRow = ExclusiveItem & { aComprarSpec?: string };
  const excItems: ExcRow[] = [];
  for (const s of excSelected) {
    const cat = excCatalogById.get(s.itemId);
    if (cat) excItems.push({ ...cat, aComprarSpec: s.aComprarSpec });
  }
  const excByCat: Record<string, ExcRow[]> = {};
  for (const it of excItems) (excByCat[it.categoria] ||= []).push(it);

  const sanitize = (s: string) => s.replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim();
  const buildFilename = () => `Checklist LHL - ${sanitize(order.nome || "Cliente")}.pdf`;

  const checklistEl = () => document.querySelector(".a4-checklist") as HTMLElement | null;

  const handleDownloadPdf = async () => {
    const el = checklistEl();
    if (!el) {
      alert("Conteúdo do checklist não encontrado.");
      return;
    }
    setBusy("pdf");
    try {
      await downloadElementPdf(el, buildFilename(), { padding: "12mm", margin: "12mm" });
    } finally {
      setBusy(null);
    }
  };

  const handlePrint = async () => {
    const el = checklistEl();
    if (!el) {
      window.print();
      return;
    }
    setBusy("print");
    try {
      await printElement(el, { title: buildFilename().replace(/\.pdf$/, ""), margin: "12mm" });
    } finally {
      setBusy(null);
    }
  };


  const blankLine = <span className="inline-block border-b border-black min-w-[80px]">&nbsp;</span>;
  const longLine = <span className="inline-block border-b border-black w-full">&nbsp;</span>;

  return (
    <div className="min-h-screen bg-white">
      <div className="no-print border-b border-border/60 bg-card/70 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <Button asChild variant="ghost" className="text-muted-foreground hover:text-primary">
            <Link to="/admin/$id" params={{ id: order.id }}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar à edição
            </Link>
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <Button type="button" onClick={handleDownloadPdf} disabled={busy !== null} className="rounded-full bg-[image:var(--gradient-elegant)] text-primary-foreground border-0 hover:opacity-95">
              {busy === "pdf" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              {busy === "pdf" ? "Gerando..." : "Baixar PDF"}
            </Button>
            <Button type="button" onClick={handlePrint} disabled={busy !== null} variant="outline" className="rounded-full">
              {busy === "print" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
              Imprimir
            </Button>
          </div>
        </div>
      </div>

      <main className="py-8 print:py-0 flex justify-center">
        <article
          className="a4-checklist bg-white text-black"
          style={{ width: "210mm", minHeight: "297mm", padding: "12mm 12mm", fontFamily: 'Arial, Helvetica, Verdana, sans-serif', fontSize: "12px", lineHeight: 1.4, color: "#000" }}
        >
          {/* Cabeçalho */}
          <header className="flex items-start justify-between gap-4 border-b-2 border-black pb-2 mb-3">
            <div className="flex items-center gap-3">
              <img src={logo} alt="LHL Festas" className="w-11" />
              <div>
                <p className="text-[18px] font-bold leading-none">LHL Festas</p>
                <p className="text-[12px] font-semibold mt-0.5">Checklist de Entrega e Devolução</p>
              </div>
            </div>
            <div className="text-right text-[10px] leading-[1.5]">
              <p className="uppercase tracking-wider font-bold">Contrato</p>
              <p className="font-mono text-[12px] font-semibold">{order.id.slice(0, 8).toUpperCase()}</p>
              <p className="uppercase tracking-wider font-bold mt-1">Impresso</p>
              <p>{new Date().toLocaleDateString("pt-BR")}</p>
            </div>
          </header>

          {/* Dados da Festa + Foto */}
          <section className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-1">Decoração</h2>
              {d?.fotoDecoracaoUrl ? (
                <div className="w-full h-36 border border-black bg-white flex items-center justify-center overflow-hidden">
                  <img src={d.fotoDecoracaoUrl} alt="Decoração" crossOrigin="anonymous" className="max-w-full max-h-full w-auto h-auto object-contain" style={{ objectFit: "contain" }} />
                </div>
              ) : (
                <div className="w-full h-36 border border-dashed border-black flex items-center justify-center text-[10px] text-center px-2">Foto não cadastrada.</div>
              )}
            </div>
            <div className="col-span-2">
              <h2 className="text-[11px] font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-1">Festa</h2>
              <table className="w-full text-[12px] leading-[1.5]">
                <tbody>
                  {[
                    ["Cliente", order.nome],
                    ["Telefone", order.telefone],
                    ["Aniversariante", d?.nomeAniversariante],
                    ["Idade", d?.idadeAniversariante],
                    ["Tipo da Festa", d?.tipoFesta],
                    ["Tema", order.tema],
                    ["Modalidade", order.modalidade],
                    ["Kit", order.plano],
                    ["Data do Evento", formatDateBR(d?.dataEvento)],
                    ["Retirada", formatDateTimeBR(d?.dataRetirada, d?.horaRetirada)],
                    ["Devolução", formatDateTimeBR(d?.dataDevolucao, d?.horaDevolucao)],
                  ].map(([k, v]) => (
                    <tr key={k}>
                      <th className="text-left font-bold pr-2 py-[1px] w-[35%] align-top">{k}</th>
                      <td className="py-[1px]">{v || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {kitItensChecklist.length > 0 ? (
              <div className="mt-2">
                <p className="font-bold">Itens inclusos no kit</p>
                <ul className="list-disc pl-5">
                  {kitItensChecklist.map((i) => <li key={i}>{i}</li>)}
                </ul>
              </div>
            ) : null}
          </section>

          {/* Resumo Financeiro da Retirada */}
          {(() => {
            const fmt = (n: number) =>
              n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

            // REGRA SPRINT 3: A fonte soberana é o objeto ContractDetails persistido.
            // Não usamos getContractPaymentStatus para o checklist para garantir fidelidade
            // aos valores negociados (Total/Sinal/Saldo/Caução) conforme salvos no contrato,
            // independentemente de lançamentos financeiros parciais.
            const total = Number(String(d?.valorTotal || "0").replace(",", "."));
            const sinal = Number(String(d?.valorSinal || "0").replace(",", "."));
            const restante = Number(String(d?.valorRestante || "0").replace(",", "."));
            const caucaoVal = Number(String(d?.valorCaucao || "0").replace(",", "."));
            
            const sinalOk = (d?.sinalRecebido || "Não") === "Sim";
            const finalOk = (d?.pagamentoFinalRecebido || "Não") === "Sim";
            const caucaoOk = (d?.caucaoRecebida || "Não") === "Sim";
            
            const isMontagemCheck = String(d?.servicoMontagem || "Não") === "Sim";
            
            // Cálculo do que falta receber na retirada (Saldo + Caução se não pagos)
            const faltaPagarRestante = finalOk ? 0 : restante;
            const faltaPagarCaucao = (isMontagemCheck || caucaoOk) ? 0 : caucaoVal;
            const totalRetirada = faltaPagarRestante + faltaPagarCaucao;
            const quitado = totalRetirada <= 0;

            return (
              <section className="mb-3 border-2 border-black p-2">
                <h2 className="text-[12px] font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-2">
                  Resumo Financeiro da Retirada
                </h2>
                <table className="w-full text-[12px] leading-[1.5]">
                  <tbody>
                    <tr>
                      <th className="text-left font-bold py-[1px] w-[60%]">Valor total da locação</th>
                      <td className="py-[1px] text-right">{fmt(total)}</td>
                    </tr>
                    <tr>
                      <th className="text-left font-bold py-[1px]">Sinal (pago na reserva)</th>
                      <td className="py-[1px] text-right">{sinalOk ? "PAGO" : fmt(sinal)}</td>
                    </tr>
                    <tr>
                      <th className="text-left font-bold py-[1px]">Restante da locação</th>
                      <td className="py-[1px] text-right">
                        {finalOk ? `PAGO` : fmt(restante)}
                      </td>
                    </tr>
                    <tr>
                      <th className="text-left font-bold py-[1px]">
                        Caução (Garantia)
                        {isMontagemCheck && <span className="ml-1 text-[9px] uppercase font-normal">(Isento - Montagem LHL)</span>}
                      </th>
                      <td className="py-[1px] text-right">
                        {isMontagemCheck ? "ISENTO" : caucaoOk ? "PAGO" : fmt(caucaoVal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-2 border-t-2 border-black pt-2 flex items-baseline justify-between">
                  <p className="text-[13px] font-bold uppercase tracking-wider">Total a receber na retirada</p>
                  <p className="text-[18px] font-bold">{quitado ? "QUITADO" : fmt(totalRetirada)}</p>
                </div>
                {quitado && (
                  <p className="text-[12px] font-bold uppercase tracking-wider text-center mt-1">
                    Cliente quitado
                  </p>
                )}
              </section>
            );
          })()}


          {/* Observações internas em destaque */}
          {d?.observacoesInternas && (
            <section className="mb-3 border-2 border-black p-2">
              <p className="text-[11px] font-bold uppercase tracking-wider mb-1">Atenção / Observações da Montagem</p>
              <p className="text-[12px] whitespace-pre-wrap">{d.observacoesInternas}</p>
            </section>
          )}

          {/* Estruturas — conferência obrigatória */}
          {structures.length > 0 && (
            <section className="mb-3">
              <h2 className="text-[12px] font-bold uppercase tracking-wider border-b-2 border-black pb-0.5 mb-2">
                Estruturas — Conferência Obrigatória
              </h2>
              <div className="space-y-2">
                {structures.map((s, i) => {
                  const total = s.qty * s.model.pecas;
                  return (
                    <div key={`s-${i}`} className="border border-black p-2 break-inside-avoid">
                      <p className="text-[12px] font-bold uppercase tracking-wider">{s.model.nome}</p>
                      <table className="w-full text-[11px] mt-1">
                        <tbody>
                          <tr>
                            <td className="pr-2 py-[1px]">Estruturas:</td>
                            <td className="py-[1px] font-semibold">{s.qty}</td>
                            <td className="pr-2 py-[1px]">Peças por estrutura:</td>
                            <td className="py-[1px] font-semibold">{s.model.pecas}</td>
                            <td className="pr-2 py-[1px]">Total esperado:</td>
                            <td className="py-[1px] font-bold">{total} {total === 1 ? "peça" : "peças"}</td>
                          </tr>
                        </tbody>
                      </table>
                      <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
                        <div className="border border-black p-1.5">
                          <p className="text-[10px] font-bold uppercase mb-1">Saída</p>
                          <p>Peças entregues: {blankLine}</p>
                          <p className="mt-1">☐ Conferido</p>
                        </div>
                        <div className="border border-black p-1.5">
                          <p className="text-[10px] font-bold uppercase mb-1">Retorno</p>
                          <p>Peças devolvidas: {blankLine}</p>
                          <p className="mt-1">☐ Conferido</p>
                        </div>
                        <div className="border border-black p-1.5">
                          <p className="text-[10px] font-bold uppercase mb-1">Diferença</p>
                          <p>{blankLine} peça(s)</p>
                          <p className="mt-1 text-[10px]">Esperado: <span className="font-semibold">{total}</span></p>
                        </div>
                      </div>
                      <p className="text-[11px] mt-1">Observação: {longLine}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Itens Exclusivos Reservados */}
          {excItems.length > 0 && (
            <section className="mb-3">
              <h2 className="text-[12px] font-bold uppercase tracking-wider border-b-2 border-black pb-0.5 mb-2">
                Itens Exclusivos Reservados
              </h2>
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr>
                    <th className="text-left font-bold py-1 px-2 border border-black">Categoria</th>
                    <th className="text-left font-bold py-1 px-2 border border-black">Item</th>
                    <th className="text-center font-bold py-1 px-2 border border-black w-20">Saída</th>
                    <th className="text-center font-bold py-1 px-2 border border-black w-20">Retorno</th>
                  </tr>
                </thead>
                <tbody>
                  {excItems.map((it) => (
                    <tr key={it.id}>
                      <td className="py-1 px-2 border border-black">{CATEGORY_LABELS[it.categoria]}</td>
                      <td className="py-1 px-2 border border-black">
                        {it.nome}
                        {it.aComprar && it.aComprarSpec ? ` — ${it.aComprarSpec}` : ""}
                        {it.pecas ? ` (${it.pecas} peças)` : ""}
                      </td>
                      <td className="py-1 px-2 border border-black text-center">☐</td>
                      <td className="py-1 px-2 border border-black text-center">☐</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Itens do kit por grupo */}
          <section className="mb-3">
            <h2 className="text-[12px] font-bold uppercase tracking-wider border-b-2 border-black pb-0.5 mb-2">Itens do Kit</h2>
            {allCommon.length === 0 ? (
              <p className="text-[11px] text-center py-2 border border-black">Nenhum item comum registrado no kit.</p>
            ) : (
              <div className="space-y-2">
                {GROUP_ORDER.filter((g) => grouped[g].length > 0).map((g) => (
                  <div key={g} className="break-inside-avoid">
                    <p className="text-[11px] font-bold uppercase tracking-wider bg-black text-white px-2 py-0.5">{g}</p>
                    <table className="w-full text-[11px] border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left font-bold py-1 px-2 border border-black">Item</th>
                          <th className="text-center font-bold py-1 px-2 border border-black w-20">Qtd. esperada</th>
                          <th className="text-center font-bold py-1 px-2 border border-black w-20">Saída</th>
                          <th className="text-center font-bold py-1 px-2 border border-black w-20">Retorno</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grouped[g].map((it, i) => (
                          <tr key={`${g}-${i}`}>
                            <td className="py-1 px-2 border border-black">{it.label}</td>
                            <td className="py-1 px-2 border border-black text-center font-semibold">{it.qty}</td>
                            <td className="py-1 px-2 border border-black text-center">&nbsp;</td>
                            <td className="py-1 px-2 border border-black text-center">&nbsp;</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Divergências */}
          <section className="mb-3 break-inside-avoid">
            <h2 className="text-[12px] font-bold uppercase tracking-wider border-b-2 border-black pb-0.5 mb-2">Divergências Encontradas</h2>
            {[0, 1].map((i) => (
              <table key={i} className="w-full text-[11px] mb-1 border-collapse">
                <tbody>
                  <tr>
                    <td className="py-1 px-2 border border-black w-[45%]">Item: {blankLine}</td>
                    <td className="py-1 px-2 border border-black">Esperado: {blankLine}</td>
                    <td className="py-1 px-2 border border-black">Devolvido: {blankLine}</td>
                    <td className="py-1 px-2 border border-black">Diferença: {blankLine}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="py-1 px-2 border border-black">Observação: {longLine}</td>
                  </tr>
                </tbody>
              </table>
            ))}
          </section>

          {/* Conferência de saída e retorno */}
          <section className="grid grid-cols-2 gap-3 mb-3 break-inside-avoid">
            <div className="border-2 border-black p-2">
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2">Conferência de Saída do Kit</p>
              <p className="text-[11px]">☐ KIT COMPLETO</p>
              <p className="text-[11px]">☐ KIT COM DIVERGÊNCIA</p>
              <p className="text-[11px] mt-2">Responsável: {longLine}</p>
              <p className="text-[11px] mt-1">Data: ____ / ____ / ______</p>
              <p className="text-[11px] mt-1">Observações:</p>
              <div className="border-b border-black h-4" />
              <div className="border-b border-black h-4 mt-1" />
            </div>
            <div className="border-2 border-black p-2">
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2">Conferência de Retorno do Kit</p>
              <p className="text-[11px]">☐ KIT COMPLETO</p>
              <p className="text-[11px]">☐ KIT COM DIVERGÊNCIA</p>
              <p className="text-[11px] mt-2">Responsável: {longLine}</p>
              <p className="text-[11px] mt-1">Data: ____ / ____ / ______</p>
              <p className="text-[11px] mt-1">Observações:</p>
              <div className="border-b border-black h-4" />
              <div className="border-b border-black h-4 mt-1" />
            </div>
          </section>

          {/* Assinaturas */}
          <section className="grid grid-cols-3 gap-4 mt-4 break-inside-avoid">
            {["Preparado por", "Conferido por", "Cliente conferiu"].map((l) => (
              <div key={l} className="text-center">
                <div className="border-b border-black h-8" />
                <p className="text-[10px] mt-1 font-semibold uppercase tracking-wider">{l}</p>
              </div>
            ))}
          </section>

          <footer className="mt-4 pt-1 border-t border-black text-center">
            <p className="text-[9px] uppercase tracking-[0.2em] font-bold">LHL Festas · Peg & Monte · Mauá/SP</p>
          </footer>
        </article>
      </main>
    </div>
  );
}
