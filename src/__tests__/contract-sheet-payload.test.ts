import { describe, expect, it } from "vitest";
import { buildContractSheetPayload } from "@/lib/contract-sheet-payload";
import { emptyKit, type ContractDetails, type StoredOrder } from "@/lib/orders-storage";

describe("payload de salvamento do contrato", () => {
  it("preserva dados do pré-contrato e controles administrativos", () => {
    const order = {
      id: "contrato-1",
      createdAt: "2026-09-17T10:00:00.000Z",
      status: "Em andamento",
      rg: "12.345.678-9",
    } as StoredOrder;
    const details = {
      kit: { ...emptyKit, mesa: 1 },
      dataEvento: "2026-09-20",
      horaInicioFesta: "18:00",
      horaTerminoFesta: "23:00",
      horaMontagem: "14:00",
      dataRetirada: "2026-09-19",
      horaRetirada: "10:30",
      dataDevolucao: "2026-09-21",
      horaDevolucao: "17:00",
      devolucaoConfirmada: "Sim",
      pagamentoFinalizado: "Sim",
      origemCliente: "Instagram",
      ativo: "Sim",
      clienteRecorrente: "Sim",
      valorTotal: "750",
      valorSinal: "375",
      valorRestante: "375",
      valorCaucao: "100",
      cidade: "Mauá",
    } as ContractDetails;

    const payload = buildContractSheetPayload({
      order,
      client: {
        nome: "Cliente Teste",
        cpf: "000.000.000-00",
        telefone: "11999999999",
        email: "cliente@teste.com",
        tema: "Princesas",
        modalidade: "Peg & Monte",
        plano: "Premium",
      },
      details,
      enderecoCompleto: "Rua Teste, 1 — Mauá",
      itensComprar: "[]",
      itensProduzir: "[]",
    });

    expect(payload).toMatchObject({
      rg: "12.345.678-9",
      horaRetirada: "10:30",
      horaDevolucao: "17:00",
      horaInicioFesta: "18:00",
      horaTerminoFesta: "23:00",
      horaMontagem: "14:00",
      devolucaoConfirmada: "Sim",
      pagamentoFinalizado: "Sim",
      origemCliente: "Instagram",
      ativo: "Sim",
      clienteRecorrente: "Sim",
    });
    expect(JSON.parse(String(payload.kitJson))).toMatchObject({ mesa: 1 });
  });
});
