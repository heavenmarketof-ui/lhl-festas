import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ registrar: vi.fn(), fetch: vi.fn(), criar: vi.fn() }));
vi.mock("@/lib/parcelas.functions", () => ({ registrarPagamentoParcelaFn: mocks.registrar, listarParcelasFn: vi.fn(), salvarParcelasFn: vi.fn(), atualizarStatusParcelaFn: vi.fn() }));
vi.mock("@/lib/admin-action-auth", () => ({ withAdminAccessToken: vi.fn(async x => x) }));
vi.mock("../lib/financeiro-api", () => ({ fetchLancamentos: mocks.fetch, createLancamento: mocks.criar }));
import { registrarPagamentoParcela } from "@/lib/parcelas-api";
const parcela = { id: "p1", contratoId: "c1", numero: 1, total: 3, valor: 187.5, vencimento: "2026-10-30", status: "enviado" } as any;
describe("Confirmação de parcelas e fluxo de caixa", () => {
 beforeEach(() => { vi.clearAllMocks(); mocks.fetch.mockResolvedValue([]); mocks.criar.mockResolvedValue({}); mocks.registrar.mockResolvedValue({ parcela: { ...parcela, status: "pago" } }); });
 it("confirma sem ler nem criar lançamento quando o caixa já foi lançado manualmente", async () => {
  const result = await registrarPagamentoParcela({ parcela, contratoCliente: "Cliente", valorPago: 187.5, lancarNoFluxo: false });
  expect(result.status).toBe("pago"); expect(mocks.registrar).toHaveBeenCalledOnce(); expect(mocks.fetch).not.toHaveBeenCalled(); expect(mocks.criar).not.toHaveBeenCalled();
 });
 it("reutiliza lançamento existente sem duplicar a entrada", async () => {
  mocks.fetch.mockResolvedValue([{ id: "boleto-parcela-p1" }]);
  await registrarPagamentoParcela({ parcela, contratoCliente: "Cliente", valorPago: 187.5 });
  expect(mocks.criar).not.toHaveBeenCalled(); expect(mocks.registrar).toHaveBeenCalledOnce();
 });
 it("interrompe se não puder conferir o caixa", async () => {
  mocks.fetch.mockRejectedValue(new Error("offline"));
  await expect(registrarPagamentoParcela({ parcela, contratoCliente: "Cliente", valorPago: 187.5 })).rejects.toThrow("offline");
  expect(mocks.criar).not.toHaveBeenCalled(); expect(mocks.registrar).not.toHaveBeenCalled();
 });
 it("não marca como pago quando a criação no caixa falha", async () => {
  mocks.criar.mockRejectedValue(new Error("falhou"));
  await expect(registrarPagamentoParcela({ parcela, contratoCliente: "Cliente", valorPago: 187.5 })).rejects.toThrow("falhou");
  expect(mocks.registrar).not.toHaveBeenCalled();
 });
 it("não recria entradas de uma parcela já paga", async () => {
  await registrarPagamentoParcela({ parcela: {...parcela,status:"pago"}, contratoCliente: "Cliente", valorPago:187.5 });
  expect(mocks.fetch).not.toHaveBeenCalled(); expect(mocks.criar).not.toHaveBeenCalled();
 });
});
