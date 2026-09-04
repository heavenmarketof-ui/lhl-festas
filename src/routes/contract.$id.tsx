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
  head: () => ({
    meta: [{ title: "Contrato — LHL Festas" }],
  }),
});


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
        if (String(o.status) === "Excluído") {
          setBlocked(true);
          return;
        }
        setOrder(o);
      })
      .finally(() => setLoaded(true));
  }, [id]);

  if (!loaded) return null;
  if (blocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="font-serif text-2xl text-primary">Contrato excluído</p>
        <p className="text-sm text-muted-foreground">Este contrato foi excluído e não pode ser visualizado ou impresso.</p>
        <Button asChild variant="ghost"><Link to="/admin"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao painel</Link></Button>
      </div>
    );
  }
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

  const sanitizeFilename = (s: string) =>
    s.replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim();

  const buildFilename = () => {
    const nome = sanitizeFilename(order.nome || "Cliente");
    const tema = sanitizeFilename(order.tema || "");
    return tema ? `LHL Festas - ${nome} - ${tema}.pdf` : `LHL Festas - ${nome}.pdf`;
  };

  const sheetEl = () => document.querySelector(".a4-sheet") as HTMLElement | null;

  const handleDownloadPdf = async () => {
    const el = sheetEl();
    if (!el) {
      alert("Conteúdo do contrato não encontrado.");
      return;
    }
    setBusy("pdf");
    try {
      await downloadElementPdf(el, buildFilename(), { padding: "18mm 16mm", margin: "18mm 16mm" });
    } finally {
      setBusy(null);
    }
  };

  const handlePrint = async () => {
    const el = sheetEl();
    if (!el) {
      window.print();
      return;
    }
    setBusy("print");
    try {
      await printElement(el, {
        title: buildFilename().replace(/\.pdf$/, ""),
        margin: "18mm 16mm",
      });
    } finally {
      setBusy(null);
    }
  };



  return (
    <div className="min-h-screen bg-[#f4ebe2]/40">
      {/* Toolbar (não imprime) */}
      <div className="no-print border-b border-border/60 bg-card/70 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <Button asChild variant="ghost" className="text-muted-foreground hover:text-primary">
            <Link to="/admin/$id" params={{ id: order.id }}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar à edição
            </Link>
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              onClick={handleDownloadPdf}
              disabled={busy !== null}
              className="rounded-full bg-[image:var(--gradient-elegant)] text-primary-foreground border-0 hover:opacity-95"
            >
              {busy === "pdf" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {busy === "pdf" ? "Gerando..." : "Baixar PDF"}
            </Button>
            <Button
              type="button"
              onClick={handlePrint}
              disabled={busy !== null}
              variant="outline"
              className="rounded-full"
            >
              {busy === "print" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Printer className="h-4 w-4 mr-2" />
              )}
              Imprimir
            </Button>
          </div>
        </div>
      </div>

      {/* Folha A4 */}
      <main className="py-8 print:py-0 flex justify-center">
        <article
          className="a4-sheet bg-white text-[#1a1410] shadow-[0_8px_40px_-12px_rgba(120,80,70,0.25)] border border-[#e8d9cc] rounded-sm"
          style={{ width: "210mm", minWidth: "210mm", minHeight: "297mm", padding: "18mm 16mm", fontFamily: 'Arial, Helvetica, Verdana, sans-serif', fontSize: "16px", lineHeight: 1.75, color: "#1a1410" }}
        >
          {/* Cabeçalho */}
          <header className="flex items-start justify-between gap-6 border-b-2 border-[#d4a5a0] pb-5 mb-7 avoid-break">
            <div className="flex items-center gap-4">
              <img src={logo} alt="LHL Festas" className="w-[64px] h-auto object-contain" style={{ width: "64px", height: "auto" }} />
              <div>
                <p style={{ fontFamily: 'Arial, Helvetica, Verdana, sans-serif' }} className="text-[24px] font-bold text-[#8b5a5a] leading-none">LHL Festas</p>
                <p className="text-[15px] text-[#8b5a5a] mt-1 font-semibold">Peg &amp; Monte</p>
                <p className="text-[12px] uppercase tracking-[0.18em] text-[#b8915a] mt-1 font-semibold">
                  Prático, lindo e feito para você
                </p>
              </div>
            </div>
            <div className="text-right text-[15px] leading-[1.7]">
              <p className="uppercase tracking-wider text-[#8b5a5a] text-[13px] font-bold">Contrato Nº</p>
              <p className="font-mono text-[16px] text-[#1a1410] font-semibold">{order.id.slice(0, 8).toUpperCase()}</p>
              <p className="uppercase tracking-wider text-[#8b5a5a] text-[13px] font-bold mt-2">Emitido em</p>
              <p className="text-[16px]">{new Date().toLocaleDateString("pt-BR")}</p>
            </div>
          </header>

          <h1 style={{ fontFamily: 'Arial, Helvetica, Verdana, sans-serif' }} className="text-[30px] font-bold text-center text-[#8b5a5a] mb-3 leading-tight">
            Contrato de Locação de Itens para Festas
          </h1>
          <p className="text-center text-[16px] text-[#3a2e26] mb-8">
            Modalidade: <strong>{order.modalidade}</strong> · Kit: <strong>{order.plano}</strong>
          </p>


          {/* I — Dados do Contratante */}
          <Block title="I — Do Contratante">
            <Table rows={[
              ["Nome", order.nome],
              ["CPF", order.cpf],
              ["Telefone", order.telefone],
              ["E-mail", order.email],
              ["Endereço", buildEnderecoCompleto({
                rua: d?.rua, numero: d?.numero, bairro: d?.bairro, cidade: d?.cidade, cep: d?.cep,
              }) || order.endereco],
            ]} />
          </Block>

          {/* II — Dados da Contratada */}
          <Block title="II — Da Contratada">
            <Table rows={[
              ["Razão", "LHL Festas – Peg & Monte"],
              ["WhatsApp", "(11) 92554-3380"],
              ["Instagram", "@lhl_festas"],
              ["Cidade", "Mauá / SP"],
            ]} />
          </Block>

          {/* III — Do Evento */}
          <Block title="III — Do Evento">
            <Table rows={[
              ["Tipo da Festa", d?.tipoFesta || "—"],
              ["Aniversariante", d?.nomeAniversariante || "—"],
              ["Idade", d?.idadeAniversariante || "—"],
              ["Tema", order.tema],
              ["Tipo de Locação", order.modalidade],
              ["Kit", order.plano],
              ["Montagem", isMontagem ? "Inclusa (LHL Festas)" : "Retirada (Peg & Monte)"],
              ["Data do Evento", formatDateBR(d?.dataEvento)],
              ["Retirada", formatDateBR(d?.dataRetirada)],
              ["Devolução", formatDateBR(d?.dataDevolucao)],
            ]} />
            {kitItensContrato.length > 0 ? (
              <div className="mt-3">
                <p className="text-[13px] font-semibold text-[#7a3b4d]">Itens inclusos no kit</p>
                <ul className="mt-1 list-disc pl-5 text-[13px] text-[#4a3a3a]">
                  {kitItensContrato.map((i) => <li key={i}>{i}</li>)}
                </ul>
              </div>
            ) : null}
            <p className="mt-3 text-[13px] text-[#8b5a5a] italic">{HORARIO_AVISO}</p>
          </Block>


          {/* IV — Financeiro */}
          <Block title="IV — Financeiro">
            <Table rows={[
              ["Valor Total", fmtMoney(d?.valorTotal)],
              ["Sinal (pago na reserva)", fmtMoney(d?.valorSinal)],
              ["Valor Restante", fmtMoney(d?.valorRestante)],
              ["Caução", isMontagem ? "ISENTO (Serviço com Montagem)" : fmtMoney(d?.valorCaucao)],
            ]} />
          </Block>

          {/* V — Itens Locados */}
          <Block title="V — Itens Locados">
            {kitItems.length === 0 && extraItems.length === 0 ? (
              <p className="text-[16px] text-[#3a2e26] leading-[1.8]">Nenhum item incluso registrado.</p>
            ) : (
              <ul className="flex flex-wrap gap-x-8 gap-y-3 text-[16px] leading-[1.8] list-disc list-inside marker:text-[#b8915a]">
                {kitItems.map((it) => (
                  <li key={`k-${it.label}`}>
                    <span className="font-bold">{it.label}:</span> {it.qty} {it.qty === 1 ? "unidade" : "unidades"}
                  </li>
                ))}
                {extraItems.map((it, i) => (
                  <li key={`e-${i}`}>
                    <span className="font-bold">{it.label}:</span> {it.qty} {it.qty === 1 ? "unidade" : "unidades"}
                  </li>
                ))}
              </ul>
            )}
          </Block>

          {/* VI — Observações */}
          {d?.observacoes && (
            <Block title="VI — Observações">
              <p className="text-[16px] leading-[1.9] whitespace-pre-wrap text-[#1a1410]">{d.observacoes}</p>
            </Block>
          )}

          {/* Cláusulas Jurídicas */}
          <Block title={`${d?.observacoes ? "VII" : "VI"} — Das Cláusulas Contratuais`}>
            <ol className="space-y-5 text-[16px] leading-[1.9] text-justify list-decimal pl-6 marker:text-[#8b5a5a] marker:font-bold text-[#1a1410]" style={{ fontFamily: 'Arial, Helvetica, Verdana, sans-serif' }}>
              <li>
                <strong>Do Objeto:</strong> O presente contrato tem como objeto a locação temporária de itens decorativos para
                eventos, conforme tema e modalidade escolhidos pelo CONTRATANTE.
              </li>
              <li>
                <strong>Da Reserva da Data:</strong> A reserva da data será confirmada somente após o pagamento do sinal
                correspondente ao valor acordado entre as partes. O valor do sinal <strong>não será devolvido</strong> em
                caso de cancelamento por parte do CONTRATANTE.
              </li>
              <li>
                <strong>Do Caução:</strong> O caução será devolvido após conferência de todos os itens locados. Em caso de
                avarias, manchas, quebras, perdas ou ausência de peças, poderá ser realizado desconto proporcional. 
                {isMontagem && (
                  <span className="ml-1 italic text-[#8b5a5a]">
                    (Cláusula de dispensa de caução aplicada devido ao serviço de montagem LHL Festas).
                  </span>
                )}
              </li>
              <li>
                <strong>Da Retirada e Devolução:</strong> As retiradas e devoluções ocorrem de <strong>segunda a sábado,
                das 9h às 18h</strong> — não realizamos atendimento aos domingos. A data de retirada e devolução é
                combinada previamente entre CONTRATANTE e CONTRATADA. Em caso de atraso na devolução, poderá ser aplicada
                multa, além da cobrança por prejuízos, indisponibilidade dos materiais para outros clientes ou necessidade
                de reposição/retirada emergencial.
              </li>
              <li>
                <strong>Das Responsabilidades:</strong> Os itens locados permanecem sob responsabilidade do CONTRATANTE
                durante todo o período da locação, devendo ser preservados contra <strong>chuva, umidade, quedas e danos
                em geral</strong>.
              </li>
              <li>
                <strong>Do Cancelamento:</strong> Em caso de cancelamento próximo à data do evento, a CONTRATADA poderá
                manter integralmente o valor da reserva, conforme disponibilidade e preparação do material.
              </li>
              <li>
                <strong>Do Aceite:</strong> O CONTRATANTE declara estar de acordo com todos os termos deste contrato,
                ficando sua aceitação formalizada mediante <strong>pagamento do sinal/reserva</strong> ou
                <strong> retirada física dos itens</strong>, independentemente de assinatura física ou digital.
              </li>
            </ol>
          </Block>

          {/* Aceite */}
          <div className="mt-8 p-6 border-2 border-[#d4a5a0] bg-[#fbf3ee] rounded text-center avoid-break">
            <p className="text-[14px] uppercase tracking-[0.2em] text-[#8b5a5a] font-bold mb-2">Aceite Digital Registrado</p>
            <p className="text-[16px] text-[#1a1410] leading-[1.8]">
              O CONTRATANTE confirmou eletronicamente a leitura e o aceite integral deste Contrato de Locação no momento do envio da reserva.
            </p>
            {d?.dataHoraAceite && (
              <p className="text-[13px] text-[#6b4a4a] mt-2">
                Registro do aceite: <strong>{(() => {
                  const dt = new Date(d.dataHoraAceite);
                  return Number.isNaN(dt.getTime())
                    ? d.dataHoraAceite
                    : dt.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
                })()}</strong>
              </p>
            )}
            <p className="text-[13px] text-[#6b4a4a] mt-1 italic">
              O pagamento do sinal ou a retirada física dos itens locados também constitui aceite formal deste contrato.
            </p>
          </div>


          <footer className="mt-8 pt-4 border-t border-[#e8d9cc] text-center avoid-break">
            <p style={{ fontFamily: 'Arial, Helvetica, Verdana, sans-serif' }} className="text-[18px] font-bold italic text-[#8b5a5a]">Sua festa, do seu jeito! ♡</p>
            <p className="text-[12px] uppercase tracking-[0.2em] text-[#8b5a5a] mt-2 font-bold">
              LHL Festas · Peg &amp; Monte · Mauá/SP · Contrato {order.id.slice(0, 8).toUpperCase()}
            </p>
          </footer>

        </article>
      </main>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 avoid-break">
      <h2 style={{ fontFamily: 'Arial, Helvetica, Verdana, sans-serif' }} className="text-[20px] font-bold text-[#8b5a5a] uppercase tracking-[0.08em] border-b-2 border-[#d4a5a0] pb-2 mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Table({ rows }: { rows: [string, string][] }) {
  return (
    <table style={{ fontFamily: 'Arial, Helvetica, Verdana, sans-serif' }} className="w-full text-[16px] leading-[1.7] border-collapse">
      <tbody>
        {rows.map(([k, v], i) => (
          <tr key={k} className={i % 2 === 0 ? "bg-[#fbf3ee]" : "bg-white"}>
            <th className="text-left font-bold text-[#8b5a5a] uppercase tracking-wider text-[13px] py-3.5 px-3.5 border border-[#e8d9cc] w-1/3 align-middle">
              {k}
            </th>
            <td className="py-3.5 px-3.5 border border-[#e8d9cc] text-[#1a1410] font-semibold align-middle text-[16px]">{v || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
