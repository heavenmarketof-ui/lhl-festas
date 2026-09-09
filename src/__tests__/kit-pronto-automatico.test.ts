import { describe, expect, it } from "vitest";
import {
  aguardandoConfirmacaoKit,
  conferenciaCompleta,
  deriveStatus,
  determineNivelOperacional,
  type OrdemProducao,
} from "@/lib/producao-api";

function opBase(): OrdemProducao {
  return {
    id: "op-1",
    contratoId: "c-1",
    numero: "OP-0001",
    criadoEm: "2026-09-09T10:00:00.000Z",
    atualizadoEm: "2026-09-09T10:00:00.000Z",
    status: "Aguardando Início",
    compras: [],
    producao: [],
    separacao: [],
    conferencia: {
      comprasOk: false,
      producaoOk: false,
      kitProntoOk: false,
      conferidoPor: "",
      data: "",
      observacoes: "",
    },
    historico: [],
    patrimoniosReservados: [],
    ativo: "Sim",
  };
}

describe("Kit Pronto automático", () => {
  it("considera OP vazia como Kit Pronto sem confirmação humana", () => {
    const op = opBase();
    expect(aguardandoConfirmacaoKit(op)).toBe(false);
    expect(conferenciaCompleta(op)).toBe(true);
    expect(determineNivelOperacional(op)).toBe("kit-pronto");
    expect(deriveStatus(op)).toBe("Kit Pronto");
  });

  it("considera concluído quando todas as compras e produções terminaram", () => {
    const op = opBase();
    op.compras = [{
      id: "compra-1",
      descricao: "Material",
      quantidade: 1,
      unidade: "un",
      observacao: "",
      fornecedor: "",
      valorOrcado: 0,
      valorReal: 0,
      formaPagamento: "PIX",
      pago: false,
      comprado: true,
      tipo: "Consumo",
      statusCompra: "Compra realizada",
    }];
    op.producao = [{
      id: "prod-1",
      descricao: "Display",
      quantidade: 1,
      responsavel: "",
      prazo: "",
      observacao: "",
      anexos: [],
      status: "Concluído",
    }];

    expect(determineNivelOperacional(op)).toBe("kit-pronto");
    expect(deriveStatus(op)).toBe("Kit Pronto");
  });

  it("reabre operacionalmente quando surge nova pendência", () => {
    const op = opBase();
    op.status = "Kit Pronto";
    op.kitProntoConfirmadoEm = "2026-09-09T10:00:00.000Z";
    op.producao = [{
      id: "prod-2",
      descricao: "Novo item",
      quantidade: 1,
      responsavel: "",
      prazo: "",
      observacao: "",
      anexos: [],
      status: "Pendente",
    }];

    expect(conferenciaCompleta(op)).toBe(false);
    expect(determineNivelOperacional(op)).toBe("pendente");
    expect(deriveStatus(op)).not.toBe("Kit Pronto");
  });
});
