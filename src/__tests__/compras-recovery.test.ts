import { describe, expect, it } from "vitest";
import { localizarComprasSemLancamento } from "@/lib/compras-recovery";

const item = (overrides = {}) => ({
  id: "item-1", solicitacaoId: "sol-1", descricao: "Conchas", quantidade: 2,
  valorReal: 25, dataCompra: "2026-09-21", statusCompra: "Pago", ...overrides,
});
const op = (compra = item()) => ({ id: "op-1", numero: "OP-1", contratoId: "c-1", compras: [compra] });
const order = { id: "c-1", nome: "Cliente", dataEvento: "2026-10-10" };

describe("recuperação das compras ausentes do fluxo", () => {
  it("localiza compra recente já paga e calcula o total", () => {
    const rows = localizarComprasSemLancamento([op()] as any, [], [order] as any, "2026-09-22");
    expect(rows).toHaveLength(1);
    expect(rows[0].valor).toBe(50);
  });

  it("não recupera quando a origem financeira já existe", () => {
    const fluxo = [{ id: "x", origem: "solicitacao-sol-1", ativo: "Sim" }];
    expect(localizarComprasSemLancamento([op()] as any, fluxo as any, [order] as any, "2026-09-22")).toHaveLength(0);
  });

  it("ignora compra antiga, cancelada ou de festa passada", () => {
    expect(localizarComprasSemLancamento([op(item({ dataCompra: "2026-08-01" }))] as any, [], [order] as any, "2026-09-22")).toHaveLength(0);
    expect(localizarComprasSemLancamento([op(item({ cancelado: true }))] as any, [], [order] as any, "2026-09-22")).toHaveLength(0);
    expect(localizarComprasSemLancamento([op()] as any, [], [{ ...order, dataEvento: "2026-09-01" }] as any, "2026-09-22")).toHaveLength(0);
  });
});
