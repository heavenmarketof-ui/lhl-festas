import { describe, expect, it } from "vitest";
import { itensAprovacaoSemSolicitacao } from "@/lib/solicitacoes-reconciliacao";
import type { StoredOrder } from "@/lib/orders-storage";
import type { OrdemProducao } from "@/lib/producao-api";

function orderComItem(destino: "aprovacao" | "orcamento" = "aprovacao"): StoredOrder {
  return {
    id: "contrato-11-out",
    createdAt: "2026-09-09T12:00:00.000Z",
    status: "Em Andamento",
    nome: "Cliente 11/10",
    tema: "Tema teste",
    modalidade: "Festa com Montagem",
    plano: "Personalizada com Montagem",
    details: {
      dataEvento: "2026-10-11",
      itensComprar: JSON.stringify([
        {
          id: "planejado-1",
          nome: "Painel",
          quantidade: 1,
          valorOrcado: 70,
          destino,
        },
      ]),
    },
  } as StoredOrder;
}

function opComItem(statusCompra: any, solicitacaoId?: string): OrdemProducao {
  return {
    id: "op-1",
    contratoId: "contrato-11-out",
    numero: "OP-1",
    criadoEm: "2026-09-09T12:00:00.000Z",
    atualizadoEm: "2026-09-09T12:00:00.000Z",
    status: "Compras",
    compras: [
      {
        id: "compra-1",
        descricao: "Painel",
        quantidade: 1,
        unidade: "un",
        observacao: "",
        fornecedor: "",
        valorOrcado: 70,
        valorReal: 0,
        formaPagamento: "PIX",
        pago: false,
        comprado: false,
        tipo: "Consumo",
        statusCompra,
        origemContratoItemId: "planejado-1",
        solicitacaoId,
      },
    ],
    producao: [],
    separacao: [],
    conferencia: {
      comprasOk: false,
      producaoOk: true,
      kitProntoOk: false,
      conferidoPor: "",
      data: "",
      observacoes: "",
    },
    historico: [],
  } as OrdemProducao;
}

describe("reconciliação de solicitações financeiras", () => {
  it("recupera item enviado para aprovação que ficou sem solicitação", () => {
    const faltantes = itensAprovacaoSemSolicitacao(
      orderComItem("aprovacao"),
      opComItem("Aguardando autorização"),
    );
    expect(faltantes.map((item) => item.id)).toEqual(["compra-1"]);
  });

  it("também recupera item ainda parado antes da autorização", () => {
    expect(itensAprovacaoSemSolicitacao(orderComItem(), opComItem("Aguardando orçamento"))).toHaveLength(1);
    expect(itensAprovacaoSemSolicitacao(orderComItem(), opComItem("Orçamento recebido"))).toHaveLength(1);
  });

  it("não duplica solicitação já vinculada", () => {
    expect(itensAprovacaoSemSolicitacao(orderComItem(), opComItem("Aguardando autorização", "sol-1"))).toHaveLength(0);
  });

  it("não envia item que o contrato deixou apenas para orçamento", () => {
    expect(itensAprovacaoSemSolicitacao(orderComItem("orcamento"), opComItem("Aguardando orçamento"))).toHaveLength(0);
  });
});
