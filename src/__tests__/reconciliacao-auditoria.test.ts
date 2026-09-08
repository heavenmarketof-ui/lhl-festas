import { describe, it, expect } from "vitest";
import { getContractPaymentStatus } from "@/lib/pagamentos";
import { reconciliarItemComSolicitacao } from "@/lib/producao-api";
import type { ItemCompra } from "@/lib/producao-api";

describe("Integridade Financeira e Operacional", () => {
  it("TESTE A — Compra realizada na OP vence solicitação autorizada", () => {
    const item: ItemCompra = {
      id: "item1",
      descricao: "Item",
      statusCompra: "Compra realizada",
      comprado: true,
      pago: false,
      quantidade: 1,
      unidade: "un",
      valorOrcado: 100,
      valorReal: 100,
      fornecedor: "F",
      formaPagamento: "PIX",
      tipo: "Consumo",
      observacao: ""
    };

    const sol = { status: "autorizada", valor: 100 };
    const res = reconciliarItemComSolicitacao(item, sol);
    expect(res.statusCompra).toBe("Compra realizada"); // Não rebaixa
  });

  it("TESTE B — Solicitação Lançada (Paga) avança item da OP", () => {
    const item: ItemCompra = {
      id: "item2",
      descricao: "Item",
      statusCompra: "Compra autorizada",
      comprado: false,
      pago: false,
      quantidade: 1,
      unidade: "un",
      valorOrcado: 100,
      valorReal: 0,
      fornecedor: "F",
      formaPagamento: "PIX",
      tipo: "Consumo",
      observacao: ""
    };

    const sol = { status: "lancada", valor: 90 };
    const res = reconciliarItemComSolicitacao(item, sol);
    expect(res.statusCompra).toBe("Pago");
    expect(res.valorReal).toBe(90);
    expect(res.comprado).toBe(true);
  });

  it("TESTE J — Contrato 105/105 = Quitado", () => {
    const order = {
      id: "ord1",
      details: { valorTotal: "105", valorSinal: "50" }
    } as any;
    const lancamentos = {
      receitas: new Map([["ord1", 105]]),
      caucoes: new Map()
    };
    const status = getContractPaymentStatus(order, lancamentos);
    expect(status.saldoReceber).toBe(0);
    expect(status.status).toBe("Quitado");
  });

  it("TESTE L — Caução não quita contrato", () => {
    const order = {
      id: "ord2",
      details: { valorTotal: "150", valorSinal: "75" }
    } as any;
    const lancamentos = {
      receitas: new Map([["ord2", 105]]),
      caucoes: new Map([["ord2", 50]])
    };
    const status = getContractPaymentStatus(order, lancamentos);
    expect(status.totalRecebido).toBe(105);
    expect(status.saldoReceber).toBe(45);
    expect(status.status).toBe("Parcial");
  });
});
