import { describe, expect, it } from "vitest";
import { filtrarSolicitacoesOperacionais } from "@/lib/solicitacoes-api";
import type { Solicitacao } from "@/lib/solicitacoes-types";
import type { StoredOrder } from "@/lib/orders-storage";

function solicitacao(id: string, pedidoId: string): Solicitacao {
  return {
    id,
    tipo: "compra_materiais",
    origem: pedidoId ? "ordem_producao" : "compra_manual",
    status: "pendente",
    pedidoId,
    pedidoCliente: "Cliente",
    ordemProducao: pedidoId ? "OP-1" : "",
    origemItemId: id,
    itens: [{ descricao: "Item", quantidade: 1, unidade: "un", valor: 10 }],
    fornecedor: "",
    categoria: "Fornecedor",
    conta: "Caixa",
    formaPagamento: "PIX",
    valor: 10,
    descricao: "Item",
    observacoes: "",
    dataPrevista: "",
    criadoPorEmail: "Sistema",
    editadoPorEmail: "",
    editadoEm: "",
    autorizadoPorEmail: "",
    autorizadoEm: "",
    recusadoPorEmail: "",
    recusadoEm: "",
    recusaMotivo: "",
    canceladoPorEmail: "",
    canceladoEm: "",
    lancamentoId: "",
    lancadoEm: "",
    createdAt: "2026-09-09T12:00:00.000Z",
    updatedAt: "2026-09-09T12:00:00.000Z",
  };
}

function order(id: string, dataEvento: string, status = "Pendente"): StoredOrder {
  return {
    id,
    createdAt: "2026-09-01T12:00:00.000Z",
    status,
    nome: "Cliente",
    tema: "Tema",
    modalidade: "Festa com Montagem",
    plano: "Personalizada com Montagem",
    details: { dataEvento },
  } as StoredOrder;
}

describe("fila operacional da Central de Solicitações", () => {
  it("mantém apenas contratos operacionais atuais/futuros e solicitações manuais", () => {
    const list = [
      solicitacao("futura", "c-futuro"),
      solicitacao("passada", "c-passado"),
      solicitacao("finalizada", "c-finalizado"),
      solicitacao("manual", ""),
      solicitacao("orfa", "c-inexistente"),
    ];
    const orders = [
      order("c-futuro", "2026-10-11"),
      order("c-passado", "2026-08-22"),
      order("c-finalizado", "2026-10-20", "Finalizado"),
    ];

    expect(filtrarSolicitacoesOperacionais(list, orders, "2026-09-09").map((s) => s.id))
      .toEqual(["futura", "manual"]);
  });

  it("mantém festa do próprio dia ativa", () => {
    expect(filtrarSolicitacoesOperacionais(
      [solicitacao("hoje", "c-hoje")],
      [order("c-hoje", "2026-09-09")],
      "2026-09-09",
    )).toHaveLength(1);
  });
});
