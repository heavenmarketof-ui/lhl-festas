import { describe, expect, it } from "vitest";
import { contratoEncerradoOperacionalmente, contratoOperacionalmenteAtivo, idsContratosOperacionaisAtivos } from "@/lib/contrato-operacional";
import type { StoredOrder } from "@/lib/orders-storage";

function order(id: string, status = "Pendente", details: Record<string, unknown> = {}) {
  return {
    id,
    nome: "Cliente",
    status,
    details: {
      dataEvento: "2026-09-20",
      ...details,
    },
  } as unknown as StoredOrder;
}

describe("contrato operacional", () => {
  it("mantém festa futura ativa", () => {
    const o = order("1");
    expect(contratoOperacionalmenteAtivo(o, "2026-09-09")).toBe(true);
  });

  it("remove festa passada das filas ativas", () => {
    const o = order("2", "Pendente", { dataEvento: "2026-09-08" });
    expect(contratoEncerradoOperacionalmente(o, "2026-09-09")).toBe(true);
  });

  it("mantém festa de hoje ativa", () => {
    const o = order("3", "Pendente", { dataEvento: "2026-09-09" });
    expect(contratoOperacionalmenteAtivo(o, "2026-09-09")).toBe(true);
  });

  it("encerra por finalização, devolução ou caução devolvida", () => {
    expect(contratoEncerradoOperacionalmente(order("4", "Finalizado"), "2026-09-09")).toBe(true);
    expect(contratoEncerradoOperacionalmente(order("5", "Pendente", { devolucaoConfirmada: "Sim" }), "2026-09-09")).toBe(true);
    expect(contratoEncerradoOperacionalmente(order("6", "Pendente", { caucaoDevolvida: "Sim" }), "2026-09-09")).toBe(true);
  });

  it("exclui cancelados e excluídos do conjunto operacional", () => {
    const ids = idsContratosOperacionaisAtivos([
      order("ativo"),
      order("cancelado", "Cancelado"),
      order("excluido", "Excluído"),
      order("passado", "Pendente", { dataEvento: "2026-09-01" }),
    ], "2026-09-09");
    expect([...ids]).toEqual(["ativo"]);
  });
});
