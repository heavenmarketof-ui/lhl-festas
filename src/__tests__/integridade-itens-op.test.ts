import { describe, expect, it } from "vitest";
import { mergeOrdens, type OrdemProducao, type ItemCompra } from "@/lib/producao-api";
import { mergePlanejamento } from "@/lib/planejamento-sync";

const item = (id: string, descricao: string): ItemCompra => ({
  id,
  descricao,
  quantidade: 1,
  unidade: "un",
  observacao: "",
  fornecedor: "",
  valorOrcado: 0,
  valorReal: 0,
  formaPagamento: "PIX",
  pago: false,
  comprado: false,
  tipo: "Consumo",
});

const op = (compras: ItemCompra[], extra: Partial<OrdemProducao> = {}): OrdemProducao => ({
  id: "op1",
  contratoId: "c1",
  numero: "OP-0001",
  criadoEm: "2026-08-01T00:00:00.000Z",
  atualizadoEm: "2026-08-01T00:00:00.000Z",
  status: "Compras",
  compras,
  producao: [],
  separacao: [],
  conferencia: {
    comprasOk: false, producaoOk: false, kitProntoOk: false,
    conferidoPor: "", data: "", observacoes: "",
  },
  historico: [],
  patrimoniosReservados: [],
  ...extra,
});

describe("integridade dos itens da OP", () => {
  it("tela desatualizada não apaga item cadastrado em outra tela", () => {
    const remota = op([item("a", "Balão preto"), item("b", "Bolo preto")]);
    const enviada = op([item("a", "Balão preto")]); // versão antiga da tela
    const fundida = mergeOrdens(remota, enviada);
    expect(fundida.compras.map((c) => c.id).sort()).toEqual(["a", "b"]);
  });

  it("exclusão explícita continua valendo", () => {
    const remota = op([item("a", "Balão preto"), item("b", "Bolo preto")]);
    const enviada = op([item("a", "Balão preto")], { itensExcluidos: ["b"] });
    expect(mergeOrdens(remota, enviada).compras.map((c) => c.id)).toEqual(["a"]);
  });

  it("planejamento do contrato preserva item novo e respeita exclusão", () => {
    const base = [{ id: "1" }, { id: "2" }];
    const local = [{ id: "1" }]; // usuário apagou o 2
    const remoto = [{ id: "1" }, { id: "2" }, { id: "3" }]; // 3 nasceu depois
    expect(mergePlanejamento(base, local, remoto).map((i) => i.id)).toEqual(["1", "3"]);
  });
});
