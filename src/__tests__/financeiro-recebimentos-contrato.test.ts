import { describe, expect, it } from "vitest";
import { saldoCaixa } from "@/lib/financeiro-api";

describe("Fluxo de Caixa — integridade do saldo", () => {
  it("entrada soma e saída subtrai do saldo", () => {
    expect(saldoCaixa([
      { tipo: "Entrada", valor: 100 },
      { tipo: "Saída", valor: 30 },
    ] as any)).toBe(70);
  });

  it("não transforma valor positivo de entrada em débito", () => {
    expect(saldoCaixa([{ tipo: "Entrada", valor: "100,00" }] as any)).toBe(100);
  });

  it("normaliza o tipo antes de calcular o saldo", () => {
    expect(saldoCaixa([
      { tipo: "ENTRADA", valor: "150" },
      { tipo: "Saida", valor: "50" },
    ] as any)).toBe(100);
  });
});
