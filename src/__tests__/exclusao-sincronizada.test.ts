import { describe, expect, it } from "vitest";
import {
  compraTemHistorico,
  producaoTemHistorico,
  type ItemCompra,
  type ItemProducao,
} from "@/lib/producao-api";

const compra = (patch: Partial<ItemCompra> = {}): ItemCompra =>
  ({
    id: "c1",
    descricao: 'Balão Verde 9"',
    quantidade: 1,
    unidade: "un",
    tipo: "Consumo",
    comprado: false,
    pago: false,
    ...patch,
  }) as ItemCompra;

const producao = (patch: Partial<ItemProducao> = {}): ItemProducao =>
  ({
    id: "p1",
    descricao: "Painel redondo",
    responsavel: "",
    prazo: "",
    observacao: "",
    anexos: [],
    status: "Pendente",
    ...patch,
  }) as ItemProducao;

describe("exclusão sincronizada Contrato ↔ OP", () => {
  it("permite excluir compra apenas em Aguardando orçamento sem vínculos", () => {
    expect(compraTemHistorico(compra())).toBe(false);
    expect(compraTemHistorico(compra({ valorOrcado: 25 }))).toBe(true);
    expect(compraTemHistorico(compra({ solicitacaoId: "s1" }))).toBe(true);
    expect(compraTemHistorico(compra({ fornecedor: "Loja X" }))).toBe(true);
    expect(compraTemHistorico(compra({ comprado: true }))).toBe(true);
    expect(compraTemHistorico(compra({ cancelado: true }))).toBe(true);
  });

  it("permite excluir produção apenas em Produção pendente sem anexos", () => {
    expect(producaoTemHistorico(producao())).toBe(false);
    expect(producaoTemHistorico(producao({ status: "Em Produção" }))).toBe(true);
    expect(producaoTemHistorico(producao({ status: "Cancelado" }))).toBe(true);
    expect(
      producaoTemHistorico(
        producao({ anexos: [{ id: "a", nome: "foto.jpg", url: "u", tipo: "image/jpeg" }] as never }),
      ),
    ).toBe(true);
  });
});
