import type { LeadRecord } from "./leads-api";
import type { StoredOrder } from "./orders-storage";
import type { Lancamento } from "./financeiro-api";
import { getContractPaymentStatus } from "./pagamentos";
import { toDateISO } from "./date-utils";

function digits(v: unknown) {
  let d = String(v ?? "").replace(/\D/g, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  return d;
}

export type LeadVenda = {
  confirmada: boolean;
  order: StoredOrder | null;
  motivo: "venda-confirmada" | "pre-contrato" | "sem-vinculo" | "vinculo-ambiguo";
};

/**
 * Vincula lead e contrato apenas com evidência suficientemente segura:
 * telefone exato normalizado e, quando houver mais de um contrato para o mesmo
 * telefone, a data da festa precisa desambiguar.
 */
export function resolveLeadVenda(
  lead: LeadRecord,
  orders: StoredOrder[],
  lancamentos: Lancamento[],
): LeadVenda {
  const phone = digits(lead.whatsappNormalizado || lead.whatsapp);
  if (!phone) return { confirmada: false, order: null, motivo: "sem-vinculo" };

  const candidatos = (orders || []).filter((o) => {
    if (!o || ["Cancelado", "Excluído"].includes(String(o.status))) return false;
    return digits(o.telefone) === phone;
  });

  if (!candidatos.length) return { confirmada: false, order: null, motivo: "sem-vinculo" };

  let escolhido: StoredOrder | undefined;
  const dataLead = toDateISO(lead.dataFesta);
  if (dataLead) {
    const porData = candidatos.filter((o) => toDateISO(o.details?.dataEvento) === dataLead);
    if (porData.length === 1) escolhido = porData[0];
    else if (porData.length > 1) return { confirmada: false, order: null, motivo: "vinculo-ambiguo" };
  }

  if (!escolhido) {
    if (candidatos.length !== 1) return { confirmada: false, order: null, motivo: "vinculo-ambiguo" };
    escolhido = candidatos[0];
  }

  const pagamento = getContractPaymentStatus(escolhido, lancamentos || []);
  if (pagamento.vendaConfirmada) {
    return { confirmada: true, order: escolhido, motivo: "venda-confirmada" };
  }
  return { confirmada: false, order: escolhido, motivo: "pre-contrato" };
}
