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

function entrada(id: string, contratoId: string, data: string, valor: number) {
  return {
    id,
    data,
    tipo: "Entrada",
    categoria: "Sinal",
    descricao: "Sinal recebido",
    valor,
    conta: "PIX",
    contratoId,
    origem: "sinal",
    createdAt: `${data}T12:00:00.000Z`,
    ativo: "Sim",
  } as any;
}

describe("Gestão — regras comerciais soberanas", () => {
  it("separa pedidos, vendas, ticket, faturamento realizado e caixa recebido", () => {
    const snap: Snapshot = {
      orders: [
        order("pre", "2026-09-01T10:00:00.000Z", "2026-09-15", "600", "11911111111"),
        order("sale1", "2026-09-01T11:00:00.000Z", "2026-09-05", "1000", "11922222222"),
        order("sale2", "2026-09-01T12:00:00.000Z", "2026-09-20", "800", "11933333333"),
      ],
      lancamentos: [
        entrada("l1", "sale1", "2026-09-02", 500),
        entrada("l2", "sale2", "2026-09-03", 400),
      ],
      ops: [],
      geradoEm: "2026-09-09T12:00:00.000Z",
    };

    const d = getGestaoData(snap, cursor);
    const kpi = (label: string) => d.kpis.find((k) => k.label === label)?.valor;

    // 3 contratos foram criados no mês, mas somente 2 viraram venda.
    expect(kpi("Pedidos")).toBe(3);
    // Venda conta o valor integral negociado, não apenas o sinal recebido.
    expect(kpi("Vendas confirmadas")).toBe(1800);
    expect(kpi("Ticket médio")).toBe(900);
    // Em 09/09, somente a festa de 05/09 foi realizada.
    expect(kpi("Faturamento")).toBe(1000);
    // Caixa é somente o que entrou de fato.
    expect(kpi("Recebido")).toBe(900);
  });

  it("caução não transforma pré-contrato em venda", () => {
    const snap: Snapshot = {
      orders: [order("pre", "2026-09-01T10:00:00.000Z", "2026-09-15", "600", "11911111111")],
      lancamentos: [{
        ...entrada("c1", "pre", "2026-09-02", 80),
        categoria: "Caução Recebida",
        origem: "caucao",
      } as any],
      ops: [],
      geradoEm: "2026-09-09T12:00:00.000Z",
    };

    const d = getGestaoData(snap, cursor);
    expect(d.kpis.find((k) => k.label === "Vendas confirmadas")?.valor).toBe(0);
    expect(d.kpis.find((k) => k.label === "Pedidos")?.valor).toBe(1);
  });
});