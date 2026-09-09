import { describe, expect, it } from "vitest";
import { getGestaoData } from "@/lib/gestao/aggregate";
import type { Snapshot } from "@/lib/gestao/aggregate";
import type { PeriodoCursor } from "@/lib/gestao/periodo";

const cursor: PeriodoCursor = {
  tipo: "mensal",
  ano: 2026,
  mes: 9,
  trimestre: 3,
  semestre: 2,
  inicio: "2026-09-01",
  fim: "2026-09-30",
};

function order(id: string, createdAt: string, dataEvento: string, valorTotal: string, telefone: string) {
  return {
    id,
    nome: `Cliente ${id}`,
    cpf: "",
    rg: "",
    telefone,
    email: "",
    endereco: "",
    cidadeUf: "",
    tema: "Tema",
    modalidade: "Festa com Montagem",
    plano: "Personalizado",
    status: "Pendente",
    createdAt,
    details: {
      dataEvento,
      valorTotal,
      valorSinal: "",
      valorRestante: "",
      valorCaucao: "0",
      devolucaoConfirmada: "Não",
      caucaoDevolvida: "Não",
      pagamentoFinalizado: "Não",
    },
  } as any;
}

function entrada(id: string, contratoId: string, data: string, valor: number, categoria = "Sinal") {
  return {
    id,
    data,
    tipo: "Entrada",
    categoria,
    descricao: "Recebimento do contrato",
    valor,
    conta: "PIX",
    contratoId,
    origem: categoria.toLowerCase(),
    createdAt: `${data}T12:00:00.000Z`,
    ativo: "Sim",
  } as any;
}

describe("Gestão — regras comerciais soberanas", () => {
  it("separa pedidos, vendas do mês, faturamento de festas entregues e caixa recebido", () => {
    const snap: Snapshot = {
      orders: [
        // Pedido sem sinal: conta em Pedidos, mas não é venda.
        order("pre", "2026-09-01T10:00:00.000Z", "2026-09-15", "600", "11911111111"),
        // Venda e festa já entregue no mês.
        order("sale1", "2026-09-01T11:00:00.000Z", "2026-09-05", "1000", "11922222222"),
        // Venda do mês cuja festa ainda não aconteceu.
        order("sale2", "2026-09-01T12:00:00.000Z", "2026-09-20", "800", "11933333333"),
        // Venda feita agora para festa no ano seguinte.
        order("sale3", "2026-09-04T12:00:00.000Z", "2027-01-16", "1200", "11944444444"),
      ],
      lancamentos: [
        entrada("l1", "sale1", "2026-09-02", 500),
        entrada("l2", "sale2", "2026-09-03", 400),
        entrada("l3", "sale3", "2026-09-04", 300),
      ],
      ops: [],
      geradoEm: "2026-09-09T12:00:00.000Z",
    };

    const d = getGestaoData(snap, cursor);
    const kpi = (label: string) => d.kpis.find((k) => k.label === label)?.valor;

    // 4 contratos/pré-contratos foram fechados entre 01/09 e 09/09.
    expect(kpi("Pedidos")).toBe(4);

    // 3 tiveram primeiro recebimento real e viraram venda. Venda soma o valor
    // integral negociado, mesmo quando a festa será realizada no futuro.
    expect(kpi("Vendas do mês")).toBe(3000);
    expect(kpi("Ticket médio")).toBe(1000);

    // Faturamento em 09/09 considera somente dinheiro efetivamente recebido
    // no mês de uma festa que já foi entregue no próprio mês. Portanto apenas
    // os R$ 500 de sale1, e não os R$ 1.000 totais do contrato.
    expect(kpi("Faturamento")).toBe(500);

    // Recebido é caixa puro: inclui os sinais das vendas futuras também.
    expect(kpi("Recebido")).toBe(1200);
  });

  it("caução não transforma pré-contrato em venda", () => {
    const snap: Snapshot = {
      orders: [order("pre", "2026-09-01T10:00:00.000Z", "2026-09-15", "600", "11911111111")],
      lancamentos: [{
        ...entrada("c1", "pre", "2026-09-02", 80, "Caução Recebida"),
        origem: "caucao",
      } as any],
      ops: [],
      geradoEm: "2026-09-09T12:00:00.000Z",
    };

    const d = getGestaoData(snap, cursor);
    expect(d.kpis.find((k) => k.label === "Vendas do mês")?.valor).toBe(0);
    expect(d.kpis.find((k) => k.label === "Pedidos")?.valor).toBe(1);
    expect(d.kpis.find((k) => k.label === "Faturamento")?.valor).toBe(0);
  });
});