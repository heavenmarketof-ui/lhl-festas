import { describe, expect, it } from "vitest";
import { orderCalendarLevel } from "@/components/admin-shell";

function order(dataEvento: string, dataRetirada: string) {
  return {
    id: "agenda-1",
    nome: "Cliente",
    cpf: "",
    rg: "",
    telefone: "",
    email: "",
    endereco: "",
    cidadeUf: "",
    tema: "Tema",
    modalidade: "Festa na Mesa",
    plano: "Essencial",
    status: "Pendente",
    createdAt: "2026-09-09T12:00:00.000Z",
    details: {
      dataEvento,
      dataRetirada,
      dataDevolucao: "",
      observacoesInternas: "",
      caucaoDevolvida: "Não",
      devolucaoConfirmada: "Não",
    },
  } as any;
}

describe("Agenda — data soberana da festa", () => {
  it("não trata retirada próxima como cliente da semana se a festa estiver fora da semana", () => {
    const o = order("2026-09-20", "2026-09-10");
    expect(orderCalendarLevel(o, "2026-09-09", "2026-09-16")).toBe("orange");
  });

  it("trata a festa próxima como cliente da semana mesmo que a retirada seja outra data", () => {
    const o = order("2026-09-12", "2026-09-01");
    expect(orderCalendarLevel(o, "2026-09-09", "2026-09-16")).toBe("red");
  });
});
