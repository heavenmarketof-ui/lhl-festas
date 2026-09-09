import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { kitLabels, buildEnderecoCompleto, HORARIO_AVISO, type StoredOrder, type KitChecklist } from "@/lib/orders-storage";
import { getOrderFromSheet } from "@/lib/orders-cache";
import { formatDateBR } from "@/lib/date-utils";
import { kitItemsFor } from "@/data/kits";
import { ArrowLeft, Printer, Download, Loader2 } from "lucide-react";
import logo from "@/assets/lhl-logo.png";
import { downloadElementPdf, printElement } from "@/lib/print-doc";

export const Route = createFileRoute("/contract/$id")({
  component: ContractPrint,
  head: () => ({ meta: [{ title: "Contrato — LHL Festas" }, { name: "robots", content: "noindex, nofollow" }] }),
});

const CNPJ_LHL = String(import.meta.env.VITE_LHL_CNPJ || "").trim() || "—";

function ContractPrint() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState<"pdf" | "print" | null>(null);

  useEffect(() => {
    getOrderFromSheet(id, { includeDeleted: true })
      .then((o) => {
        if (!o) return;
        if (String(o.status) === "Excluído") { setBlocked(true); return; }
        setOrder(o);
      })
      .finally(() => setLoaded(true));
  }, [id]);

  if (!loaded) return null;
  if (blocked) return <StateMessage title="Contrato excluído" text="Este contrato foi excluído e não pode ser visualizado ou impresso." />;
  if (!order) return <StateMessage title="Contrato não encontrado" />;

  const d = order.details;
  const isMontagem = String(d?.servicoMontagem || "Não") === "Sim";
  const kitItensContrato = kitItemsFor(order.modalidade, order.plano);
  const fmtMoney = (s?: string) => {
    const n = Number(s);
    if (!s || Number.isNaN(n)) return "—";
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const kitItems = d
    ? (Object.keys(kitLabels) as (keyof KitChecklist)[])
      .map((k) => ({ label: kitLabels[k], qty: Number(d.kit?.[k]) || 0 }))
      .filter((it) => it.qty > 0)
    : [];

  const extraItems: { label: string; qty: number }[] = [];
  if (d?.demaisPecas) {
    for (const raw of d.demaisPecas.split(/\r?\n|;/)) {
      const line = raw.trim();
      if (!line) continue;
      const m = line.match(/^(.+?)\s*[:\-]\s*(\d+)/);
      if (m) extraItems.push({ label: m[1].trim(), qty: Number(m[2]) });
      else extraItems.push({ label: line, qty: 1 });
    }
  }

  const sanitizeFilename = (s: string) => s.replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim();
  const buildFilename = () => {
    const nome = sanitizeFilename(order.nome || "Cliente");
    const tema = sanitizeFilename(order.tema || "");
    return tema ? `LHL Festas - ${nome} - ${tema}.pdf` : `LHL Festas - ${nome}.pdf`;
  };
  const sheetEl = () => document.querySelector(".a4-sheet") as HTMLElement | null;
  const handleDownloadPdf = async () => {
    const el = sheetEl(); if (!el) return;
    setBusy("pdf"); try { await downloadElementPdf(el, buildFilename(), { padding: "18mm 16mm", margin: "18mm 16mm" }); } finally { setBusy(null); }
  };
  const handlePrint = async () => {
    const el = sheetEl(); if (!el) { window.print(); return; }
    setBusy("print"); try { await printElement(el, { title: buildFilename().replace(/\.pdf$/, ""), margin: "18mm 16mm" }); } finally { setBusy(null); }
  };

  const eventoRows: [string, string][] = [
    ["Tipo da Festa", d?.tipoFesta || "—"],
    ["Aniversariante", d?.nomeAniversariante || "—"],
    ["Idade", d?.idadeAniversariante || "—"],
    ["Tema", order.tema],
    ["Modalidade", order.modalidade],
    ["Kit", order.plano],
    ["Serviço", isMontagem ? "Festa com montagem e desmontagem no local" : "Locação com retirada pelo cliente"],
    ["Data do Evento", formatDateBR(d?.dataEvento)],
  ];
  if (!isMontagem) {
    eventoRows.push(["Retirada", formatDateBR(d?.dataRetirada)]);
    eventoRows.push(["Devolução", formatDateBR(d?.dataDevolucao)]);
  }

  return (
    <div className="min-h-screen bg-[#f4ebe2]/40">
      <div className="no-print sticky top-0 z-10 border-b border-border/60 bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Button asChild variant="ghost" className="text-muted-foreground hover:text-primary"><Link to="/admin/$id" params={{ id: order.id }}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar à edição</Link></Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={handleDownloadPdf} disabled={busy !== null} className="rounded-full bg-[image:var(--gradient-elegant)] text-primary-foreground border-0">{busy === "pdf" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}{busy === "pdf" ? "Gerando..." : "Baixar PDF"}</Button>
            <Button type="button" onClick={handlePrint} disabled={busy !== null} variant="outline" className="rounded-full">{busy === "print" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}Imprimir</Button>
          </div>
        </div>
      </div>

      <main className="flex justify-center py-8 print:py-0">
        <article className="a4-sheet rounded-sm border border-[#e8d9cc] bg-white text-[#1a1410] shadow-[0_8px_40px_-12px_rgba(120,80,70,0.25)]" style={{ width: "210mm", minWidth: "210mm", minHeight: "297mm", padding: "18mm 16mm", fontFamily: "Arial, Helvetica, Verdana, sans-serif", fontSize: "16px", lineHeight: 1.75 }}>
          <header className="avoid-break mb-7 flex items-start justify-between gap-6 border-b-2 border-[#d4a5a0] pb-5">
            <div className="flex items-center gap-4"><img src={logo} alt="LHL Festas" className="h-auto w-[64px] object-contain" /><div><p className="text-[24px] font-bold leading-none text-[#8b5a5a]">LHL Festas</p><p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#b8915a]">Prático, lindo e feito para você</p></div></div>
            <div className="text-right text-[15px] leading-[1.7]"><p className="text-[13px] font-bold uppercase tracking-wider text-[#8b5a5a]">Contrato Nº</p><p className="font-mono text-[16px] font-semibold">{order.id.slice(0, 8).toUpperCase()}</p><p className="mt-2 text-[13px] font-bold uppercase tracking-wider text-[#8b5a5a]">Emitido em</p><p>{new Date().toLocaleDateString("pt-BR")}</p></div>
          </header>

          <h1 className="mb-3 text-center text-[30px] font-bold leading-tight text-[#8b5a5a]">{isMontagem ? "Contrato de Decoração e Locação de Itens para Festa" : "Contrato de Locação de Itens para Festas"}</h1>
          <p className="mb-8 text-center text-[16px] text-[#3a2e26]">Modalidade: <strong>{order.modalidade}</strong> · Kit: <strong>{order.plano}</strong></p>

          <Block title="I — Do Contratante"><Table rows={[["Nome", order.nome],["CPF", order.cpf],["Telefone", order.telefone],["E-mail", order.email],["Endereço", buildEnderecoCompleto({ rua: d?.rua, numero: d?.numero, bairro: d?.bairro, cidade: d?.cidade, cep: d?.cep }) || order.endereco]]} /></Block>
          <Block title="II — Da Contratada"><Table rows={[["Razão", "LHL Festas"],["CNPJ", CNPJ_LHL],["WhatsApp", "(11) 92554-3380"],["Instagram", "@lhl_festas"]]} /></Block>
          <Block title="III — Do Evento"><Table rows={eventoRows} />{kitItensContrato.length > 0 && <div className="mt-3"><p className="text-[13px] font-semibold text-[#7a3b4d]">Itens inclusos no kit</p><ul className="mt-1 list-disc pl-5 text-[13px] text-[#4a3a3a]">{kitItensContrato.map((i) => <li key={i}>{i}</li>)}</ul></div>}{!isMontagem && <p className="mt-3 text-[13px] italic text-[#8b5a5a]">{HORARIO_AVISO}</p>}</Block>
          <Block title="IV — Financeiro"><Table rows={[["Valor Total", fmtMoney(d?.valorTotal)],["Sinal de reserva", fmtMoney(d?.valorSinal)],["Valor Restante", fmtMoney(d?.valorRestante)],["Caução", isMontagem ? "ISENTO" : fmtMoney(d?.valorCaucao)]]} /></Block>
          <Block title="V — Itens da Composição">{kitItems.length === 0 && extraItems.length === 0 ? <p>Nenhum item incluso registrado.</p> : <ul className="flex flex-wrap gap-x-8 gap-y-3 list-inside list-disc text-[16px] marker:text-[#b8915a]">{kitItems.map((it) => <li key={`k-${it.label}`}><strong>{it.label}:</strong> {it.qty} {it.qty === 1 ? "unidade" : "unidades"}</li>)}{extraItems.map((it, i) => <li key={`e-${i}`}><strong>{it.label}:</strong> {it.qty} {it.qty === 1 ? "unidade" : "unidades"}</li>)}</ul>}</Block>
          {d?.observacoes && <Block title="VI — Observações"><p className="whitespace-pre-wrap text-[16px]">{d.observacoes}</p></Block>}

          <Block title={`${d?.observacoes ? "VII" : "VI"} — Das Cláusulas Contratuais`}>
            {isMontagem ? <MontagemClauses /> : <PegMonteClauses />}
          </Block>

          <div className="avoid-break mt-8 rounded border-2 border-[#d4a5a0] bg-[#fbf3ee] p-6 text-center"><p className="mb-2 text-[14px] font-bold uppercase tracking-[0.2em] text-[#8b5a5a]">Aceite Digital Registrado</p><p className="text-[16px] leading-[1.8]">O CONTRATANTE confirmou eletronicamente a leitura das condições apresentadas no envio da reserva.</p>{d?.dataHoraAceite && <p className="mt-2 text-[13px] text-[#6b4a4a]">Registro do aceite: <strong>{formatAceite(d.dataHoraAceite)}</strong></p>}<p className="mt-1 text-[13px] italic text-[#6b4a4a]">O pagamento do sinal também constitui confirmação formal da contratação.</p></div>
          <footer className="avoid-break mt-8 border-t border-[#e8d9cc] pt-4 text-center"><p className="text-[18px] font-bold italic text-[#8b5a5a]">Sua festa, do seu jeito! ♡</p><p className="mt-2 text-[12px] font-bold uppercase tracking-[0.2em] text-[#8b5a5a]">LHL Festas · Contrato {order.id.slice(0, 8).toUpperCase()}</p></footer>
        </article>
      </main>
    </div>
  );
}

function clausesClass(){return "space-y-5 pl-6 text-justify text-[16px] leading-[1.9] list-decimal marker:font-bold marker:text-[#8b5a5a]"}
function PegMonteClauses(){return <ol className={clausesClass()}><li><strong>Do Objeto:</strong> locação temporária dos itens decorativos descritos neste contrato.</li><li><strong>Da Reserva:</strong> a data é confirmada após pagamento do sinal de 50% do valor acordado. Em cancelamento pelo CONTRATANTE, o sinal poderá ser retido conforme custos, preparação e proximidade do evento.</li><li><strong>Da Caução:</strong> quando aplicável, será devolvida após conferência dos itens, podendo sofrer desconto por perdas, avarias ou necessidade de reposição.</li><li><strong>Da Retirada e Devolução:</strong> datas e horários são combinados previamente. Atrasos podem gerar cobrança adicional e ressarcimento de prejuízos decorrentes da indisponibilidade dos materiais.</li><li><strong>Das Responsabilidades:</strong> durante a locação, os itens ficam sob responsabilidade do CONTRATANTE e devem ser protegidos de chuva, umidade, quedas e danos.</li><li><strong>Do Aceite:</strong> o envio da reserva e o pagamento do sinal formalizam a concordância com as condições contratadas.</li></ol>}
function MontagemClauses(){return <ol className={clausesClass()}><li><strong>Do Objeto:</strong> prestação do serviço de decoração, montagem e desmontagem, com disponibilização temporária dos itens descritos neste contrato.</li><li><strong>Da Reserva:</strong> a data é confirmada após pagamento do sinal de 50% do valor acordado. Em cancelamento pelo CONTRATANTE, o sinal poderá ser retido conforme custos, preparação e proximidade do evento.</li><li><strong>Da Montagem e Desmontagem:</strong> horários de acesso ao local devem ser previamente combinados. O CONTRATANTE deve garantir acesso, espaço e condições adequadas para execução do serviço.</li><li><strong>Dos Itens:</strong> os materiais da LHL Festas permanecem de propriedade da CONTRATADA e serão retirados/desmontados conforme combinado após o evento.</li><li><strong>Da Caução:</strong> para esta modalidade, a caução é isenta, salvo ajuste específico formalizado entre as partes.</li><li><strong>Do Aceite:</strong> o envio da reserva e o pagamento do sinal formalizam a concordância com as condições contratadas.</li></ol>}
function formatAceite(value:string){const dt=new Date(value);return Number.isNaN(dt.getTime())?value:dt.toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}
function StateMessage({title,text}:{title:string;text?:string}){return <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center"><p className="font-serif text-2xl text-primary">{title}</p>{text&&<p className="text-sm text-muted-foreground">{text}</p>}<Button asChild variant="ghost"><Link to="/admin"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao painel</Link></Button></div>}
function Block({ title, children }: { title: string; children: React.ReactNode }) { return <section className="avoid-break mb-8"><h2 className="mb-4 border-b-2 border-[#d4a5a0] pb-2 text-[20px] font-bold uppercase tracking-[0.08em] text-[#8b5a5a]">{title}</h2>{children}</section> }
function Table({ rows }: { rows: [string, string][] }) { return <table className="w-full border-collapse text-[16px] leading-[1.7]"><tbody>{rows.map(([k,v],i)=><tr key={k} className={i%2===0?"bg-[#fbf3ee]":"bg-white"}><th className="w-1/3 border border-[#e8d9cc] px-3.5 py-3.5 text-left align-middle text-[13px] font-bold uppercase tracking-wider text-[#8b5a5a]">{k}</th><td className="border border-[#e8d9cc] px-3.5 py-3.5 align-middle text-[16px] font-semibold text-[#1a1410]">{v||"—"}</td></tr>)}</tbody></table> }
