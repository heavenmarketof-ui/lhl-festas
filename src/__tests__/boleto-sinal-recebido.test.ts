import { describe, expect, it } from "vitest";
import { calcularSaldoParcelavel } from "@/components/boleto-parcelas";
import { getContractPaymentStatus } from "@/lib/pagamentos";
import type { StoredOrder } from "@/lib/orders-storage";

describe("Boleto após sinal recebido", () => {
  it("mostra o sinal recebido e parcela somente o saldo restante", () => {
    const order = {
      id: "contrato-sinal-220",
      status: "Em andamento",
      details: {
        valorTotal: "1100",
        valorSinal: "220",
        valorRestante: "880",
        sinalRecebido: "Sim",
      },
    } as StoredOrder;

    const pagamento = getContractPaymentStatus(order, []);

    expect(pagamento.totalRecebido).toBe(220);
    expect(pagamento.vendaConfirmada).toBe(true);
    expect(calcularSaldoParcelavel(pagamento, order.details?.valorRestante)).toBe(880);
  });
});
