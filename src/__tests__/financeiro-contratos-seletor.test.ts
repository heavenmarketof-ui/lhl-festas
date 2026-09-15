import { describe, expect, it } from "vitest";
import { contratosDisponiveisNoFluxo } from "@/lib/financeiro-contract-options";
import type { StoredOrder } from "@/lib/orders-storage";

function contrato(id: string, dataEvento: string, status: string = "Em andamento"): StoredOrder {
  return {
    id,
    nome: `Cliente ${id}`,
    cpf: "",
    rg: "",
    telefone: "",
    email: "",
    endereco: "",
    cidadeUf: "",
    tema: "Tema",
    modalidade: "Peg & Monte",
    plano: "Essencial",
    status: status as StoredOrder["status"],
    createdAt: "2026-01-01T00:00:00.000Z",
    details: { dataEvento } as StoredOrder["details"],
  };
}

describe("seletor de contratos do Fluxo de Caixa", () => {
  const hoje = new Date(2026, 8, 15);

  it("mostra somente contratos do mês atual em diante", () => {
    const result = contratosDisponiveisNoFluxo(
      [
        contrato("passado", "2026-08-31"),
        contrato("mes-atual", "2026-09-01"),
        contrato("futuro", "2027-01-10"),
        contrato("sem-data", ""),
      ],
      "",
      hoje,
    );

    expect(result.map((order) => order.id)).toEqual(["mes-atual", "futuro"]);
  });

  it("exclui contratos cancelados e excluídos", () => {
    const result = contratosDisponiveisNoFluxo(
      [
        contrato("ativo", "2026-10-01"),
        contrato("cancelado", "2026-10-02", "Cancelado"),
        contrato("excluido", "2026-10-03", "Excluído"),
      ],
      "",
      hoje,
    );

    expect(result.map((order) => order.id)).toEqual(["ativo"]);
  });

  it("preserva o contrato antigo já vinculado durante a edição", () => {
    const result = contratosDisponiveisNoFluxo(
      [contrato("historico", "2025-04-20", "Finalizado"), contrato("atual", "2026-09-20")],
      "historico",
      hoje,
    );

    expect(result.map((order) => order.id)).toEqual(["historico", "atual"]);
  });
});
