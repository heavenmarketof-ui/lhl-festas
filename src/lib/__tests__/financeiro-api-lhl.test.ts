import { describe, expect, it } from "vitest";
import { deduplicarLancamentos, origemContratoCanonica, saldoCaixa } from "../financeiro-api-lhl";
import type { Lancamento } from "../financeiro-api";

const base = (p: Partial<Lancamento>): Lancamento => ({
  id: crypto.randomUUID(),
  data: "2026-09-11",
  tipo: "Entrada",
  categoria: "Outros",
  descricao: "Teste",
  valor: 10,
  conta: "PIX",
  createdAt: "2026-09-11T20:00:00.000Z",
  ativo: "Sim",
  ...p,
});

describe("fluxo de caixa soberano LHL", () => {
  it("normaliza aliases antigos de recebimento", () => {
    expect(origemContratoCanonica("sinal")).toBe("sinalRecebido");
    expect(origemContratoCanonica("pagamento_final")).toBe("pagamentoFinal");
    expect(origemContratoCanonica("caucao recebida")).toBe("caucaoRecebida");
  });

  it("remove duplicata técnica pelo mesmo id", () => {
    const a = base({ id: "x", tipo: "Saída", valor: 34 });
    const b = base({ id: "x", tipo: "Saída", valor: 34 });
    expect(deduplicarLancamentos([a, b])).toHaveLength(1);
  });

  it("remove recebimento duplicado do mesmo contrato e origem", () => {
    const a = base({ id: "a", contratoId: "c1", origem: "pagamentoFinal", valor: 120 });
    const b = base({ id: "b", contratoId: "c1", origem: "pagamento_final", valor: 120 });
    expect(deduplicarLancamentos([a, b])).toHaveLength(1);
  });

  it("remove compra duplicada da mesma solicitação", () => {
    const a = base({ id: "a", tipo: "Saída", origem: "solicitacao-123", valor: 170 });
    const b = base({ id: "b", tipo: "Saída", origem: "solicitacao-123", valor: 170 });
    expect(deduplicarLancamentos([a, b])).toHaveLength(1);
  });

  it("não remove duas despesas manuais legítimas", () => {
    const a = base({ id: "a", tipo: "Saída", descricao: "Uber", valor: 20, origem: "manual" });
    const b = base({ id: "b", tipo: "Saída", descricao: "Uber", valor: 20, origem: "manual" });
    expect(deduplicarLancamentos([a, b])).toHaveLength(2);
  });

  it("sempre subtrai saída, inclusive variações sem acento", () => {
    expect(saldoCaixa([
      { tipo: "Entrada", valor: 200 },
      { tipo: "Saída", valor: 50 },
      { tipo: "Saida" as any, valor: 30 },
    ])).toBe(120);
  });
});
