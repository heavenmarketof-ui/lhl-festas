import type { StoredOrder } from "./orders-storage";
import type { Lancamento } from "./financeiro-api";
import { getContractPaymentStatus } from "./pagamentos";
import { toDateISO } from "./date-utils";
import { extractLinkedLeadId } from "./journey-link";

export type LeadLike = {
  id?: string;
  whatsapp?: string;
  whatsappNormalizado?: string;
  dataFesta?: string;
};

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
 * Vínculo oficial lead → contrato:
 * 1) prioriza o ID explícito gravado no pré-contrato quando a jornada pública
 *    conseguiu comprovar telefone + data da festa no momento da reserva;
 * 2) para históricos antigos, mantém o fallback seguro por telefone exato e
 *    data da festa quando necessário para desambiguar.
 */
export function resolveLeadVenda(
  lead: LeadLike,
  orders: StoredOrder[],
  lancamentos: Lancamento[],
): LeadVenda {
  const ativos = (orders || []).filter((o) =>
    o && !["Cancelado", "Excluído"].includes(String(o.status)),
  );

  let escolhido: StoredOrder | undefined;
  const leadId = String(lead.id || "").trim();
  if (leadId) {
    const explicitos = ativos.filter((o) => extractLinkedLeadId(o.details?.observacoesInternas) === leadId);
    if (explicitos.length === 1) escolhido = explicitos[0];
    else if (explicitos.length > 1) return { confirmada: false, order: null, motivo: "vinculo-ambiguo" };
  }

  if (!escolhido) {
    const phone = digits(lead.whatsappNormalizado || lead.whatsapp);
    if (!phone) return { confirmada: false, order: null, motivo: "sem-vinculo" };

    const candidatos = ativos.filter((o) => digits(o.telefone) === phone);
    if (!candidatos.length) return { confirmada: false, order: null, motivo: "sem-vinculo" };

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
  }

  const pagamento = getContractPaymentStatus(escolhido, lancamentos || []);
  if (pagamento.vendaConfirmada) {
    return { confirmada: true, order: escolhido, motivo: "venda-confirmada" };
  }
  return { confirmada: false, order: escolhido, motivo: "pre-contrato" };
}
