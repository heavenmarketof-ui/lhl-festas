import { describe, expect, it } from "vitest";
import { getContractKitDefaults } from "@/lib/contract-kit-defaults";

describe("preenchimento automático do contrato por kit", () => {
  it("carrega checklist e caução do Peg & Monte Premium", () => {
    const result = getContractKitDefaults("Peg & Monte", "Premium");

    expect(result).toMatchObject({
      caucao: "100",
      servicoMontagem: "Não",
      kit: { arcoSuporte: 2, mesa: 1, cilindros: 3, tapete: 1 },
    });
  });

  it("não escolhe automaticamente entre cilindros e mesa no kit Completo", () => {
    const result = getContractKitDefaults("Peg & Monte", "Completo");

    expect(result?.kit.cilindros).toBe(0);
    expect(result?.kit.mesa).toBe(0);
    expect(result?.pendencias).toHaveLength(1);
  });

  it("zera a caução e ativa montagem na composição personalizada", () => {
    const result = getContractKitDefaults("Festa com Montagem", "Personalizada com Montagem");

    expect(result).toMatchObject({ caucao: "0", servicoMontagem: "Sim" });
    expect(result?.pendencias).toHaveLength(1);
  });
});
