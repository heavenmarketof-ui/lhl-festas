import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { contratoTemMontagem, type StoredOrder } from "@/lib/orders-storage";
import { fmtBRL, parseValor } from "@/lib/financeiro-api";
import { formatDateBR } from "@/lib/date-utils";
import { downloadElementPdf, printElement } from "@/lib/print-doc";
import logo from "@/assets/lhl-logo.png";

export function ReciboQuitacao({ order }: { order: StoredOrder }) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const documentRef = useRef<HTMLElement>(null);
  const total = parseValor(order.details?.valorTotal);
  const montagem = contratoTemMontagem(order.modalidade, order.details?.servicoMontagem);
  const filename = `Recibo-Quitacao-${order.id.slice(0, 8)}.pdf`;
  async function exportar(pdf: boolean) {
    if (!confirmed || !(total > 0) || !documentRef.current || busy) return;
    setBusy(true);
    try {
      if (pdf) await downloadElementPdf(documentRef.current, filename, { margin: "12mm", padding: "12mm" });
      else await printElement(documentRef.current, { title: filename.replace(/\.pdf$/, ""), margin: "12mm" });
    } catch { toast.error("Não foi possível gerar o recibo. Tente novamente."); }
    finally { setBusy(false); }
  }
  return <>
    <Button type="button" variant="outline" onClick={() => { setConfirmed(false); setOpen(true); }}>Gerar recibo de quitação</Button>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogTitle>Recibo de quitação</DialogTitle>
        <DialogDescription>Confira os dados e confirme que o valor total foi recebido. Gerar este recibo não altera pagamentos nem o fluxo de caixa.</DialogDescription>
        <article ref={documentRef} className="bg-white text-black" style={{ padding: "24px", fontFamily: "Arial, sans-serif", lineHeight: 1.6 }}>
          <header style={{ display: "flex", alignItems: "center", gap: "16px", borderBottom: "2px solid #651323", paddingBottom: "16px" }}>
            <img src={logo} alt="LHL Festas" width={72} height={72} data-pdf-width="72" data-pdf-height="72" />
            <div><strong style={{ fontSize: "22px" }}>LHL Festas</strong><h2 style={{ fontSize: "18px" }}>Recibo de quitação{montagem ? " — Festa com Montagem" : ""}</h2></div>
          </header>
          <p style={{ marginTop: "24px" }}>Contrato: <strong>{order.id.slice(0, 8).toUpperCase()}</strong></p>
          <p>Cliente: <strong>{order.nome}</strong></p>
          <p>Evento: {formatDateBR(order.details?.dataEvento) || "—"}</p>
          <p>Tema: {order.tema || "—"}</p>
          <p style={{ marginTop: "24px" }}>Declaramos que recebemos de <strong>{order.nome}</strong> o valor total de <strong>{fmtBRL(total)}</strong>, referente {montagem ? "à decoração da festa com serviço de montagem" : "aos serviços e itens contratados"}, dando quitação integral do valor contratado.</p>
          <div style={{ margin: "24px 0", padding: "16px", border: "1px solid #651323", textAlign: "center" }}><strong>VALOR TOTAL: {fmtBRL(total)} — QUITADO</strong></div>
          <p>Emitido em {new Date().toLocaleDateString("pt-BR")}.</p>
          <footer style={{ marginTop: "40px", borderTop: "1px solid #777", paddingTop: "12px", textAlign: "center" }}>LHL Festas</footer>
        </article>
        <label className="flex items-start gap-3 text-sm"><Checkbox checked={confirmed} onCheckedChange={v => setConfirmed(v === true)} /><span>Confirmo que o valor total de {fmtBRL(total)} foi recebido e o contrato está quitado.</span></label>
        {!(total > 0) && <p className="text-sm text-destructive">Informe o valor total do contrato antes de gerar o recibo.</p>}
        <div className="flex flex-wrap gap-3"><Button type="button" disabled={!confirmed || !(total > 0) || busy} onClick={() => void exportar(true)}>Baixar PDF</Button><Button type="button" variant="outline" disabled={!confirmed || !(total > 0) || busy} onClick={() => void exportar(false)}>Imprimir</Button></div>
      </DialogContent>
    </Dialog>
  </>;
}
