import { describe, expect, it } from "vitest";
import { resolveLeadVenda } from "@/lib/lead-venda";
import type { StoredOrder } from "@/lib/orders-storage";
import type { Lancamento } from "@/lib/financeiro-api";

function order(id: string, telefone: string, dataEvento: string, leadId = ""): StoredOrder {
  return {
    id,
    nome: "Cliente",
    cpf: "",
    rg: "",
    telefone,
    email: "",
    endereco: "",
    cidadeUf: "",
    tema: "Tema",
    modalidade: "Festa com Montagem",
    plano: "",
    status: "Pendente",
    createdAt: "2026-09-01T10:00:00.000Z",
    details: {
      dataEvento,
      valorTotal: "1000",
      valorSinal: "500",
      valorRestante: "500",
      valorCaucao: "0",
      sinalRecebido: "Não",
      pagamentoFinalRecebido: "Não",
      pagamentoFinalizado: "Não",
      devolucaoConfirmada: "Não",
      caucaoDevolvida: "Não",
      observacoesInternas: leadId ? `Lead CRM vinculado: ${leadId}` : "",
    } as any,
  } as StoredOrder;
}

function entrada(contratoId: string, valor = 500): Lancamento {
  return {
    id: `l-${contratoId}`,
    data: "2026-09-05",
    tipo: "Entrada",
    categoria: "Sinal",
    descricao: "Sinal",
    valor,
    conta: "PIX",
    contratoId,
    origem: "sinal",
    createdAt: "2026-09-05T10:00:00.000Z",
    ativo: "Sim",
  };
}

const lead = (telefone = "(11) 99999-0000", dataFesta = "2026-10-10", id = "") => ({
  id,
  whatsapp: telefone,
  whatsappNormalizado: telefone.replace(/\D/g, ""),
  dataFesta,
});

describe("resolveLeadVenda", () => {
  it("não converte pré-contrato sem recebimento", () => {
    const r = resolveLeadVenda(lead(), [order("o1", "11999990000", "2026-10-10")], []);
    expect(r.confirmada).toBe(false);
    expect(r.motivo).toBe("pre-contrato");
  });

  it("converte quando existe recebimento real não-caução", () => {
    const r = resolveLeadVenda(lead(), [order("o1", "11999990000", "2026-10-10")], [entrada("o1")]);
    expect(r.confirmada).toBe(true);
    expect(r.order?.id).toBe("o1");
  });

  it("não vincula telefone diferente", () => {
    const r = resolveLeadVenda(lead(), [order("o1", "11988880000", "2026-10-10")], [entrada("o1")]);
    expect(r.confirmada).toBe(false);
    expect(r.motivo).toBe("sem-vinculo");
  });

  it("usa data da festa para desambiguar contratos do mesmo telefone", () => {
    const orders = [
      order("antigo", "11999990000", "2026-08-01"),
      order("atual", "11999990000", "2026-10-10"),
    ];
    const r = resolveLeadVenda(lead(), orders, [entrada("atual")]);
    expect(r.confirmada).toBe(true);
    expect(r.order?.id).toBe("atual");
  });

  it("prioriza o ID explícito do lead gravado no pré-contrato", () => {
    const orders = [
      order("outro", "11999990000", "2026-10-10", "LEAD-OUTRO"),
      order("correto", "11999990000", "2026-10-10", "LEAD-2026-0001"),
    ];
    const r = resolveLeadVenda(lead("11999990000", "2026-10-10", "LEAD-2026-0001"), orders, [entrada("correto")]);
    expect(r.confirmada).toBe(true);
    expect(r.order?.id).toBe("correto");
  });

  it("não presume vínculo quando há ambiguidade sem data útil", () => {
    const orders = [
      order("a", "11999990000", "2026-10-10"),
      order("b", "11999990000", "2026-11-10"),
    ];
    const r = resolveLeadVenda(lead("11999990000", ""), orders, [entrada("a")]);
    expect(r.confirmada).toBe(false);
    expect(r.motivo).toBe("vinculo-ambiguo");
  });
});
