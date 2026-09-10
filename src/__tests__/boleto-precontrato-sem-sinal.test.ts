import { describe, expect, it } from "vitest";
import { gerarPlanoParcelas } from "@/lib/parcelas-api";
import { getContractPaymentStatus } from "@/lib/pagamentos";

describe("Boleto em pré-contrato sem sinal", () => {
  it("permite parcelar os R$ 1.100 integrais em 5x de R$ 220 sem confirmar venda", () => {
    const order = {
      id: "contrato-boleto-1100",
      nome: "Cliente",
      status: "Pendente",
      createdAt: "2026-09-09T12:00:00.000Z",
      details: {
        valorTotal: "1100",
        valorSinal: "0",
        valorRestante: "1100",
        sinalRecebido: "Não",
        pagamentoFinalRecebido: "Não",
        pagamentoFinalizado: "Não",
        devolucaoConfirmada: "Não",
        caucaoDevolvida: "Não",
      },
    } as any;

    const pagamento = getContractPaymentStatus(order, []);
    expect(pagamento.totalRecebido).toBe(0);
    expect(pagamento.vendaConfirmada).toBe(false);
    expect(pagamento.saldoReceber).toBe(0);
    expect(pagamento.saldoNegociado).toBe(1100);

    const plano = gerarPlanoParcelas({
      quantidade: 5,
      valorTotal: pagamento.saldoNegociado,
      primeiroVencimento: "2026-09-20",
    });

    expect(plano).toHaveLength(5);
    expect(plano.map((p) => p.valor)).toEqual([220, 220, 220, 220, 220]);
    expect(plano[0].vencimento).toBe("2026-09-20");
    expect(plano[1].vencimento).toBe("2026-10-20");
    expect(plano.reduce((s, p) => s + p.valor, 0)).toBe(1100);
  });
});
