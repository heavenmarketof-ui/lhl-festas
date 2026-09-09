import { describe, it, expect } from "vitest";
import { getContractPaymentStatus } from "@/lib/pagamentos";
import type { Lancamento } from "@/lib/financeiro-api";
import type { StoredOrder } from "@/lib/orders-storage";

const order = (id: string, valorTotal: string, extra: Record<string, unknown> = {}, status = "Pendente") =>
  ({
    id,
    nome: "Cliente",
    cpf: "",
    telefone: "",
    email: "",
    endereco: "",
    cidadeUf: "",
    tema: "",
    modalidade: "",
    plano: "",
    status,
    createdAt: new Date().toISOString(),
    details: { valorTotal, valorSinal: "100", ...extra },
  }) as unknown as StoredOrder;

const lanc = (
  contratoId: string,
  valor: number,
  categoria = "Sinal",
  tipo: "Entrada" | "Saída" = "Entrada",
): Lancamento =>
  ({
    id: crypto.randomUUID(),
    data: "2026-08-01",
    tipo,
    categoria,
    descricao: "",
    valor,
    conta: "PIX",
    contratoId,
    createdAt: new Date().toISOString(),
    ativo: "Sim",
  }) as Lancamento;

describe("getContractPaymentStatus", () => {
  it("Cenário A — quitado (200 de 200)", () => {
    const r = getContractPaymentStatus(order("a", "200"), [lanc("a", 200)]);
    expect(r.totalRecebido).toBe(200);
    expect(r.saldoReceber).toBe(0);
    expect(r.vendaConfirmada).toBe(true);
    expect(r.isPago).toBe(true);
    expect(r.status).toBe("Quitado");
  });

  it("Cenário B — parcial (100 de 200)", () => {
    const r = getContractPaymentStatus(order("b", "200"), [lanc("b", 100)]);
    expect(r.saldoReceber).toBe(100);
    expect(r.saldoNegociado).toBe(100);
    expect(r.vendaConfirmada).toBe(true);
    expect(r.isPago).toBe(false);
  });

  it("Cenário C — completar pagamento zera o saldo", () => {
    const r = getContractPaymentStatus(order("c", "200"), [lanc("c", 100), lanc("c", 100, "Pagamento Final")]);
    expect(r.saldoReceber).toBe(0);
    expect(r.isPago).toBe(true);
  });

  it("Cenário D — caução não quita nem confirma venda", () => {
    const r = getContractPaymentStatus(order("d", "200"), [lanc("d", 100, "Caução Recebida")]);
    expect(r.totalRecebido).toBe(0);
    expect(r.caucaoRecebida).toBe(100);
    expect(r.saldoReceber).toBe(0);
    expect(r.saldoNegociado).toBe(200);
    expect(r.vendaConfirmada).toBe(false);
    expect(r.isPago).toBe(false);
  });

  it("tolerância monetária — centavos não geram alerta", () => {
    const r = getContractPaymentStatus(order("e", "200"), [lanc("e", 66.66), lanc("e", 66.67), lanc("e", 66.67)]);
    expect(r.saldoReceber).toBe(0);
    expect(r.isPago).toBe(true);
  });

  it("legado — sem lançamentos usa sinal/pagamento final quando não há contradição", () => {
    const parcial = getContractPaymentStatus(order("f", "200", { sinalRecebido: "Sim" }), []);
    expect(parcial.totalRecebido).toBe(100);
    expect(parcial.saldoReceber).toBe(100);
    expect(parcial.vendaConfirmada).toBe(true);

    const quitado = getContractPaymentStatus(order("g", "200", { pagamentoFinalRecebido: "Sim", valorRestante: "0" }), []);
    expect(quitado.saldoReceber).toBe(0);
    expect(quitado.isPago).toBe(true);
  });

  it("não aceita quitação legada quando o contrato ainda declara saldo restante", () => {
    const r = getContractPaymentStatus(
      order("boleto-print", "1100", {
        valorSinal: "220",
        valorRestante: "880",
        pagamentoFinalRecebido: "Sim",
        pagamentoFinalizado: "Sim",
      }),
      [],
    );
    expect(r.totalRecebido).toBe(0);
    expect(r.saldoNegociado).toBe(1100);
    expect(r.saldoReceber).toBe(0);
    expect(r.vendaConfirmada).toBe(false);
    expect(r.isPago).toBe(false);
    expect(r.status).toBe("Pendente");
  });

  it("pré-contrato sem sinal não vira conta a receber", () => {
    const r = getContractPaymentStatus(order("h", "200"), [lanc("h", 200, "Sinal", "Saída"), lanc("outro", 200)]);
    expect(r.totalRecebido).toBe(0);
    expect(r.vendaConfirmada).toBe(false);
    expect(r.saldoNegociado).toBe(200);
    expect(r.saldoReceber).toBe(0);
    expect(r.status).toBe("Pendente");
  });

  it("contrato encerrado sai das pendências sem apagar o recebido", () => {
    const r = getContractPaymentStatus(order("i", "200", { devolucaoConfirmada: "Sim" }), [lanc("i", 100)]);
    expect(r.totalRecebido).toBe(100);
    expect(r.saldoNegociado).toBe(100);
    expect(r.saldoReceber).toBe(0);
    expect(r.encerrado).toBe(true);
    expect(r.isPago).toBe(true);
  });

  it("status Finalizado também encerra a pendência ativa", () => {
    const r = getContractPaymentStatus(order("j", "200", {}, "Finalizado"), [lanc("j", 100)]);
    expect(r.saldoReceber).toBe(0);
    expect(r.encerrado).toBe(true);
  });
});
