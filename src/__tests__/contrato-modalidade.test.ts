import { describe, expect, it } from "vitest";
import { contratoTemMontagem } from "@/lib/orders-storage";

describe("modalidade aplicada ao contrato", () => {
  it("reconhece Festa com Montagem mesmo quando o campo auxiliar está vazio", () => {
    expect(contratoTemMontagem("Festa com Montagem", "")).toBe(true);
    expect(contratoTemMontagem("Festa com Montagem", "Não")).toBe(true);
  });

  it("mantém o aviso de retirada para Festa na Mesa e Peg & Monte", () => {
    expect(contratoTemMontagem("Festa na Mesa", "Não")).toBe(false);
    expect(contratoTemMontagem("Peg & Monte", "Não")).toBe(false);
  });

  it("preserva contratos antigos com serviço de montagem marcado", () => {
    expect(contratoTemMontagem("", "Sim")).toBe(true);
  });
});
